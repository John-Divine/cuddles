import React, { useState, useRef, useEffect } from 'react';
import {
  Phone,
  Video,
  ShieldCheck,
  MoreVertical,
  Menu,
  Lock,
  Clock,
  Sparkles,
  Info,
  Moon,
  User,
  Zap,
  HardDrive,
  Heart,
  UserPlus,
  Copy,
  Check,
  Inbox,
  Image as ImageIcon,
  ChevronDown,
  Trash2,
  X,
  ArrowLeft
} from 'lucide-react';
import { Conversation, Message, UserProfile, MessagePriority, MessageType } from '../../types';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { VideoNotePlayerModal } from './VideoNotePlayerModal';
import { VideoPlayerModal } from './VideoPlayerModal';
import { SafetyNumberModal } from '../security/SafetyNumberModal';
import { AUTO_PURGE_DAYS } from '../../lib/storage';
import { getConversationDisplayDetails } from '../../lib/conversationResolver';
import { IntimacyHubModal } from '../intimacy/IntimacyHubModal';
import { HeartbeatPulseOverlay } from '../intimacy/HeartbeatPulseOverlay';
import { subscribeToHeartbeatPulse } from '../../lib/intimacyStorage';
import { HeartbeatPulseEvent } from '../../types/intimacy';
import { MemoriesTimelineModal } from '../memories/MemoriesTimelineModal';
import { AkomaIcon } from '../common/AdinkraIcons';

