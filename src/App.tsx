import React, { useState, useEffect, useRef } from 'react';
import {
  UserProfile,
  Conversation,
  Message,
  ActiveCall,
  CallSignal,
  ScheduleEvent,
  MessagePriority,
  MessageType,
  DayScheduleStatus,
  UserAccount,
  ContactRequest,
  RelationshipType
} from './types';
import {
  CURRENT_USER,
  INITIAL_CONTACTS,
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES,
  INITIAL_SCHEDULES,
  loadStoredData,
  saveStoredData,
  STORAGE_KEYS,
  purgeOldMessages,
  AUTO_PURGE_DAYS,
  getActiveAccountId,
  setActiveAccountId,
  getStoredAccounts,
  getUserContacts,
  saveUserContacts,
  getUserConversations,
  saveUserConversations,
  getUserMessages,
  saveUserMessages
} from './lib/storage';
import {
  testConnection,
  ensureFirebaseAuth,
  syncUserToFirestore,
  syncMessageToFirestore,
  purgeMessageMediaFromFirestore,
  syncConversationToFirestore,
  subscribeToConversationMessages,
  purgeExpiredOnlineMessagesFromFirestore,
  subscribeToContactRequests,
  updateContactRequestStatusInFirestore,
  initiateCallInFirestore,
  subscribeToIncomingCalls,
  answerCallInFirestore,
  endCallInFirestore,
  declineCallInFirestore,
  subscribeToCallStatus,
  getDirectConversationId,
  subscribeToUserConversations
} from './lib/firebase';
import { saveMediaToDeviceVault } from './lib/deviceMediaStorage';
import { encryptMessage } from './lib/encryption';
import { playSentSound, playReceivedSound, playUrgentSound, playConnectSound, playEndCallSound } from './lib/audio';

import { AuthScreen } from './components/auth/AuthScreen';
import { Sidebar } from './components/layout/Sidebar';
import { ChatWindow } from './components/chat/ChatWindow';
import { CallModal } from './components/calls/CallModal';
import { FloatingCallBar } from './components/calls/FloatingCallBar';
import { IncomingCallDialog } from './components/calls/IncomingCallDialog';
import { PartnerModal } from './components/partners/PartnerModal';
import { FriendsModal } from './components/friends/FriendsModal';
import { SchedulePanel } from './components/schedule/SchedulePanel';
import { ProfileModal } from './components/profile/ProfileModal';
import { AddContactModal } from './components/contacts/AddContactModal';
import { RequestsModal } from './components/contacts/RequestsModal';
import { PWAInstallBanner } from './components/pwa/PWAInstallBanner';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';

