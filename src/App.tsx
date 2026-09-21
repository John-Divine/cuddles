import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  Conversation,
  Message,
  ActiveCall,
  ScheduleEvent,
  MessagePriority,
  MessageType,
  DayScheduleStatus,
  UserAccount
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
  getStoredAccounts
} from './lib/storage';
import {
  testConnection,
  ensureFirebaseAuth,
  syncUserToFirestore,
  syncMessageToFirestore,
  purgeMessageMediaFromFirestore,
  syncConversationToFirestore,
  subscribeToConversationMessages
} from './lib/firebase';
import { saveMediaToDeviceVault } from './lib/deviceMediaStorage';
import { encryptMessage } from './lib/encryption';
import { playSentSound, playReceivedSound, playUrgentSound } from './lib/audio';

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

  // Contacts state
  const [contacts, setContacts] = useState<UserProfile[]>(() =>
    loadStoredData(STORAGE_KEYS.CONTACTS, INITIAL_CONTACTS)
  );

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    loadStoredData(STORAGE_KEYS.CONVERSATIONS, INITIAL_CONVERSATIONS)
  );
  const [activeConversationId, setActiveConversationId] = useState<string>(
    conversations[0]?.id || 'conv_elena'
  );

  // Messages state
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(() =>
    loadStoredData(STORAGE_KEYS.MESSAGES, INITIAL_MESSAGES)
  );

  // Schedules state
  const [schedules, setSchedules] = useState<ScheduleEvent[]>(() =>
    loadStoredData(STORAGE_KEYS.SCHEDULES, INITIAL_SCHEDULES)
  );

  // Group Call states
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{
    caller: UserProfile;
    conversation: Conversation;
    type: 'audio' | 'video';
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
    const unsubscribe = subscribeToConversationMessages(activeConversationId, (cloudMsgs) => {
      if (cloudMsgs && cloudMsgs.length > 0) {
        setMessagesMap((prev) => {
          const currentList = prev[activeConversationId] || [];
          const currentIds = new Set(currentList.map((m) => m.id));
          const newOnes = cloudMsgs.filter((m) => !currentIds.has(m.id));
          if (newOnes.length === 0) return prev;
          return {
            ...prev,
            [activeConversationId]: [...currentList, ...newOnes]
          };
        });
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [activeConversationId]);

  // Synchronize state with LocalStorage
  useEffect(() => {
    saveStoredData(STORAGE_KEYS.USER, currentUser);
  }, [currentUser]);

  useEffect(() => {
    saveStoredData(STORAGE_KEYS.CONTACTS, contacts);
  }, [contacts]);

  useEffect(() => {
    saveStoredData(STORAGE_KEYS.CONVERSATIONS, conversations);
  }, [conversations]);

  useEffect(() => {
    saveStoredData(STORAGE_KEYS.MESSAGES, messagesMap);
  }, [messagesMap]);

  useEffect(() => {
    saveStoredData(STORAGE_KEYS.SCHEDULES, schedules);
  }, [schedules]);

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

  // Account Sign Out / Switch Handler
  const handleSignOut = () => {
    setActiveAccountId(null);
    setActiveAccount(null);
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

  // Start Group or 1-on-1 Call
  const handleStartCall = (type: 'audio' | 'video') => {
    if (!activeConversation) return;

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

    const newCall: ActiveCall = {
      id: 'call_' + Date.now(),
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

  // End active call
  const handleEndCall = () => {
    setActiveCall(null);
    setIsCallMinimized(false);
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

  // If no account is logged in, show the clean Cuddles Authentication screen
  if (!activeAccount) {
    return (
      <AuthScreen
        onAuthenticated={(account) => {
          setActiveAccount(account);
          setActiveAccountId(account.id);
          const userProfile: UserProfile = {
            id: account.id,
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
          onSelectConversation={(id) => {
            setActiveConversationId(id);
            setIsMobileSidebarOpen(false);
          }}
          onOpenPartnersModal={() => setShowPartnersModal(true)}
          onOpenFriendsModal={() => setShowFriendsModal(true)}
          onOpenScheduleModal={() => setShowScheduleModal(true)}
          onOpenProfileModal={() => setViewingProfile({ user: currentUser, isOwn: true })}
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
          onSendMessage={handleSendMessage}
          onSendMedia={handleSendMedia}
          onAddReaction={handleReaction}
          onDownloadAttachment={handleDownloadAttachment}
          onStartCall={handleStartCall}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onViewProfile={(user) => setViewingProfile({ user, isOwn: user.id === currentUser.id })}
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

      {/* Incoming Call Simulation Dialog */}
      {incomingCall && (
        <IncomingCallDialog
          callerName={incomingCall.caller.name}
          callerAvatar={incomingCall.caller.avatar}
          callType={incomingCall.type}
          isPartner={incomingCall.caller.relationshipType === 'partner'}
          onAccept={() => {
            const call = incomingCall;
            setIncomingCall(null);
            setActiveConversationId(call.conversation.id);
            handleStartCall(call.type);
          }}
          onDecline={() => setIncomingCall(null)}
        />
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
          onClose={() => setShowFriendsModal(false)}
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