interface ChatWindowProps {
  conversation?: Conversation | null;
  messages: Message[];
  currentUser: UserProfile;
  recipient?: UserProfile;
  allContacts?: UserProfile[];
  allConversations?: Conversation[];
  messagesMap?: Record<string, Message[]>;
  typingUserNames?: string[];
  onSendMessage: (text: string, priority?: MessagePriority) => void;
  onSendMedia: (
    type: MessageType,
    url: string,
    durationSeconds?: number,
    attachmentMeta?: {
      fileName?: string;
      fileSizeBytes?: number;
      fileSize?: string;
      mimeType?: string;
    }
  ) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onDownloadAttachment?: (messageId: string) => void;
  onDeleteMessages?: (messageIds: string[], deleteForEveryone: boolean) => Promise<void> | void;
  onStartCall: (type: 'audio' | 'video', targetContactId?: string) => void;
  onToggleMobileSidebar: () => void;
  onBackToChatList?: () => void;
  onViewProfile?: (user: UserProfile) => void;
  onUpdateDisappearingTimer?: (minutes: number) => void;
  onOpenAddContactModal?: () => void;
  pendingRequestsCount?: number;
  onOpenRequestsModal?: () => void;
  onOpenMediaGallery?: (scope?: 'all' | 'conversation', conversationId?: string) => void;
  isMobileSidebarOpen?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  messages,
  currentUser,
  recipient,
  allContacts = [],
  allConversations = [],
  messagesMap = {},
  typingUserNames = [],
  pendingRequestsCount = 0,
  onSendMessage,
  onSendMedia,
  onAddReaction,
  onDownloadAttachment,
  onDeleteMessages,
  onStartCall,
  onToggleMobileSidebar,
  onBackToChatList,
  onViewProfile,
  onUpdateDisappearingTimer,
  onOpenAddContactModal,
  onOpenRequestsModal,
  onOpenMediaGallery,
  isMobileSidebarOpen = false,
}) => {
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const optionsMenuRef = useRef<HTMLDivElement | null>(null);
  const [selectedVideoNote, setSelectedVideoNote] = useState<Message | null>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<Message | null>(null);
  const [showIntimacyHub, setShowIntimacyHub] = useState(false);
  const [showMemoriesVault, setShowMemoriesVault] = useState(false);
  const [incomingHeartbeat, setIncomingHeartbeat] = useState<HeartbeatPulseEvent | null>(null);
  const [showGroupCallPicker, setShowGroupCallPicker] = useState<'audio' | 'video' | null>(null);

  // Subscribe to live heartbeat pulses
  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = subscribeToHeartbeatPulse(conversation.id, (event) => {
      if (event.senderId !== currentUser.id) {
        setIncomingHeartbeat(event);
      }
    });
    return () => unsub();
  }, [conversation?.id, currentUser?.id]);

  // Close options menu when clicking outside
  useEffect(() => {
    if (!showOptionsMenu) return;
    const handleOutside = (e: MouseEvent | PointerEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handleOutside);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handleOutside);
    };
  }, [showOptionsMenu]);

  // Message multi-selection & deletion state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);

  const handleStartSelection = (messageId: string) => {
    setIsSelectionMode(true);
    setSelectedMessageIds(new Set([messageId]));
  };

  const handleToggleSelect = (messageId: string) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
        if (next.size === 0) {
          setIsSelectionMode(false);
        }
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedMessageIds.size === messages.length) {
      setSelectedMessageIds(new Set());
      setIsSelectionMode(false);
    } else {
      setSelectedMessageIds(new Set(messages.map((m) => m.id)));
    }
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());
  };

  const handleSingleDelete = (msg: Message) => {
    setSelectedMessageIds(new Set([msg.id]));
    setShowDeleteDialog(true);
  };

  const selectedMessages = messages.filter((m) => selectedMessageIds.has(m.id));
  const canDeleteForEveryone =
    selectedMessages.length > 0 && selectedMessages.every((m) => m.senderId === currentUser.id);

  const handleConfirmDelete = async (deleteForEveryone: boolean) => {
    const ids = Array.from(selectedMessageIds);
    setShowDeleteDialog(false);
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());
    if (onDeleteMessages && ids.length > 0) {
      await onDeleteMessages(ids, deleteForEveryone);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, typingUserNames.length]);

  const handleCopyUsername = () => {
    if (currentUser.username) {
      navigator.clipboard.writeText(`@${currentUser.username}`);
      setCopiedUsername(true);
      setTimeout(() => setCopiedUsername(false), 2000);
    }
  };

  // If no conversation is open (e.g. newly registered user with 0 contacts)
  if (!conversation) {
    return (
      <main className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 relative overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="shrink-0 w-full p-3 bg-slate-900 border-b border-rose-950/50 flex items-center justify-between lg:hidden z-20 shadow-md">
          <button
            onClick={onToggleMobileSidebar}
            className="p-2 -ml-1 text-slate-300 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="Open chats"
          >
            <Menu className="w-5 h-5 text-rose-400" />
            <span>Chats</span>
          </button>
          <div className="flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span className="text-xs font-bold text-white">Sanctuary</span>
          </div>
          <div className="w-16" />
        </header>

        {/* Empty Sanctuary Welcome Area */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative inline-block mx-auto">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-500 p-1 shadow-xl shadow-rose-500/20">
                <div className="w-full h-full bg-slate-900 rounded-[20px] flex items-center justify-center">
                  <Heart className="w-9 h-9 text-rose-400 fill-rose-400 animate-pulse" />
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 text-xl">✨</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">
                Welcome to your Sanctuary, {currentUser.name}!
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                Cuddles is your strictly private space. All the people you see here are solely those you've added via username request and who accepted your invitation.
              </p>
            </div>

            {/* Username Badge */}
            {currentUser.username && (
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 shadow-inner">
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    Your Unique Cuddles ID
                  </p>
                  <p className="text-sm font-mono font-bold text-rose-400">
                    @{currentUser.username}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUsername}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedUsername ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Action Call to Action */}
            <div className="space-y-3 pt-2">
              {onOpenAddContactModal && (
                <button
                  type="button"
                  onClick={onOpenAddContactModal}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Partner or Friend by @Username</span>
                </button>
              )}

              {onOpenRequestsModal && (
                <button
                  type="button"
                  onClick={onOpenRequestsModal}
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Inbox className="w-4 h-4 text-rose-400" />
                  <span>Connection Requests</span>
                  {pendingRequestsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                      {pendingRequestsCount} new
                    </span>
                  )}
                </button>
              )}

              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-rose-950/40 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-300 text-[11px]">
                    <Heart className="w-3.5 h-3.5 fill-rose-400/40 text-rose-400" />
                    <span>Partner Sanctuary</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Max 2 partners. Features shared anniversary counters & priority focus alert.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-300 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Unlimited Friends</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Full end-to-end encrypted messaging, voice notes, and video calls.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const displayDetails = getConversationDisplayDetails(
    conversation,
    currentUser,
    allContacts && allContacts.length > 0 ? allContacts : (recipient ? [recipient] : [])
  );
  const effectiveRecipient = recipient || displayDetails.otherParticipant || undefined;
  const isPartnerChat = displayDetails.isPartner;
  const isBusy = effectiveRecipient?.currentSchedule?.isBusy ?? false;
  const displayHeaderTitle = displayDetails.title;
  const displayHeaderAvatar = displayDetails.avatar;

  return (
    <main className="flex-1 w-full max-w-full flex flex-col h-full min-h-0 bg-[#02140e] text-emerald-50 relative overflow-hidden">
      {/* Header / Multi-Select Action Bar */}
      {isSelectionMode ? (
        <header className="shrink-0 w-full max-w-full p-2.5 sm:p-3 sm:px-6 bg-[#021e14] border-b border-amber-500/30 flex items-center justify-between gap-3 z-30 shadow-xl animate-in slide-in-from-top-1 text-white relative overflow-visible">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancelSelection}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-emerald-900/40 transition-colors cursor-pointer"
              title="Cancel Selection"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <span className="font-bold text-sm sm:text-base text-amber-300">
                {selectedMessageIds.size} Selected
              </span>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Tap messages to select or deselect
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-xs font-semibold text-emerald-200 hover:text-white transition-colors cursor-pointer border border-emerald-800"
            >
              {selectedMessageIds.size === messages.length ? 'Deselect All' : 'Select All'}
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              disabled={selectedMessageIds.size === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-xs font-bold text-white shadow-md shadow-rose-600/30 transition-all cursor-pointer"
              title="Delete Selected Messages"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </header>
      ) : (
        <header className="shrink-0 w-full max-w-full p-2.5 sm:p-3 sm:px-4 bg-[#021e14]/98 border-b border-amber-500/25 flex items-center justify-between gap-1.5 sm:gap-2 z-20 backdrop-blur-xl shadow-md relative overflow-visible">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Back button or hamburger menu */}
          {onBackToChatList ? (
            <button
              type="button"
              onClick={onBackToChatList}
              className="lg:hidden p-2 text-slate-300 hover:text-white rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/50 flex items-center justify-center cursor-pointer shrink-0"
              title="Back to all chats"
            >
              <ArrowLeft className="w-5 h-5 text-amber-400" />
            </button>
          ) : (
            <button
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 text-slate-300 hover:text-white rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/50 flex items-center justify-center cursor-pointer shrink-0"
              title="Open chats"
            >
              <Menu className="w-5 h-5 text-amber-400" />
            </button>
          )}

          {/* Conversation Avatar (Clickable to view profile) */}
          <button
            onClick={() => recipient && onViewProfile?.(recipient)}
            className="relative shrink-0 text-left focus:outline-none group cursor-pointer"
            title={recipient ? `View ${recipient.name}'s profile` : 'Conversation profile'}
          >
            {displayHeaderAvatar ? (
              <img
                src={displayHeaderAvatar}
                alt={displayHeaderTitle}
                className={`w-10 h-10 rounded-full object-cover ring-2 transition-transform group-hover:scale-105 ${
                  isPartnerChat ? 'ring-amber-400 shadow-md shadow-amber-500/20' : 'ring-emerald-500/60'
                }`}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-700 flex items-center justify-center font-bold text-slate-950 text-sm group-hover:scale-105 transition-transform shadow-md">
                {displayHeaderTitle.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-slate-900 ${
                isBusy ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              title={isBusy ? 'Busy' : 'Free'}
            />
          </button>

          {/* Title & Live Status / Schedule indicator */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => recipient && onViewProfile?.(recipient)}
                className="font-bold text-sm text-white truncate hover:text-rose-300 transition-colors text-left cursor-pointer"
              >
                {displayHeaderTitle}
              </button>
              {isPartnerChat && <span className="text-rose-400 text-xs">💕</span>}
              {isBusy && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/30 flex items-center gap-0.5">
                  <Moon className="w-2.5 h-2.5" />
                  Busy
                </span>
              )}
            </div>

            {effectiveRecipient ? (
              <div className="flex items-center gap-1.5 text-[11px] truncate">
                {/* Active indicator */}
                {effectiveRecipient.online !== false ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-medium shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Active now</span>
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium shrink-0">
                    <span>Offline</span>
                  </span>
                )}

                <span className="text-slate-500 shrink-0">•</span>

                {/* Free vs Busy Schedule Status - Exactly one word */}
                {isBusy ? (
                  <span className="text-amber-300 font-medium truncate flex items-center gap-1">
                    <Moon className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Busy</span>
                  </span>
                ) : (
                  <span className="text-emerald-300 font-medium truncate flex items-center gap-1">
                    <span className="text-emerald-400">●</span>
                    <span>Free</span>
                  </span>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowSafetyModal(true)}
                className="flex items-center gap-1 text-[11px] text-emerald-400 hover:underline hover:text-emerald-300 transition-colors"
                title="Click to view E2EE Safety Number"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>End-to-End Encrypted</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Controls: Memories Vault, Intimacy Hub, Chat Media Gallery, Audio Call & Video Call */}
        {/* Action Controls: Audio Call, Video Call, and Clean 3-Dots Options Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Audio Call */}
          <button
            onClick={() => {
              const otherMembers = (conversation?.participantIds || [])
                .filter((id) => id !== currentUser.id)
                .map((id) => allContacts.find((c) => c.id === id) || {
                  id,
                  name: 'Member',
                  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`
                });
              if (conversation?.isGroup && otherMembers.length > 1) {
                setShowGroupCallPicker('audio');
              } else {
                onStartCall('audio', recipient?.id || otherMembers[0]?.id);
              }
            }}
            className="p-2 sm:p-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 hover:text-white active:scale-95 transition-all border border-emerald-800/80 cursor-pointer shadow-sm"
            title="Start Encrypted 1-on-1 Audio Call"
            aria-label="Start Audio Call"
          >
            <Phone className="w-5 h-5 sm:w-5 sm:h-5 text-emerald-300" />
          </button>

          {/* Video Call */}
          <button
            onClick={() => {
              const otherMembers = (conversation?.participantIds || [])
                .filter((id) => id !== currentUser.id)
                .map((id) => allContacts.find((c) => c.id === id) || {
                  id,
                  name: 'Member',
                  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`
                });
              if (conversation?.isGroup && otherMembers.length > 1) {
                setShowGroupCallPicker('video');
              } else {
                onStartCall('video', recipient?.id || otherMembers[0]?.id);
              }
            }}
            className="p-2 sm:p-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 hover:text-white active:scale-95 transition-all border border-emerald-800/80 cursor-pointer shadow-sm"
            title="Start Encrypted 1-on-1 Video Call"
            aria-label="Start Video Call"
          >
            <Video className="w-5 h-5 sm:w-5 sm:h-5 text-emerald-300" />
          </button>

          {/* More options menu (3 Dots) - Houses Secondary Feature Items */}
          <div className="relative shrink-0" ref={optionsMenuRef}>
            <button
              type="button"
              onClick={() => setShowOptionsMenu((prev) => !prev)}
              className={`p-2 sm:p-2.5 rounded-xl border active:scale-95 transition-all cursor-pointer flex items-center justify-center ${
                showOptionsMenu
                  ? 'bg-amber-500/25 text-amber-300 border-amber-400'
                  : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-white border-emerald-800/80'
              }`}
              title="More options"
              aria-label="More options"
            >
              <MoreVertical className="w-5 h-5 shrink-0" strokeWidth={2.2} />
            </button>

            {showOptionsMenu && (
              <div
                className="absolute right-0 top-12 rounded-3xl bg-[#021e14]/98 border border-amber-500/35 shadow-2xl p-2.5 sm:p-3 z-50 backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 select-none w-64 sm:w-72"
                style={{ filter: 'drop-shadow(0 25px 35px rgba(0, 0, 0, 0.9))' }}
              >
                <div className="flex flex-col gap-1">
                  {/* 1. Shared Memories & Milestones Vault */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptionsMenu(false);
                      setShowMemoriesVault(true);
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-emerald-900/60 active:bg-emerald-900 text-left transition-colors cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                      <AkomaIcon className="w-5 h-5 text-slate-950" strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-amber-300 truncate">Memories & Milestones</div>
                      <div className="text-[10px] text-emerald-400/70 truncate">Timeline & relationship counter</div>
                    </div>
                  </button>

                  {/* 2. Connection & Intimacy Hub */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptionsMenu(false);
                      setShowIntimacyHub(true);
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-emerald-900/60 active:bg-emerald-900 text-left transition-colors cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Heart className="w-4.5 h-4.5 fill-white text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-rose-300 truncate">Intimacy & Prompts Hub</div>
                      <div className="text-[10px] text-emerald-400/70 truncate">Daily prompts, radar & vouchers</div>
                    </div>
                  </button>

                  {/* 3. Dedicated Chat Media Gallery */}
                  {onOpenMediaGallery && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        onOpenMediaGallery('conversation', conversation?.id);
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-emerald-900/60 active:bg-emerald-900 text-left transition-colors cursor-pointer group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-900 border border-emerald-700 text-emerald-200 flex items-center justify-center shrink-0 shadow-md">
                        <ImageIcon className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-emerald-200 truncate">Media & Documents</div>
                        <div className="text-[10px] text-emerald-400/70 truncate">Photos, audio & videos in chat</div>
                      </div>
                    </button>
                  )}

                  {/* 4. Disappearing Messages Timer */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptionsMenu(false);
                      onUpdateDisappearingTimer?.(conversation.disappearingTimerMinutes ? 0 : 1440);
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-emerald-900/60 active:bg-emerald-900 text-left transition-colors cursor-pointer group"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                        conversation.disappearingTimerMinutes
                          ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white ring-2 ring-amber-400'
                          : 'bg-emerald-950 border border-emerald-800 text-slate-300'
                      }`}
                    >
                      <Clock className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-amber-300 truncate">Disappearing Messages</div>
                      <div className="text-[10px] text-emerald-400/70 truncate">
                        {conversation.disappearingTimerMinutes ? 'Active (24 hours)' : 'Off (Keep forever)'}
                      </div>
                    </div>
                  </button>

                  {/* 5. End-to-End Encryption Safety Number */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptionsMenu(false);
                      setShowSafetyModal(true);
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-emerald-900/60 active:bg-emerald-900 text-left transition-colors cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center shrink-0 shadow-md">
                      <ShieldCheck className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-emerald-300 truncate">Verify Security</div>
                      <div className="text-[10px] text-emerald-400/70 truncate">End-to-End Encryption keys</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    )}



      {/* Ephemeral Text & Device Media Notice */}
      <div className="shrink-0 w-full max-w-full overflow-hidden bg-slate-900/60 border-b border-rose-950/30 px-2 sm:px-3 py-1 text-center text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
        <HardDrive className="w-3 h-3 text-rose-400 shrink-0" />
        <span className="truncate">Media stored on device • Online texts auto-purge every {AUTO_PURGE_DAYS} days</span>
      </div>

      {/* Messages Scroll Area - Strictly vertical scrolling only */}
      <div className="flex-1 w-full max-w-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-2 sm:p-4 space-y-2">
        {/* E2EE Guarantee Banner */}
        <div className="my-3 p-3 max-w-sm mx-auto rounded-2xl bg-slate-900/80 border border-slate-800 text-center text-xs text-slate-400 shadow-sm flex flex-col items-center gap-1.5">
          <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <p className="leading-relaxed">
            Messages, video notes, and calls are end-to-end encrypted with 256-bit AES-GCM.
          </p>
          <span className="font-mono text-[10px] text-slate-500">
            KEY FINGERPRINT: {conversation.sharedKeyFingerprint}
          </span>
        </div>

        {/* Render message bubbles */}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isMe={msg.senderId === currentUser.id}
            onAddReaction={onAddReaction}
            onOpenVideoNoteModal={(videoMsg) => setSelectedVideoNote(videoMsg)}
            onOpenVideoModal={(videoMsg) => setSelectedVideoFile(videoMsg)}
            onDownloadAttachment={onDownloadAttachment}
            isSelectionMode={isSelectionMode}
            isSelected={selectedMessageIds.has(msg.id)}
            onToggleSelect={handleToggleSelect}
            onStartSelection={handleStartSelection}
            onDeleteMessage={handleSingleDelete}
          />
        ))}

        {/* Typing indicator */}
        {typingUserNames.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-rose-400 px-3 py-1 animate-pulse">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>{typingUserNames.join(', ')} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bottom Bar - Locked & Sticky at bottom */}
      <footer className="shrink-0 sticky bottom-0 z-20 w-full max-w-full relative overflow-visible">
        <MessageInput
          onSendMessage={onSendMessage}
          onSendMedia={onSendMedia}
          recipientIsBusy={isBusy}
          recipientName={recipient?.name}
          recipientActivity={recipient?.currentSchedule?.activityTitle}
          onOpenIntimacyHub={() => setShowIntimacyHub(true)}
          onOpenMemoriesVault={() => setShowMemoriesVault(true)}
        />
      </footer>

      {/* Live Incoming Heartbeat Pulse Animation Overlay */}
      <HeartbeatPulseOverlay
        pulse={incomingHeartbeat}
        onClear={() => setIncomingHeartbeat(null)}
      />

      {/* Connection & Intimacy Hub Modal (Anchored inside Chat Area on Laptop View) */}
      {showIntimacyHub && (
        <IntimacyHubModal
          isOpen={showIntimacyHub}
          onClose={() => setShowIntimacyHub(false)}
          conversationId={conversation.id}
          conversationTitle={displayHeaderTitle}
          isPartner={isPartnerChat}
          currentUserId={currentUser.id}
          currentUserName={currentUser.name}
          currentUserAvatar={currentUser.avatar}
          partnerId={effectiveRecipient?.id}
          partnerName={displayHeaderTitle}
          partnerAvatar={displayHeaderAvatar}
          onSendMessage={(text) => onSendMessage(text)}
        />
      )}

      {/* Shared Memories & Milestones Vault Modal (Anchored inside Chat Area) */}
      {showMemoriesVault && (
        <MemoriesTimelineModal
          isOpen={showMemoriesVault}
          onClose={() => setShowMemoriesVault(false)}
          conversationId={conversation.id}
          conversationTitle={displayHeaderTitle}
          currentUserId={currentUser.id}
          currentUserName={currentUser.name}
          partnerName={displayHeaderTitle}
          onShareToChat={(text) => onSendMessage(text)}
        />
      )}

      {/* Video Note Fullscreen Player Modal */}
      {selectedVideoNote && (
        <VideoNotePlayerModal
          message={selectedVideoNote}
          onClose={() => setSelectedVideoNote(null)}
          onDownloadAttachment={onDownloadAttachment}
        />
      )}

      {/* General Video File Fullscreen Player Modal */}
      {selectedVideoFile && (
        <VideoPlayerModal
          message={selectedVideoFile}
          onClose={() => setSelectedVideoFile(null)}
          onDownloadAttachment={onDownloadAttachment}
        />
      )}

      {/* Safety Number Modal */}
      {showSafetyModal && (
        <SafetyNumberModal
          conversation={conversation}
          onClose={() => setShowSafetyModal(false)}
        />
      )}

      {/* Delete Confirmation Modal - Anchored within Chat Section View Area */}
      {showDeleteDialog && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700/80 p-5 sm:p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base text-white truncate">
                  Delete {selectedMessageIds.size > 1 ? `${selectedMessageIds.size} Messages` : 'Message'}?
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedMessageIds.size} message{selectedMessageIds.size > 1 ? 's' : ''} selected
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {canDeleteForEveryone
                ? 'Would you like to delete these messages for everyone in this chat, or delete them for yourself only?'
                : 'You can delete these messages from this device for yourself.'}
            </p>

            <div className="flex flex-col gap-2 pt-1">
              {canDeleteForEveryone && (
                <button
                  type="button"
                  onClick={() => handleConfirmDelete(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 active:scale-98 transition-all cursor-pointer"
                >
                  Delete for Everyone
                </button>
              )}

              <button
                type="button"
                onClick={() => handleConfirmDelete(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700/60 active:scale-98 transition-all cursor-pointer"
              >
                Delete for Me
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteDialog(false)}
                className="w-full py-2 px-4 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold hover:bg-slate-800/50 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Call Member Picker: Choose which 1 person to call 1-on-1 */}
      {showGroupCallPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#021e14] border border-amber-500/40 p-5 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 mb-3">
              <h4 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                {showGroupCallPicker === 'video' ? <Video className="w-4 h-4 text-emerald-400" /> : <Phone className="w-4 h-4 text-emerald-400" />}
                <span>Select Member to Call</span>
              </h4>
              <button
                onClick={() => setShowGroupCallPicker(null)}
                className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 mb-3">
              Calls start as 1-on-1 for privacy. You can add more members once connected.
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {(conversation?.participantIds || [])
                .filter((id) => id !== currentUser.id)
                .map((id) => allContacts.find((c) => c.id === id) || {
                  id,
                  name: 'Group Member',
                  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`
                })
                .map((member) => (
                  <button
                    key={member.id}
                    onClick={() => {
                      const callType = showGroupCallPicker;
                      setShowGroupCallPicker(null);
                      onStartCall(callType, member.id);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800/60 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={member.avatar} alt={member.name} className="w-9 h-9 rounded-full object-cover ring-1 ring-amber-400/60 shrink-0" />
                      <span className="text-xs font-semibold text-white truncate">{member.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-400 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 group-hover:bg-amber-500/25 shrink-0">
                      Call
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
