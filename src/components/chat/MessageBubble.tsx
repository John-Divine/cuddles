import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  Lock,
  Check,
  CheckCheck,
  Smile,
  Volume2,
  VolumeX,
  Sparkles,
  Download,
  FileText,
  Film,
  HardDrive,
  Maximize2,
  CheckCircle2,
  CloudOff
} from 'lucide-react';
import { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  onAddReaction: (messageId: string, emoji: string) => void;
  onOpenVideoNoteModal?: (msg: Message) => void;
  onDownloadAttachment?: (messageId: string) => void;
}

const REACTION_PALETTE = ['❤️', '🔥', '😂', '👍', '🥰', '✨'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMe,
  onAddReaction,
  onOpenVideoNoteModal,
  onDownloadAttachment
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState<number>(1);
  const [audioProgress, setAudioProgress] = useState(0);

  // Video note state
  const [isPlayingVideoNote, setIsPlayingVideoNote] = useState(false);
  const [isVideoNoteMuted, setIsVideoNoteMuted] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoNoteRef = useRef<HTMLVideoElement | null>(null);

  // Voice note controls
  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.playbackRate = audioSpeed;
      audioRef.current.play().catch(() => {});
      setIsPlayingAudio(true);
    }
  };

  const cycleSpeed = () => {
    const nextSpeed = audioSpeed === 1 ? 1.5 : audioSpeed === 1.5 ? 2 : 1;
    setAudioSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  // Video note controls
  const toggleVideoNote = () => {
    if (onOpenVideoNoteModal) {
      onOpenVideoNoteModal(message);
      return;
    }
    if (!videoNoteRef.current) return;
    if (isPlayingVideoNote) {
      videoNoteRef.current.pause();
      setIsPlayingVideoNote(false);
    } else {
      videoNoteRef.current.play().catch(() => {});
      setIsPlayingVideoNote(true);
    }
  };

  // Handle document download to device & purge online database
  const handleDownloadDocument = (msg: Message) => {
    if (!msg.attachment?.url) return;
    const a = document.createElement('a');
    a.href = msg.attachment.url;
    a.download = msg.attachment.fileName || 'cuddles-attachment';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    onDownloadAttachment?.(msg.id);
  };

  return (
    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1 px-2 group relative`}>
      <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-md ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isMe && (
          <img
            src={message.senderAvatar}
            alt={message.senderName}
            className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 shadow-sm ring-1 ring-slate-700"
          />
        )}

        <div className="relative">
          {/* Main Bubble */}
          <div
            className={`relative rounded-2xl overflow-hidden transition-all shadow-md ${
              message.type === 'video_note'
                ? 'bg-transparent p-0 shadow-none'
                : message.priority === 'urgent' || message.priority === 'emergency'
                ? 'bg-gradient-to-br from-red-600 via-rose-600 to-amber-600 text-white border-2 border-amber-400/80 shadow-xl shadow-rose-600/30 px-3.5 py-2.5 ring-2 ring-amber-400/40 animate-pulse'
                : isMe
                ? 'bg-gradient-to-br from-rose-600 via-pink-600 to-rose-700 text-white rounded-br-xs px-3.5 py-2.5 shadow-rose-950/40'
                : 'bg-slate-800 text-slate-100 border border-rose-900/30 rounded-bl-xs px-3.5 py-2.5'
            }`}
          >
            {/* Urgent / Emergency Alert Header */}
            {(message.priority === 'urgent' || message.priority === 'emergency') && (
              <div className="flex items-center gap-1.5 mb-1.5 px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-extrabold uppercase tracking-wider text-amber-300 w-fit">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Urgent Attention Required</span>
              </div>
            )}

            {/* Sender name for group chats */}
            {!isMe && message.type !== 'video_note' && (
              <div className="text-[11px] font-semibold text-rose-300 mb-1 flex items-center gap-1">
                <span>{message.senderName}</span>
                <span className="text-[10px] text-slate-400 font-normal flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5 text-emerald-400" />
                  E2EE
                </span>
              </div>
            )}

            {/* Content: TEXT */}
            {message.type === 'text' && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words select-text">
                {message.text}
              </p>
            )}

            {/* Content: IMAGE */}
            {message.type === 'image' && message.attachment && (
              <div className="space-y-1.5">
                <div
                  className="rounded-xl overflow-hidden cursor-pointer max-w-xs"
                  onClick={() => setShowImageZoom(true)}
                >
                  <img
                    src={message.attachment.url}
                    alt="attachment"
                    className="w-full max-h-60 object-cover hover:scale-102 transition-transform duration-200"
                  />
                </div>
                {message.text && (
                  <p className="text-xs text-slate-200 pt-1">{message.text}</p>
                )}
              </div>
            )}

            {/* Content: GIF */}
            {message.type === 'gif' && message.attachment && (
              <div className="rounded-xl overflow-hidden max-w-xs">
                <img
                  src={message.attachment.url}
                  alt="GIF"
                  className="w-full object-cover max-h-56"
                />
              </div>
            )}

            {/* Content: VOICE NOTE */}
            {message.type === 'voice' && message.attachment && (
              <div className="flex items-center gap-3 py-1 min-w-[210px] sm:min-w-[240px]">
                <audio
                  ref={audioRef}
                  src={message.attachment.url}
                  onTimeUpdate={() => {
                    if (audioRef.current) {
                      setAudioProgress(
                        (audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100
                      );
                    }
                  }}
                  onEnded={() => {
                    setIsPlayingAudio(false);
                    setAudioProgress(0);
                  }}
                  className="hidden"
                />

                <button
                  onClick={toggleAudio}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isMe
                      ? 'bg-white text-indigo-700 hover:bg-slate-100'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500'
                  }`}
                >
                  {isPlayingAudio ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>

                {/* Waveform Scrubber */}
                <div className="flex-1 flex flex-col justify-center gap-1">
                  <div className="flex items-center gap-0.5 h-6">
                    {[20, 45, 75, 30, 90, 60, 40, 80, 50, 65, 35, 85, 70, 40, 60, 30, 90, 50].map((h, i) => {
                      const isActive = (i / 18) * 100 <= audioProgress;
                      return (
                        <div
                          key={i}
                          className={`w-1 rounded-full transition-colors ${
                            isActive
                              ? isMe
                                ? 'bg-white'
                                : 'bg-indigo-400'
                              : isMe
                              ? 'bg-white/40'
                              : 'bg-slate-600'
                          }`}
                          style={{ height: `${h}%` }}
                        />
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-300">
                    <span>
                      0:{Math.floor(message.attachment.durationSeconds || 12).toString().padStart(2, '0')}
                    </span>
                    <button
                      onClick={cycleSpeed}
                      className="font-bold text-[10px] px-1 rounded bg-black/20 hover:bg-black/40"
                    >
                      {audioSpeed}x
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Content: DOCUMENT or ATTACHED VIDEO (Max 50MB with instant online purge on download) */}
            {(message.type === 'document' || message.type === 'video') && message.attachment && (
              <div className="space-y-2 py-1 min-w-[220px] sm:min-w-[270px]">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-black/25 border border-white/10">
                  <div className="p-2.5 rounded-lg bg-rose-500/20 text-rose-300 shrink-0">
                    {message.type === 'video' ? (
                      <Film className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-xs text-white block truncate" title={message.attachment.fileName}>
                      {message.attachment.fileName || 'Shared Document'}
                    </span>
                    <span className="text-[11px] text-slate-300 block">
                      {message.attachment.fileSize || 'Attachment'}
                    </span>

                    {/* Status badge: Downloaded to device vs Online relay */}
                    <div className="mt-1 flex items-center gap-1 text-[10px]">
                      {message.attachment.isDownloadedToDevice ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Saved to device • Database purged
                        </span>
                      ) : (
                        <span className="text-amber-300 flex items-center gap-1">
                          <CloudOff className="w-3.5 h-3.5" />
                          Online relay • Auto-purges on download
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {message.text && (
                  <p className="text-xs text-slate-200 px-1">{message.text}</p>
                )}

                {/* Download / Save Button */}
                <div className="pt-0.5">
                  <button
                    onClick={() => handleDownloadDocument(message)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow active:scale-98 ${
                      message.attachment.isDownloadedToDevice
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/40'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {message.attachment.isDownloadedToDevice
                      ? 'Saved to Device (Download Again)'
                      : 'Download & Purge from Online Cloud'}
                  </button>
                </div>
              </div>
            )}

            {/* Content: CIRCULAR VIDEO NOTE (Improved Telegram style) */}
            {message.type === 'video_note' && message.attachment && (
              <div className="relative flex flex-col items-center my-1 group/vnote">
                <div
                  className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden border-4 border-indigo-500/80 shadow-2xl cursor-pointer bg-black"
                  onClick={toggleVideoNote}
                >
                  <video
                    ref={videoNoteRef}
                    src={message.attachment.url}
                    playsInline
                    loop
                    muted={isVideoNoteMuted}
                    onTimeUpdate={() => {
                      if (videoNoteRef.current) {
                        setVideoProgress(
                          (videoNoteRef.current.currentTime / (videoNoteRef.current.duration || 1)) * 100
                        );
                      }
                    }}
                    className="w-full h-full object-cover"
                  />

                  {/* Play Overlay */}
                  {!isPlayingVideoNote && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center shadow-lg">
                        <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  )}

                  {/* Circular Border Progress Ring */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="47%"
                      className="stroke-transparent"
                      strokeWidth="3"
                      fill="transparent"
                    />
                    {isPlayingVideoNote && (
                      <circle
                        cx="50%"
                        cy="50%"
                        r="47%"
                        className="stroke-rose-400 transition-all duration-200"
                        strokeWidth="4"
                        strokeDasharray={2 * Math.PI * 90}
                        strokeDashoffset={2 * Math.PI * 90 * (1 - videoProgress / 100)}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    )}
                  </svg>

                  {/* Fullscreen Modal Pop-up pill */}
                  {onOpenVideoNoteModal && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenVideoNoteModal(message);
                      }}
                      className="absolute top-2 left-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm"
                      title="Pop-up Fullscreen"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Mute/Sound toggle pill */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsVideoNoteMuted(!isVideoNoteMuted);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm"
                  >
                    {isVideoNoteMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>

                  {/* Duration Badge */}
                  <div className="absolute bottom-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-[10px] font-mono text-white font-semibold">
                    0:{Math.floor(message.attachment.durationSeconds || 9).toString().padStart(2, '0')}
                  </div>
                </div>
              </div>
            )}

            {/* Message Meta: Time + Status */}
            {message.type !== 'video_note' && (
              <div
                className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
                  isMe ? 'text-rose-100' : 'text-slate-400'
                }`}
              >
                {message.deliveredSilently && (
                  <span className="text-[9px] text-amber-300 flex items-center gap-0.5">
                    🌙 Delivered silently
                  </span>
                )}
                <span>{message.timestamp}</span>
                {isMe && (
                  <span>
                    {message.status === 'read' ? (
                      <CheckCheck className="w-3.5 h-3.5 text-rose-200 inline" />
                    ) : message.status === 'delivered' ? (
                      <CheckCheck className="w-3.5 h-3.5 text-slate-300 inline" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-slate-300 inline" />
                    )}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Reactions Pill Display */}
          {message.reactions && message.reactions.length > 0 && (
            <div
              className={`flex items-center gap-1 mt-1 flex-wrap ${
                isMe ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.reactions.map((r, i) => (
                <button
                  key={i}
                  onClick={() => onAddReaction(message.id, r.emoji)}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-200 shadow-sm hover:scale-105 transition-transform"
                >
                  <span>{r.emoji}</span>
                  {r.count > 1 && <span className="text-[10px] text-slate-400 font-semibold">{r.count}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Quick Reaction Button on Hover */}
          <div
            className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ${
              isMe ? '-left-8' : '-right-8'
            }`}
          >
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="p-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-amber-400 shadow-md"
              title="Add reaction"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reaction Palette Popup */}
          {showReactionPicker && (
            <div
              className={`absolute -top-9 z-30 flex items-center gap-1 p-1 bg-slate-900 border border-slate-700 rounded-full shadow-xl animate-in zoom-in-95 duration-100 ${
                isMe ? 'right-0' : 'left-0'
              }`}
            >
              {REACTION_PALETTE.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onAddReaction(message.id, emoji);
                    setShowReactionPicker(false);
                  }}
                  className="p-1 text-sm hover:scale-125 transition-transform rounded-full hover:bg-slate-800"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Zoom Modal */}
      {showImageZoom && message.attachment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setShowImageZoom(false)}
        >
          <img
            src={message.attachment.url}
            alt="Zoomed"
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
