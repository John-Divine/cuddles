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
  HardDrive
} from 'lucide-react';
import { Conversation, Message, UserProfile, MessagePriority, MessageType } from '../../types';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { VideoNotePlayerModal } from './VideoNotePlayerModal';
import { VideoPlayerModal } from './VideoPlayerModal';
import { SafetyNumberModal } from '../security/SafetyNumberModal';
import { AUTO_PURGE_DAYS } from '../../lib/storage';

interface ChatWindowProps {
  conversation: Conversation;
  messages: Message[];
  currentUser: UserProfile;
  recipient?: UserProfile;
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
  onStartCall: (type: 'audio' | 'video') => void;
  onToggleMobileSidebar: () => void;
  onViewProfile?: (user: UserProfile) => void;
  onUpdateDisappearingTimer?: (minutes: number) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  messages,
  currentUser,
  recipient,
  typingUserNames = [],
  onSendMessage,
  onSendMedia,
  onAddReaction,
  onDownloadAttachment,
  onStartCall,
  onToggleMobileSidebar,
  onViewProfile,
  onUpdateDisappearingTimer,
}) => {
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [selectedVideoNote, setSelectedVideoNote] = useState<Message | null>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, typingUserNames.length]);

  const isPartnerChat = conversation.partnerIds && conversation.partnerIds.length > 0 && !conversation.isGroup;
  const isBusy = recipient?.currentSchedule?.isBusy ?? false;

  return (
    <main className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Header */}
      <header className="p-3 sm:px-4 bg-slate-900/95 border-b border-rose-950/40 flex items-center justify-between gap-2 z-20 backdrop-blur-xl">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile hamburger menu */}
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 -ml-1 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            title="Open chats"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Conversation Avatar (Clickable to view profile) */}
          <button
            onClick={() => recipient && onViewProfile?.(recipient)}
            className="relative shrink-0 text-left focus:outline-none group"
            title={recipient ? `View ${recipient.name}'s profile` : 'Conversation profile'}
          >
            {conversation.avatar ? (
              <img
                src={conversation.avatar}
                alt={conversation.title}
                className={`w-10 h-10 rounded-full object-cover ring-2 transition-transform group-hover:scale-105 ${
                  isPartnerChat ? 'ring-rose-400' : 'ring-pink-500/60'
                }`}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-600 to-pink-600 flex items-center justify-center font-bold text-white text-sm group-hover:scale-105 transition-transform">
                {conversation.title.slice(0, 2).toUpperCase()}
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
                {conversation.title}
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

        {/* Action Controls: Audio Call & Video Call */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Audio Call */}
          <button
            onClick={() => onStartCall('audio')}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 active:scale-95 transition-all border border-slate-700/60"
            title="Start Encrypted Audio Call"
            aria-label="Start Audio Call"
          >
            <Phone className="w-4.5 h-4.5" />
          </button>

          {/* Video Call */}
          <button
            onClick={() => onStartCall('video')}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/30 text-slate-300 hover:text-rose-300 active:scale-95 transition-all border border-slate-700/60"
            title="Start Encrypted Video Call"
            aria-label="Start Video Call"
          >
            <Video className="w-4.5 h-4.5" />
          </button>

          {/* Safety modal shortcut */}
          <button
            onClick={() => setShowSafetyModal(true)}
            className="hidden sm:flex p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
            title="Verify Security Number"
          >
            <Lock className="w-4 h-4 text-emerald-400" />
          </button>

          {/* More options menu */}
          <div className="relative">
            <button
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showOptionsMenu && (
              <div className="absolute right-0 top-12 w-56 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-40 text-xs">
                {recipient && (
                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      onViewProfile?.(recipient);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200"
                  >
                    <User className="w-4 h-4 text-rose-400" />
                    View Contact Profile
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowOptionsMenu(false);
                    setShowSafetyModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  View Safety Number
                </button>
                <button
                  onClick={() => {
                    setShowOptionsMenu(false);
                    onUpdateDisappearingTimer?.(conversation.disappearingTimerMinutes ? 0 : 1440);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  {conversation.disappearingTimerMinutes ? 'Disable Disappearing' : 'Disappearing Messages (24h)'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Recipient Busy & Focus Schedule Banner */}
      {isBusy && recipient && (
        <div className="bg-amber-950/50 border-b border-amber-600/30 px-3.5 py-2 flex items-center justify-between gap-2 text-xs text-amber-200 z-10 animate-in slide-in-from-top-2">
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
      <div className="bg-slate-900/60 border-b border-rose-950/30 px-3 py-1 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
        <HardDrive className="w-3 h-3 text-rose-400" />
        <span>Media stored on device • Online texts auto-purge every {AUTO_PURGE_DAYS} days</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2">
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

      {/* Message Input Bottom Bar */}
      <MessageInput
        onSendMessage={onSendMessage}
        onSendMedia={onSendMedia}
        recipientIsBusy={isBusy}
        recipientName={recipient?.name}
        recipientActivity={recipient?.currentSchedule?.activityTitle}
      />

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
    </main>
  );
};
