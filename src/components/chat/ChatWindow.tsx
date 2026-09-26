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
  X
} from 'lucide-react';
import { Conversation, Message, UserProfile, MessagePriority, MessageType } from '../../types';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { VideoNotePlayerModal } from './VideoNotePlayerModal';
import { VideoPlayerModal } from './VideoPlayerModal';
import { SafetyNumberModal } from '../security/SafetyNumberModal';
import { AUTO_PURGE_DAYS } from '../../lib/storage';
import { getConversationDisplayDetails } from '../../lib/conversationResolver';

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
  onStartCall: (type: 'audio' | 'video') => void;
  onToggleMobileSidebar: () => void;
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
  onViewProfile,
  onUpdateDisappearingTimer,
  onOpenAddContactModal,
  onOpenRequestsModal,
  onOpenMediaGallery,
  isMobileSidebarOpen = false,
}) => {
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [selectedVideoNote, setSelectedVideoNote] = useState<Message | null>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<Message | null>(null);
  const [copiedUsername, setCopiedUsername] = useState(false);

  // Message multi-selection & deletion state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
    <main className="flex-1 flex flex-col h-full min-h-0 bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Header / Multi-Select Action Bar */}
      {isSelectionMode ? (
        <header className="shrink-0 w-full p-2.5 sm:p-3 sm:px-6 bg-slate-900 border-b border-rose-950/60 flex items-center justify-between gap-3 z-30 shadow-xl animate-in slide-in-from-top-1 text-white">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancelSelection}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cancel Selection"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <span className="font-bold text-sm sm:text-base text-rose-300">
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
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
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
        <header className="shrink-0 w-full p-2.5 sm:p-3 sm:px-4 bg-slate-900/98 border-b border-rose-950/50 flex items-center justify-between gap-2 z-20 backdrop-blur-xl shadow-md">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile hamburger menu */}
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 -ml-1 text-slate-300 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 flex items-center justify-center cursor-pointer shrink-0"
            title="Open chats"
          >
            <Menu className="w-5 h-5 text-rose-400" />
          </button>

          {/* Conversation Avatar (Clickable to view profile) */}
          <button
            onClick={() => recipient && onViewProfile?.(recipient)}
            className="relative shrink-0 text-left focus:outline-none group"
            title={recipient ? `View ${recipient.name}'s profile` : 'Conversation profile'}
          >
            {displayHeaderAvatar ? (
              <img
                src={displayHeaderAvatar}
                alt={displayHeaderTitle}
                className={`w-10 h-10 rounded-full object-cover ring-2 transition-transform group-hover:scale-105 ${
                  isPartnerChat ? 'ring-rose-400' : 'ring-pink-500/60'
                }`}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-600 to-pink-600 flex items-center justify-center font-bold text-white text-sm group-hover:scale-105 transition-transform">
                {displayHeaderTitle.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-slate-900 ${
              isBusy ? 'bg-amber-400' : 'bg-emerald-400'
            }`} />
          </button>

          {/* Title & E2EE status */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => recipient && onViewProfile?.(recipient)}
                className="font-bold text-sm text-white truncate hover:text-rose-300 transition-colors text-left"
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
            <button
              onClick={() => setShowSafetyModal(true)}
              className="flex items-center gap-1 text-[11px] text-emerald-400 hover:underline hover:text-emerald-300 transition-colors"
              title="Click to view E2EE Safety Number"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>End-to-End Encrypted</span>
            </button>
          </div>
        </div>

        {/* Action Controls: Chat Media Gallery, Audio Call & Video Call */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Dedicated Chat Media Gallery Icon (Strictly for this chat, no dropdown) */}
          {onOpenMediaGallery && (
            <button
              type="button"
              onClick={() => onOpenMediaGallery('conversation', conversation?.id)}
              className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/70 hover:border-pink-500/40 hover:bg-pink-500/20 text-pink-400 hover:text-pink-300 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title={`View ${displayHeaderTitle}'s Media`}
              aria-label="Chat Media Gallery"
            >
              <ImageIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              <span className="hidden md:inline text-xs font-semibold text-pink-300">
                Media
              </span>
            </button>
          )}

          {/* Audio Call */}
          <button
            onClick={() => onStartCall('audio')}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 active:scale-95 transition-all border border-slate-700/60"
            title="Start Encrypted Audio Call"
            aria-label="Start Audio Call"
          >
            <Phone className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* Video Call */}
          <button
            onClick={() => onStartCall('video')}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/30 text-slate-300 hover:text-rose-300 active:scale-95 transition-all border border-slate-700/60"
            title="Start Encrypted Video Call"
            aria-label="Start Video Call"
          >
            <Video className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* Safety modal shortcut (desktop) */}
          <button
            onClick={() => setShowSafetyModal(true)}
            className="hidden sm:flex p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
            title="Verify Security Number"
          >
            <Lock className="w-4 h-4 text-emerald-400" />
          </button>

          {/* More options menu - Pure Action Icons Dock (Never overflows) */}
          <div className="relative">
            <button
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 active:scale-95 transition-all"
              title="More options"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showOptionsMenu && (
              <>
                {/* Backdrop dismiss */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowOptionsMenu(false)}
                />

                <div className="absolute right-0 top-12 p-2 rounded-2xl bg-slate-900/98 border border-slate-700 shadow-2xl z-50 backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 flex items-center gap-2 max-w-[calc(100vw-24px)]">
                  {/* Collection Media Gallery Icon */}
                  {onOpenMediaGallery && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        onOpenMediaGallery('conversation', conversation?.id);
                      }}
                      className="w-11 h-11 rounded-xl bg-pink-500/15 border border-pink-500/30 hover:bg-pink-500/25 active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-sm text-pink-400"
                      title={`View ${displayHeaderTitle}'s Media Collection`}
                      aria-label="Collection Media Gallery"
                    >
                      <ImageIcon className="w-5 h-5 text-pink-400" />
                    </button>
                  )}

                  {/* View Contact Profile Icon */}
                  {effectiveRecipient && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        onViewProfile?.(effectiveRecipient);
                      }}
                      className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-sm text-rose-400"
                      title="View Contact Profile"
                      aria-label="View Contact Profile"
                    >
                      <User className="w-5 h-5 text-rose-400" />
                    </button>
                  )}

                  {/* Verify Safety Number / E2EE Icon */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptionsMenu(false);
                      setShowSafetyModal(true);
                    }}
                    className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-sm text-emerald-400"
                    title="Verify Safety Number (E2EE)"
                    aria-label="Verify Safety Number"
                  >
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </button>

                  {/* Disappearing Messages Timer Icon */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptionsMenu(false);
                      onUpdateDisappearingTimer?.(conversation.disappearingTimerMinutes ? 0 : 1440);
                    }}
                    className={`w-11 h-11 rounded-xl border active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                      conversation.disappearingTimerMinutes
                        ? 'bg-amber-500/25 border-amber-400 text-amber-300 ring-1 ring-amber-400/50'
                        : 'bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/25 text-amber-400'
                    }`}
                    title={conversation.disappearingTimerMinutes ? 'Disable Disappearing Messages' : 'Enable Disappearing Messages (24h)'}
                    aria-label="Disappearing Messages Timer"
                  >
                    <Clock className="w-5 h-5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    )}

      {/* Recipient Busy & Focus Schedule Banner */}
      {isBusy && recipient && (
        <div className="shrink-0 bg-amber-950/50 border-b border-amber-600/30 px-3.5 py-2 flex items-center justify-between gap-2 text-xs text-amber-200 z-10 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 truncate">
            <Moon className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">
              <strong>{recipient.name}</strong> is currently {recipient.currentSchedule?.activityTitle} (until {recipient.currentSchedule?.untilTime}). Normal messages arrive silently.
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-300 shrink-0 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400 fill-current" />
            Use Urgent for emergencies
          </span>
        </div>
      )}

      {/* Ephemeral Text & Device Media Notice */}
      <div className="shrink-0 bg-slate-900/60 border-b border-rose-950/30 px-3 py-1 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
        <HardDrive className="w-3 h-3 text-rose-400" />
        <span>Media stored on device • Online texts auto-purge every {AUTO_PURGE_DAYS} days</span>
      </div>

      {/* Messages Scroll Area - Scrollable with min-h-0 */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 sm:p-4 space-y-2">
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
      <footer className="shrink-0 sticky bottom-0 z-20 w-full">
        <MessageInput
          onSendMessage={onSendMessage}
          onSendMedia={onSendMedia}
          recipientIsBusy={isBusy}
          recipientName={recipient?.name}
          recipientActivity={recipient?.currentSchedule?.activityTitle}
        />
      </footer>

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

      {/* Delete Confirmation Modal */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-150">
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
    </main>
  );
};