export default function App() {
  // Active Account State (for user creation & account sign-in)
  const [activeAccount, setActiveAccount] = useState<UserAccount | null>(() => {
    const id = getActiveAccountId();
    if (!id) return null;
    const accounts = getStoredAccounts();
    return accounts.find((a) => a.id === id) || null;
  });

  // Current user profile state
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const id = getActiveAccountId();
    if (id) {
      const accounts = getStoredAccounts();
      const matched = accounts.find((a) => a.id === id);
      if (matched) {
        return {
          id: matched.id,
          username: matched.username,
          name: matched.name,
          email: matched.email,
          avatar: matched.avatar,
          status: matched.status || 'Ready for cuddles & chats ✨',
          moodEmoji: matched.moodEmoji || '💖',
          online: true,
          relationshipType: 'partner',
          safetyFingerprint: matched.safetyFingerprint || '9B2E74FA',
          verifiedKey: true,
          bio: matched.bio || 'In a private sanctuary with my favorite people.',
          partnerNickname: matched.partnerNickname,
          partnerAnniversary: matched.partnerAnniversary,
          currentSchedule: matched.currentSchedule || {
            isBusy: false,
            activityTitle: 'Open & Available',
            untilTime: '8:00 PM',
            category: 'available'
          }
        };
      }
    }
    return loadStoredData(STORAGE_KEYS.USER, CURRENT_USER);
  });

  // Contacts state - isolated strictly per account!
  const [contacts, setContacts] = useState<UserProfile[]>(() => {
    const id = getActiveAccountId();
    if (id) {
      return getUserContacts(id);
    }
    return [];
  });

  // Conversations state - isolated strictly per account!
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const id = getActiveAccountId();
    if (id) {
      return getUserConversations(id);
    }
    return [];
  });

  const [activeConversationId, setActiveConversationId] = useState<string>(() => {
    const id = getActiveAccountId();
    if (id) {
      const userConvs = getUserConversations(id);
      return userConvs[0]?.id || '';
    }
    return '';
  });

  // Messages state - isolated strictly per account!
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(() => {
    const id = getActiveAccountId();
    if (id) {
      return getUserMessages(id);
    }
    return {};
  });

  // Contact requests & Modals state
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [addContactType, setAddContactType] = useState<RelationshipType>('friend');
  const [showRequestsModal, setShowRequestsModal] = useState(false);

  // Schedules state
  const [schedules, setSchedules] = useState<ScheduleEvent[]>(() =>
    loadStoredData(STORAGE_KEYS.SCHEDULES, INITIAL_SCHEDULES)
  );

  // Group Call states
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{
    callId: string;
    caller: UserProfile;
    conversation: Conversation;
    type: 'audio' | 'video';
  } | null>(null);
  const callStatusUnsubscribeRef = useRef<(() => void) | null>(null);

  // Instant notification toast banner
  const [notificationToast, setNotificationToast] = useState<{
    id: string;
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  // Modals state
  const [showPartnersModal, setShowPartnersModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<{
    user: UserProfile;
    isOwn: boolean;
  } | null>(null);

  // Mobile sidebar drawer
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});

  // Account switching / login sync
  useEffect(() => {
    if (activeAccount) {
      setCurrentUser({
        id: activeAccount.id,
        username: activeAccount.username,
        name: activeAccount.name,
        email: activeAccount.email,
        avatar: activeAccount.avatar,
        status: activeAccount.status || 'Ready for cuddles & chats ✨',
        moodEmoji: activeAccount.moodEmoji || '💖',
        online: true,
        relationshipType: 'partner',
        safetyFingerprint: activeAccount.safetyFingerprint || '9B2E74FA',
        verifiedKey: true,
        bio: activeAccount.bio || 'In a private sanctuary with my favorite people.',
        partnerNickname: activeAccount.partnerNickname,
        partnerAnniversary: activeAccount.partnerAnniversary,
        currentSchedule: activeAccount.currentSchedule || {
          isBusy: false,
          activityTitle: 'Open & Available',
          untilTime: '8:00 PM',
          category: 'available'
        }
      });
      const userContacts = getUserContacts(activeAccount.id);
      const userConvs = getUserConversations(activeAccount.id);
      const userMsgs = getUserMessages(activeAccount.id);

      setContacts(userContacts);
      setConversations(userConvs);
      setMessagesMap(userMsgs);
      setActiveConversationId(userConvs[0]?.id || '');
    }
  }, [activeAccount?.id]);

  // Synchronize state with User-Scoped LocalStorage
  useEffect(() => {
    saveStoredData(STORAGE_KEYS.USER, currentUser);
  }, [currentUser]);

  useEffect(() => {
    if (activeAccount) {
      saveUserContacts(activeAccount.id, contacts);
    }
  }, [contacts, activeAccount?.id]);

  useEffect(() => {
    if (activeAccount) {
      saveUserConversations(activeAccount.id, conversations);
    }
  }, [conversations, activeAccount?.id]);

  useEffect(() => {
    if (activeAccount) {
      saveUserMessages(activeAccount.id, messagesMap);
    }
  }, [messagesMap, activeAccount?.id]);

  useEffect(() => {
    saveStoredData(STORAGE_KEYS.SCHEDULES, schedules);
  }, [schedules]);

  // Real-time listener for contact requests in Firestore
  useEffect(() => {
    if (!activeAccount) return;

    const unsubscribe = subscribeToContactRequests(
      activeAccount.id,
      activeAccount.username,
      (reqs) => {
        setContactRequests(reqs);

        // When any request is accepted (outgoing accepted by recipient or incoming accepted),
        // add to contacts and create conversation
        reqs.forEach((req) => {
          if (req.status === 'accepted') {
            const isSender = req.senderId === activeAccount.id;
            const otherId = isSender ? req.receiverId : req.senderId;
            const otherUsername = isSender ? req.receiverUsername : req.senderUsername;
            const otherName = isSender ? req.receiverUsername : req.senderName;
            const otherAvatar = isSender
              ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(req.receiverUsername)}`
              : req.senderAvatar;

            setContacts((prevContacts) => {
              if (
                prevContacts.some(
                  (c) =>
                    c.id === otherId ||
                    (c.username && c.username.toLowerCase() === otherUsername.toLowerCase())
                )
              ) {
                return prevContacts;
              }

              const newContact: UserProfile = {
                id: otherId,
                username: otherUsername,
                name: otherName,
                avatar: otherAvatar,
                status:
                  req.relationshipType === 'partner'
                    ? 'Connected in Sanctuary 💕'
                    : 'Connected as friends ✨',
                moodEmoji: req.relationshipType === 'partner' ? '💖' : '✨',
                online: true,
                relationshipType: req.relationshipType,
                partnerNickname: req.relationshipType === 'partner' ? req.partnerNickname : undefined,
                partnerAnniversary: req.relationshipType === 'partner' ? req.partnerAnniversary : undefined,
                safetyFingerprint: Math.random().toString(16).substring(2, 10).toUpperCase(),
                verifiedKey: true
              };
              return [...prevContacts, newContact];
            });

            setConversations((prevConvs) => {
              const existingConv = prevConvs.find(
                (c) => !c.isGroup && c.participantIds.includes(otherId)
              );
              if (existingConv) return prevConvs;

              const newConvId = getDirectConversationId(activeAccount.id, otherId);
              const newConv: Conversation = {
                id: newConvId,
                title: otherName,
                avatar: otherAvatar,
                isGroup: false,
                participantIds: [activeAccount.id, otherId],
                partnerIds: req.relationshipType === 'partner' ? [otherId] : [],
                createdAt: new Date().toISOString(),
                isE2EESecure: true,
                sharedKeyFingerprint: Math.random().toString(16).substring(2, 10).toUpperCase(),
                lastMessage: {
                  text: 'Connection accepted! Start chatting securely.',
                  timestamp: 'Just now',
                  senderName: 'Cuddles',
                  unreadCount: 0
                }
              };
              syncConversationToFirestore(newConv);
              return [newConv, ...prevConvs];
            });
          }
        });
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [activeAccount?.id, activeAccount?.username]);

  // Real-time listener for incoming call signals directed to active user
  useEffect(() => {
    if (!activeAccount) return;

    const unsubscribe = subscribeToIncomingCalls(activeAccount.id, (callSignal) => {
      // Ignore if user is already participating in this exact call
      if (activeCall && activeCall.id === callSignal.id) return;

      const callerContact = contacts.find((c) => c.id === callSignal.callerId) || {
        id: callSignal.callerId,
        username: callSignal.callerName.toLowerCase().replace(/\s+/g, ''),
        name: callSignal.callerName,
        avatar: callSignal.callerAvatar,
        relationshipType: 'friend' as RelationshipType,
        status: 'Calling you on Cuddles...',
        moodEmoji: '📞',
        online: true,
        safetyFingerprint: 'CALL'
      };

      const matchedConv = conversations.find((c) => c.id === callSignal.conversationId) || {
        id: callSignal.conversationId,
        title: callSignal.callerName,
        avatar: callSignal.callerAvatar,
        isGroup: false,
        participantIds: [activeAccount.id, callSignal.callerId],
        partnerIds: [],
        createdAt: new Date().toISOString(),
        isE2EESecure: true,
        sharedKeyFingerprint: 'CALL'
      };

      setIncomingCall({
        callId: callSignal.id,
        caller: callerContact,
        conversation: matchedConv,
        type: callSignal.callType
      });
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [activeAccount?.id, contacts, conversations, activeCall]);

  // Real-time listener for conversation updates
  useEffect(() => {
    if (!activeAccount) return;
    const unsubscribe = subscribeToUserConversations(activeAccount.id, (cloudConvs) => {
      if (cloudConvs && cloudConvs.length > 0) {
        setConversations((prev) => {
          const map = new Map<string, Conversation>();
          prev.forEach((c) => map.set(c.id, c));
          cloudConvs.forEach((c) => {
            const existing = map.get(c.id);
            if (existing) {
              map.set(c.id, { ...existing, ...c });
            } else {
              map.set(c.id, c);
            }
          });
          return Array.from(map.values());
        });
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [activeAccount?.id]);

  // 14-Day Auto-Purge of Ephemeral Online Text Messages on Startup
  useEffect(() => {
    // Validate connection to Firestore on boot (as required by Firebase skill)
    testConnection();
    ensureFirebaseAuth();

    try {
      const { cleanedCount, updatedMap } = purgeOldMessages(messagesMap, AUTO_PURGE_DAYS);
      if (cleanedCount > 0) {
        console.log(`[Cuddles Auto-Purge] Cleared ${cleanedCount} text messages older than ${AUTO_PURGE_DAYS} days.`);
        setMessagesMap(updatedMap);
      }
    } catch (e) {
      console.error('Error running auto-purge', e);
    }
  }, []);

  // Real-time listener for active conversation messages via Firebase Firestore
  useEffect(() => {
    if (!activeConversationId) return;

    // Purge messages older than 15 days from the online cloud database
    purgeExpiredOnlineMessagesFromFirestore(activeConversationId, 15);

    const unsubscribe = subscribeToConversationMessages(activeConversationId, (cloudMsgs) => {
      if (cloudMsgs) {
        setMessagesMap((prev) => {
          const currentList = prev[activeConversationId] || [];
          const map = new Map<string, Message>();
          currentList.forEach((m) => map.set(m.id, m));
          let hasNewIncoming = false;
          cloudMsgs.forEach((m) => {
            const existed = map.has(m.id);
            if (!existed && m.senderId !== activeAccount?.id) {
              hasNewIncoming = true;
            }
            map.set(m.id, m);
          });
          if (hasNewIncoming) {
            playReceivedSound();
          }
          const merged = Array.from(map.values());
          merged.sort((a, b) => (a.createdAtISO || a.timestamp).localeCompare(b.createdAtISO || b.timestamp));
          return {
            ...prev,
            [activeConversationId]: merged
          };
        });
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [activeConversationId, activeAccount?.id]);

  // Derived Partners & Friends lists
  const partners = contacts.filter((c) => c.relationshipType === 'partner');
  const friends = contacts.filter((c) => c.relationshipType === 'friend');

  // Active conversation object
  const activeConversation = conversations.find((c) => c.id === activeConversationId) || conversations[0];
  const activeMessages = messagesMap[activeConversationId] || [];

  // Recipient for 1-on-1 chats (for checking schedule and focus status)
  const activeRecipientId = activeConversation?.participantIds?.find((id) => id !== currentUser.id);
  const activeRecipient = contacts.find((c) => c.id === activeRecipientId);

  // Send Text Message with Schedule & Urgent Gating Logic
  const handleSendMessage = async (text: string, priority: MessagePriority = 'normal') => {
    if (!text.trim() || !activeConversation) return;

    // Check if recipient is busy according to their day schedule
    const recipientIsBusy = activeRecipient?.currentSchedule?.isBusy ?? false;
    let deliveredSilently = false;

    if (recipientIsBusy) {
      if (priority === 'urgent' || priority === 'emergency') {
        // Urgent alert pierces focus mode!
        playUrgentSound();
        deliveredSilently = false;
      } else {
        // Recipient is busy, text is delivered quietly
        playSentSound();
        deliveredSilently = true;
      }
    } else {
      // Recipient is available
      if (priority === 'urgent') {
        playUrgentSound();
      } else {
        playSentSound();
      }
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const encrypted = await encryptMessage(text, activeConversation.sharedKeyFingerprint);

    const newMessage: Message = {
      id: 'msg_' + Date.now(),
      conversationId: activeConversation.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      timestamp,
      type: 'text',
      text,
      encryptedPayload: encrypted,
      status: 'sent',
      priority,
      deliveredSilently
    };

    // Append to messages list
    setMessagesMap((prev) => ({
      ...prev,
      [activeConversation.id]: [...(prev[activeConversation.id] || []), newMessage]
    }));

    // Sync message to Firebase Firestore
    syncMessageToFirestore(newMessage);

    // Update conversation last message preview
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              lastMessage: {
                text: priority === 'urgent' ? `⚡ [Urgent] ${text}` : text,
                timestamp: 'Just now',
                senderName: 'You',
                unreadCount: 0
              }
            }
          : c
      )
    );

    // Update status to delivered then read
    setTimeout(() => {
      setMessagesMap((prev) => ({
        ...prev,
        [activeConversation.id]: (prev[activeConversation.id] || []).map((m) =>
          m.id === newMessage.id ? { ...m, status: 'delivered' } : m
        )
      }));
    }, 1000);

    setTimeout(() => {
      setMessagesMap((prev) => ({
        ...prev,
        [activeConversation.id]: (prev[activeConversation.id] || []).map((m) =>
          m.id === newMessage.id ? { ...m, status: 'read' } : m
        )
      }));
    }, 2200);

    // Realistic automated partner/friend response simulation
    simulatePartnerReply(activeConversation, text, priority, recipientIsBusy);
  };

  // Download Attachment Handler (Auto-Purge from online database upon download to device)
  const handleDownloadAttachment = (messageId: string) => {
    if (!activeConversation) return;

    // Purge media payload from cloud Firestore so nothing lingers on the server
    purgeMessageMediaFromFirestore(activeConversation.id, messageId);

    setMessagesMap((prev) => {
      const list = prev[activeConversation.id] || [];
      const updated = list.map((m) => {
        if (m.id === messageId && m.attachment) {
          return {
            ...m,
            attachment: {
              ...m.attachment,
              isDownloadedToDevice: true,
              isPurgedFromOnlineDatabase: true,
              downloadedAt: new Date().toISOString()
            }
          };
        }
        return m;
      });
      const newMap = { ...prev, [activeConversation.id]: updated };
      saveStoredData(STORAGE_KEYS.MESSAGES, newMap);
      return newMap;
    });
  };

  // Send Media Message (Image, Voice, Video Note, GIF, Document, Video)
  const handleSendMedia = (
    type: MessageType,
    url: string,
    durationSeconds?: number,
    attachmentMeta?: {
      fileName?: string;
      fileSizeBytes?: number;
      fileSize?: string;
      mimeType?: string;
    }
  ) => {
    if (!activeConversation) return;

    playSentSound();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let previewText = 'Sent a photo 📷';
    if (type === 'voice') previewText = `Voice message (0:${(durationSeconds || 10).toString().padStart(2, '0')}) 🎙️`;
    if (type === 'video_note') previewText = `Video note (0:${(durationSeconds || 8).toString().padStart(2, '0')}) 🎥`;
    if (type === 'video') previewText = `Video: ${attachmentMeta?.fileName || 'Attached video'} 🎬`;
    if (type === 'document') previewText = `Document: ${attachmentMeta?.fileName || 'File'} 📄 (${attachmentMeta?.fileSize || '50MB max'})`;
    if (type === 'gif') previewText = 'Sent a GIF ✨';

    const newMessage: Message = {
      id: 'msg_media_' + Date.now(),
      conversationId: activeConversation.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      timestamp,
      createdAtISO: new Date().toISOString(),
      type,
      text: type === 'image' || type === 'video_note' ? undefined : previewText,
      attachment: {
        type: type === 'document' || type === 'video' ? type : (type as any),
        url,
        durationSeconds,
        fileName: attachmentMeta?.fileName,
        fileSizeBytes: attachmentMeta?.fileSizeBytes,
        fileSize: attachmentMeta?.fileSize,
        mimeType: attachmentMeta?.mimeType,
        isStoredLocally: true,
        isDownloadedToDevice: true,
        isPurgedFromOnlineDatabase: false
      },
      status: 'sent'
    };

    // Save media to device IndexedDB vault for permanent offline availability
    saveMediaToDeviceVault(
      newMessage.id,
      url,
      type,
      attachmentMeta?.fileName || `cuddles_${type}_${Date.now()}`
    );

    setMessagesMap((prev) => {
      const nextMap = {
        ...prev,
        [activeConversation.id]: [...(prev[activeConversation.id] || []), newMessage]
      };
      saveStoredData(STORAGE_KEYS.MESSAGES, nextMap);
      return nextMap;
    });

    // Sync media message to Firestore (keeping payload lightweight for free tier Spark)
    syncMessageToFirestore({
      ...newMessage,
      attachment: newMessage.attachment
        ? {
            ...newMessage.attachment,
            url: (url && url.length < 50000) ? url : ''
          }
        : undefined
    });

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              lastMessage: {
                text: previewText,
                timestamp: 'Just now',
                senderName: 'You',
                unreadCount: 0
              }
            }
          : c
      )
    );

    // Simulate partner reaction or reply acknowledging document download & purge
    setTimeout(() => {
      handleReaction(newMessage.id, type === 'video_note' ? '🥰' : type === 'document' ? '👍' : '❤️');
    }, 2500);

    if (type === 'document' || type === 'video') {
      setTimeout(() => {
        playReceivedSound();
        const replyingParticipantId = activeConversation.participantIds.find((id) => id !== currentUser.id);
        const replyingContact = contacts.find((c) => c.id === replyingParticipantId);
        if (!replyingContact) return;

        const docAckMsg: Message = {
          id: 'msg_doc_ack_' + Date.now(),
          conversationId: activeConversation.id,
          senderId: replyingContact.id,
          senderName: replyingContact.name,
          senderAvatar: replyingContact.avatar,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAtISO: new Date().toISOString(),
          type: 'text',
          text: `Got your document (${attachmentMeta?.fileName || 'file'})! It is saved to my device, and automatically purged from the online database 🔐✨`,
          status: 'delivered'
        };

        setMessagesMap((prev) => {
          const nextMap = {
            ...prev,
            [activeConversation.id]: [...(prev[activeConversation.id] || []), docAckMsg]
          };
          saveStoredData(STORAGE_KEYS.MESSAGES, nextMap);
          return nextMap;
        });
      }, 4000);
    }
  };

  // Reaction handler
  const handleReaction = (messageId: string, emoji: string) => {
    setMessagesMap((prev) => {
      const convMsgs = prev[activeConversationId] || [];
      const updated = convMsgs.map((m) => {
        if (m.id !== messageId) return m;
        const currentReactions = m.reactions || [];
        const existing = currentReactions.find((r) => r.emoji === emoji);
        if (existing) {
          return {
            ...m,
            reactions: currentReactions.map((r) =>
              r.emoji === emoji ? { ...r, count: r.count + 1 } : r
            )
          };
        } else {
          return {
            ...m,
            reactions: [...currentReactions, { emoji, count: 1, userIds: [currentUser.id] }]
          };
        }
      });
      return { ...prev, [activeConversationId]: updated };
    });
  };

  // Simulate Partner Reply
  const simulatePartnerReply = (
    conv: Conversation,
    userText: string,
    priority: MessagePriority = 'normal',
    recipientIsBusy: boolean = false
  ) => {
    const isPartnerChat = conv.partnerIds && conv.partnerIds.length > 0;
    const replyingParticipantId = conv.participantIds.find((id) => id !== currentUser.id);
    const replyingContact = contacts.find((c) => c.id === replyingParticipantId);

    if (!replyingContact) return;

    // If recipient is busy and message was normal, reply is delayed or acknowledges focus mode
    const replyDelay = recipientIsBusy && priority === 'normal' ? 6000 : 2500;

    setTimeout(() => {
      setTypingUsers((prev) => ({
        ...prev,
        [conv.id]: [replyingContact.name]
      }));
    }, Math.max(1000, replyDelay - 1500));

    setTimeout(() => {
      setTypingUsers((prev) => ({
        ...prev,
        [conv.id]: []
      }));

      if (priority === 'urgent') {
        playUrgentSound();
      } else {
        playReceivedSound();
      }

      let replyText = 'Got your message! Let’s talk more soon.';
      if (priority === 'urgent') {
        replyText = isPartnerChat
          ? 'I saw the urgent alert! I dropped what I was doing, is everything okay sweetheart? 🚨❤️'
          : 'Saw the urgent flag! What’s going on?';
      } else if (recipientIsBusy) {
        replyText = `Just wrapping up ${replyingContact.currentSchedule?.activityTitle || 'my focus block'}. Saw your message quietly, love you! 💕`;
      } else if (isPartnerChat) {
        const partnerReplies = [
          'I love hearing from you ❤️ Always brightens my day.',
          'Counting down until our date night! Check the schedule calendar 🌹',
          'Sending you the biggest hug right now 💕',
          'Everything is better when we are connected in Cuddles.',
          'Love you so much! Can we jump on a video call later?'
        ];
        replyText = partnerReplies[Math.floor(Math.random() * partnerReplies.length)];
      }

      const replyMsg: Message = {
        id: 'reply_' + Date.now(),
        conversationId: conv.id,
        senderId: replyingContact.id,
        senderName: replyingContact.name,
        senderAvatar: replyingContact.avatar,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'text',
        text: replyText,
        status: 'read'
      };

      setMessagesMap((prev) => ({
        ...prev,
        [conv.id]: [...(prev[conv.id] || []), replyMsg]
      }));

      setConversations((prev) =>
        prev.map((c) =>
          c.id === conv.id
            ? {
                ...c,
                lastMessage: {
                  text: replyText,
                  timestamp: 'Just now',
                  senderName: replyingContact.name.split(' ')[0],
                  unreadCount: 0
                }
              }
            : c
        )
      );
    }, replyDelay);
  };

  // Start Group or 1-on-1 Call with synchronized real-time Firestore signaling
  const handleStartCall = async (type: 'audio' | 'video') => {
    if (!activeConversation || !activeAccount) return;

    const targetParticipantIds = activeConversation.participantIds.filter((id) => id !== activeAccount.id);

    const callParticipants = activeConversation.participantIds.map((id) => {
      if (id === currentUser.id) {
        return {
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          isMuted: false,
          isVideoOff: type === 'audio',
          isSpeaking: false,
          isLocal: true,
          relationshipType: currentUser.relationshipType
        };
      }
      const contact = contacts.find((c) => c.id === id);
      return {
        id: id,
        name: contact?.name || 'Contact',
        avatar: contact?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + id,
        isMuted: false,
        isVideoOff: type === 'audio',
        isSpeaking: false,
        isLocal: false,
        relationshipType: contact?.relationshipType
      };
    });

    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newCall: ActiveCall = {
      id: callId,
      conversationId: activeConversation.id,
      conversationTitle: activeConversation.title,
      isGroup: activeConversation.isGroup,
      callType: type,
      status: 'connected',
      startedAt: new Date().toISOString(),
      participants: callParticipants
    };

    setActiveCall(newCall);
    setIsCallMinimized(false);

    // Write call signal to Firestore so recipients' devices ring immediately
    const signal: CallSignal = {
      id: callId,
      conversationId: activeConversation.id,
      conversationTitle: activeConversation.title,
      callerId: activeAccount.id,
      callerName: activeAccount.name,
      callerAvatar: activeAccount.avatar,
      callType: type,
      targetParticipantIds,
      status: 'ringing',
      createdAt: new Date().toISOString()
    };
    await initiateCallInFirestore(signal);

    // Listen for call events (e.g. participant ends or declines)
    if (callStatusUnsubscribeRef.current) {
      callStatusUnsubscribeRef.current();
    }
    callStatusUnsubscribeRef.current = subscribeToCallStatus(callId, (updatedCall) => {
      if (updatedCall.status === 'ended' || updatedCall.status === 'declined') {
        setActiveCall(null);
        setIsCallMinimized(false);
        playEndCallSound();
      }
    });
  };

  // Add Participant to Active Call (Expands single call to group call!)
  const handleAddParticipantToCall = (contact: UserProfile) => {
    if (!activeCall) return;
    if (activeCall.participants.some((p) => p.id === contact.id)) return;

    setActiveCall((prev) => {
      if (!prev) return null;
      const updatedParticipants = [
        ...prev.participants,
        {
          id: contact.id,
          name: contact.name,
          avatar: contact.avatar,
          isMuted: false,
          isVideoOff: prev.callType === 'audio',
          isSpeaking: false,
          isLocal: false,
          relationshipType: contact.relationshipType
        }
      ];

      return {
        ...prev,
        isGroup: true,
        conversationTitle: `${prev.conversationTitle} + ${contact.name}`,
        participants: updatedParticipants
      };
    });
  };

  // Toggle Mute in active call
  const handleToggleMute = () => {
    if (!activeCall) return;
    setActiveCall((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        participants: prev.participants.map((p) =>
          p.isLocal ? { ...p, isMuted: !p.isMuted } : p
        )
      };
    });
  };

  // Toggle Video in active call
  const handleToggleVideo = () => {
    if (!activeCall) return;
    setActiveCall((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        participants: prev.participants.map((p) =>
          p.isLocal ? { ...p, isVideoOff: !p.isVideoOff } : p
        )
      };
    });
  };

  // End active call and signal across Firestore
  const handleEndCall = () => {
    if (activeCall) {
      endCallInFirestore(activeCall.id);
    }
    if (callStatusUnsubscribeRef.current) {
      callStatusUnsubscribeRef.current();
      callStatusUnsubscribeRef.current = null;
    }
    setActiveCall(null);
    setIsCallMinimized(false);
    playEndCallSound();
  };

  // Partner Management: Add (Strict Max 2 enforcement)
  const handleAddPartner = (newPartnerData: Omit<UserProfile, 'id' | 'safetyFingerprint'>) => {
    if (partners.length >= 2) {
      alert('Maximum 2 partners limit reached in Cuddles.');
      return;
    }

    const newPartner: UserProfile = {
      ...newPartnerData,
      id: 'partner_' + Date.now(),
      safetyFingerprint: Math.random().toString(16).slice(2, 10).toUpperCase()
    };

    setContacts((prev) => [...prev, newPartner]);

    // Create 1-on-1 encrypted conversation for this new partner
    const newConv: Conversation = {
      id: 'conv_' + newPartner.id,
      title: newPartner.name,
      avatar: newPartner.avatar,
      isGroup: false,
      participantIds: [currentUser.id, newPartner.id],
      partnerIds: [newPartner.id],
      createdAt: new Date().toISOString(),
      isE2EESecure: true,
      sharedKeyFingerprint: Math.random().toString(16).slice(2, 10).toUpperCase(),
      pinned: true,
      lastMessage: {
        text: 'Partner connection established with end-to-end encryption ❤️',
        timestamp: 'Just now',
        senderName: 'Cuddles',
        unreadCount: 0
      }
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
  };

  // Update existing partner
  const handleUpdatePartner = (id: string, updates: Partial<UserProfile>) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  // Remove partner
  const handleRemovePartner = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setConversations((prev) =>
      prev.filter((c) => !c.partnerIds?.includes(id) || c.isGroup)
    );
  };

  // Add Friend
  const handleAddFriend = (newFriendData: Omit<UserProfile, 'id' | 'safetyFingerprint'>) => {
    const newFriend: UserProfile = {
      ...newFriendData,
      id: 'friend_' + Date.now(),
      safetyFingerprint: Math.random().toString(16).slice(2, 10).toUpperCase()
    };

    setContacts((prev) => [...prev, newFriend]);

    const newConv: Conversation = {
      id: 'conv_' + newFriend.id,
      title: newFriend.name,
      avatar: newFriend.avatar,
      isGroup: false,
      participantIds: [currentUser.id, newFriend.id],
      partnerIds: [],
      createdAt: new Date().toISOString(),
      isE2EESecure: true,
      sharedKeyFingerprint: Math.random().toString(16).slice(2, 10).toUpperCase(),
      pinned: false,
      lastMessage: {
        text: 'Encrypted chat opened ✨',
        timestamp: 'Just now',
        senderName: 'Cuddles',
        unreadCount: 0
      }
    };

    setConversations((prev) => [...prev, newConv]);
    setActiveConversationId(newConv.id);
  };

  // Remove Friend
  const handleRemoveFriend = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  // Start Chat with contact from modal
  const handleStartChatWithContact = (contactId: string) => {
    let conv = conversations.find(
      (c) => !c.isGroup && c.participantIds.includes(contactId)
    );
    if (conv) {
      setActiveConversationId(conv.id);
    }
  };

  // Available contacts that can be invited to an ongoing call
  const contactsAvailableForCall = contacts.filter(
    (c) => !activeCall?.participants.some((p) => p.id === c.id)
  );

  // Sign out
  const handleSignOut = () => {
    setActiveAccount(null);
    setActiveAccountId(null);
    setViewingProfile(null);
    setContacts([]);
    setConversations([]);
    setMessagesMap({});
    setActiveConversationId('');
  };

  // Accept Contact Request
  const handleAcceptContactRequest = async (req: ContactRequest) => {
    if (!activeAccount) return;

    await updateContactRequestStatusInFirestore(req.id, 'accepted');

    const otherId = req.senderId;
    const otherUsername = req.senderUsername;
    const otherName = req.senderName;
    const otherAvatar = req.senderAvatar;

    setContacts((prevContacts) => {
      if (
        prevContacts.some(
          (c) =>
            c.id === otherId ||
            (c.username && c.username.toLowerCase() === otherUsername.toLowerCase())
        )
      ) {
        return prevContacts;
      }

      const newContact: UserProfile = {
        id: otherId,
        username: otherUsername,
        name: otherName,
        avatar: otherAvatar,
        status:
          req.relationshipType === 'partner'
            ? 'Connected in Sanctuary 💕'
            : 'Connected as friends ✨',
        moodEmoji: req.relationshipType === 'partner' ? '💖' : '✨',
        online: true,
        relationshipType: req.relationshipType,
        partnerNickname: req.relationshipType === 'partner' ? req.partnerNickname : undefined,
        partnerAnniversary: req.relationshipType === 'partner' ? req.partnerAnniversary : undefined,
        safetyFingerprint: Math.random().toString(16).substring(2, 10).toUpperCase(),
        verifiedKey: true
      };
      return [...prevContacts, newContact];
    });

    const newConvId = getDirectConversationId(activeAccount.id, otherId);
    const newConv: Conversation = {
      id: newConvId,
      title: otherName,
      avatar: otherAvatar,
      isGroup: false,
      participantIds: [activeAccount.id, otherId],
      partnerIds: req.relationshipType === 'partner' ? [otherId] : [],
      createdAt: new Date().toISOString(),
      isE2EESecure: true,
      sharedKeyFingerprint: Math.random().toString(16).substring(2, 10).toUpperCase(),
      lastMessage: {
        text: 'Request accepted! You are now connected.',
        timestamp: 'Just now',
        senderName: 'Cuddles',
        unreadCount: 0
      }
    };
    syncConversationToFirestore(newConv);

    setConversations((prevConvs) => {
      const exists = prevConvs.find((c) => !c.isGroup && c.participantIds.includes(otherId));
      if (exists) return prevConvs;
      return [newConv, ...prevConvs];
    });

    setActiveConversationId(newConvId);
  };

  // Pending count for the active user
  const cleanActiveUser = (activeAccount?.username || '').toLowerCase().trim().replace(/^@/, '');
  const pendingRequestsCount = contactRequests.filter((r) => {
    if (r.status !== 'pending') return false;
    const cleanReceiver = (r.receiverUsername || '').toLowerCase().trim().replace(/^@/, '');
    return r.receiverId === activeAccount?.id || (cleanReceiver && cleanReceiver === cleanActiveUser);
  }).length;

  // If no account is logged in, show the clean Cuddles Authentication screen
  if (!activeAccount) {
    return (
      <AuthScreen
        onAuthenticated={(account) => {
          setActiveAccount(account);
          setActiveAccountId(account.id);
          const userProfile: UserProfile = {
            id: account.id,
            username: account.username,
            name: account.name,
            email: account.email,
            avatar: account.avatar,
            status: account.status || 'Ready for cuddles & chats ✨',
            moodEmoji: account.moodEmoji || '💖',
            online: true,
            relationshipType: 'partner',
            safetyFingerprint: account.safetyFingerprint || '9B2E74FA',
            verifiedKey: true,
            bio: account.bio || 'In an intimate sanctuary with my favorite people.',
            partnerNickname: account.partnerNickname,
            partnerAnniversary: account.partnerAnniversary,
            currentSchedule: account.currentSchedule || {
              isBusy: false,
              activityTitle: 'Open & Available',
              untilTime: '8:00 PM',
              category: 'available'
            }
          };
          setCurrentUser(userProfile);
          saveStoredData(STORAGE_KEYS.USER, userProfile);
          syncUserToFirestore(userProfile);

          // Load user-scoped isolated data
          const userContacts = getUserContacts(account.id);
          const userConvs = getUserConversations(account.id);
          const userMsgs = getUserMessages(account.id);
          setContacts(userContacts);
          setConversations(userConvs);
          setMessagesMap(userMsgs);
          setActiveConversationId(userConvs[0]?.id || '');
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none font-sans antialiased">
      {/* PWA In-App Install Banner & Offline Notice */}
      <PWAInstallBanner />
      <OfflineIndicator />

      {/* Main Container */}
      <div className="flex flex-1 h-full overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          partners={partners}
          friends={friends}
          currentUser={currentUser}
          pendingRequestsCount={pendingRequestsCount}
          onSelectConversation={(id) => {
            setActiveConversationId(id);
            setIsMobileSidebarOpen(false);
          }}
          onOpenPartnersModal={() => setShowPartnersModal(true)}
          onOpenFriendsModal={() => setShowFriendsModal(true)}
          onOpenScheduleModal={() => setShowScheduleModal(true)}
          onOpenProfileModal={() => setViewingProfile({ user: currentUser, isOwn: true })}
          onOpenRequestsModal={() => setShowRequestsModal(true)}
          onOpenAddContactModal={() => {
            setAddContactType('friend');
            setShowAddContactModal(true);
          }}
          onStartCall={(convId, type) => {
            setActiveConversationId(convId);
            handleStartCall(type);
          }}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Mobile backdrop */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in"
          />
        )}

        {/* Chat Main Window */}
        <ChatWindow
          conversation={activeConversation}
          messages={activeMessages}
          currentUser={currentUser}
          recipient={activeRecipient}
          typingUserNames={typingUsers[activeConversationId] || []}
          pendingRequestsCount={pendingRequestsCount}
          onSendMessage={handleSendMessage}
          onSendMedia={handleSendMedia}
          onAddReaction={handleReaction}
          onDownloadAttachment={handleDownloadAttachment}
          onStartCall={handleStartCall}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onViewProfile={(user) => setViewingProfile({ user, isOwn: user.id === currentUser.id })}
          onOpenAddContactModal={() => {
            setAddContactType('friend');
            setShowAddContactModal(true);
          }}
          onOpenRequestsModal={() => setShowRequestsModal(true)}
          onUpdateDisappearingTimer={(mins) => {
            setConversations((prev) =>
              prev.map((c) =>
                c.id === activeConversationId ? { ...c, disappearingTimerMinutes: mins } : c
              )
            );
          }}
        />
      </div>

      {/* Group & 1-on-1 Call Window with Add Participant Expansion */}
      {activeCall && !isCallMinimized && (
        <CallModal
          call={activeCall}
          availableContacts={contactsAvailableForCall}
          onAddParticipantToCall={handleAddParticipantToCall}
          onEndCall={handleEndCall}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onMinimize={() => setIsCallMinimized(true)}
        />
      )}

      {/* Floating Mini-Call Bar (when minimized) */}
      {activeCall && isCallMinimized && (
        <FloatingCallBar
          call={activeCall}
          onMaximize={() => setIsCallMinimized(false)}
          onEndCall={handleEndCall}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Incoming Call Dialog */}
      {incomingCall && (
        <IncomingCallDialog
          callerName={incomingCall.caller.name}
          callerAvatar={incomingCall.caller.avatar}
          callType={incomingCall.type}
          isPartner={incomingCall.caller.relationshipType === 'partner'}
          onAccept={async () => {
            const call = incomingCall;
            setIncomingCall(null);
            if (!activeAccount) return;

            await answerCallInFirestore(call.callId, activeAccount.id);
            setActiveConversationId(call.conversation.id);

            const callParticipants = call.conversation.participantIds.map((id) => {
              if (id === activeAccount.id) {
                return {
                  id: activeAccount.id,
                  name: activeAccount.name,
                  avatar: activeAccount.avatar,
                  isMuted: false,
                  isVideoOff: call.type === 'audio',
                  isSpeaking: false,
                  isLocal: true,
                  relationshipType: currentUser.relationshipType
                };
              }
              const contact = contacts.find((c) => c.id === id);
              return {
                id: id,
                name: contact?.name || call.caller.name,
                avatar: contact?.avatar || call.caller.avatar,
                isMuted: false,
                isVideoOff: call.type === 'audio',
                isSpeaking: false,
                isLocal: false,
                relationshipType: contact?.relationshipType || call.caller.relationshipType
              };
            });

            const connectedCall: ActiveCall = {
              id: call.callId,
              conversationId: call.conversation.id,
              conversationTitle: call.conversation.title,
              isGroup: call.conversation.isGroup,
              callType: call.type,
              status: 'connected',
              startedAt: new Date().toISOString(),
              participants: callParticipants
            };

            setActiveCall(connectedCall);
            setIsCallMinimized(false);
            playConnectSound();

            if (callStatusUnsubscribeRef.current) {
              callStatusUnsubscribeRef.current();
            }
            callStatusUnsubscribeRef.current = subscribeToCallStatus(call.callId, (updated) => {
              if (updated.status === 'ended' || updated.status === 'declined') {
                setActiveCall(null);
                setIsCallMinimized(false);
                playEndCallSound();
              }
            });
          }}
          onDecline={async () => {
            if (incomingCall) {
              await declineCallInFirestore(incomingCall.callId);
              setIncomingCall(null);
            }
          }}
        />
      )}

      {/* Real-time In-App Notification Toast */}
      {notificationToast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm w-full bg-slate-900/95 border border-rose-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <span className="text-lg">✨</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white">{notificationToast.title}</h4>
            <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">{notificationToast.message}</p>
            {notificationToast.actionLabel && (
              <button
                type="button"
                onClick={() => {
                  notificationToast.onAction?.();
                  setNotificationToast(null);
                }}
                className="mt-2 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                {notificationToast.actionLabel}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setNotificationToast(null)}
            className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Partners Sanctuary Modal (Max 2 rule strictly enforced) */}
      {showPartnersModal && (
        <PartnerModal
          partners={partners}
          onAddPartner={handleAddPartner}
          onUpdatePartner={handleUpdatePartner}
          onRemovePartner={handleRemovePartner}
          onStartChat={handleStartChatWithContact}
          onStartCall={(id, type) => {
            handleStartChatWithContact(id);
            handleStartCall(type);
          }}
          onOpenAddPartnerModal={() => {
            setShowPartnersModal(false);
            setAddContactType('partner');
            setShowAddContactModal(true);
          }}
          onClose={() => setShowPartnersModal(false)}
        />
      )}

      {/* Friends Network Modal */}
      {showFriendsModal && (
        <FriendsModal
          friends={friends}
          onAddFriend={handleAddFriend}
          onRemoveFriend={handleRemoveFriend}
          onStartChat={handleStartChatWithContact}
          onStartCall={(id, type) => {
            handleStartChatWithContact(id);
            handleStartCall(type);
          }}
          onOpenAddFriendModal={() => {
            setShowFriendsModal(false);
            setAddContactType('friend');
            setShowAddContactModal(true);
          }}
          onClose={() => setShowFriendsModal(false)}
        />
      )}

      {/* Add Contact Modal */}
      {showAddContactModal && activeAccount && (
        <AddContactModal
          isOpen={showAddContactModal}
          onClose={() => setShowAddContactModal(false)}
          currentUser={activeAccount}
          currentPartnersCount={partners.length}
          initialType={addContactType}
          existingContacts={contacts}
          onContactRequestSent={(req) => {
            setContactRequests((prev) => [...prev.filter((r) => r.id !== req.id), req]);
          }}
        />
      )}

      {/* Contact Requests Modal */}
      {showRequestsModal && activeAccount && (
        <RequestsModal
          isOpen={showRequestsModal}
          onClose={() => setShowRequestsModal(false)}
          currentUser={activeAccount}
          requests={contactRequests}
          onAcceptRequest={handleAcceptContactRequest}
          onDeclineRequest={(req) => {
            setContactRequests((prev) =>
              prev.map((r) => (r.id === req.id ? { ...r, status: 'declined' } : r))
            );
          }}
        />
      )}

      {/* Shared Schedule & Calendar Panel */}
      {showScheduleModal && (
        <SchedulePanel
          events={schedules}
          partners={partners}
          friends={friends}
          currentUser={currentUser}
          onUpdateUserSchedule={(schedule: DayScheduleStatus) => {
            setCurrentUser((prev) => ({ ...prev, currentSchedule: schedule }));
          }}
          onAddEvent={(newEvent) => {
            setSchedules((prev) => [
              ...prev,
              { ...newEvent, id: 'sch_' + Date.now() }
            ]);
          }}
          onDeleteEvent={(id) => {
            setSchedules((prev) => prev.filter((e) => e.id !== id));
          }}
          onClose={() => setShowScheduleModal(false)}
        />
      )}

      {/* View/Edit Profile Modal */}
      {viewingProfile && (
        <ProfileModal
          user={viewingProfile.user}
          isOwnProfile={viewingProfile.isOwn}
          onSignOut={handleSignOut}
          onUpdateUser={(updates) => {
            if (viewingProfile.isOwn) {
              setCurrentUser((prev) => ({ ...prev, ...updates }));
            }
          }}
          onClose={() => setViewingProfile(null)}
        />
      )}
    </div>
  );
}
