import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  CloudOff,
  X,
  Trash2,
  CheckSquare,
  Square,
  Copy,
  Plus
} from 'lucide-react';
import { Message } from '../../types';
import {
  downloadMediaToDeviceGallery,
  saveMediaToDeviceVault,
  getMediaFromDeviceVault,
  dataUrlToBlobUrl
} from '../../lib/deviceMediaStorage';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  onAddReaction: (messageId: string, emoji: string) => void;
  onOpenVideoNoteModal?: (msg: Message) => void;
  onOpenVideoModal?: (msg: Message) => void;
  onDownloadAttachment?: (messageId: string) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (messageId: string) => void;
  onStartSelection?: (messageId: string) => void;
  onDeleteMessage?: (message: Message) => void;
}

const QUICK_REACTIONS = ['❤️', '🔥', '😂', '👍', '🥰', '✨', '😮', '🙏'];

const EMOJI_PACK_CATEGORIES = [
  {
    id: 'love',
    label: '💕 Love',
    emojis: ['❤️', '💖', '💝', '💘', '💕', '💓', '💗', '💞', '💌', '💍', '🌹', '💐', '😘', '🥰', '😍', '😻', '💋', '👩‍❤️‍💋‍👨', '🫂', '🏩', '🍫', '🧸', '🕊️', '✨']
  },
  {
    id: 'smileys',
    label: '😄 Smiles',
    emojis: ['😀', '😃', '😄', '😁', '😆', '🥹', '😂', '🤣', '🥲', '☺️', '😊', '😇', '😋', '😜', '🤪', '😎', '🥳', '🤩', '😭', '🥺', '😮', '😴', '🤗', '🤭']
  },
  {
    id: 'gestures',
    label: '👍 Hands',
    emojis: ['👍', '👎', '👏', '🙌', '🫶', '🤝', '✌️', '🤞', '👊', '🤙', '🙏', '🤌', '💪', '🫡', '💅', '💃', '🕺', '🔥', '⭐', '💯', '👑', '🪄', '🎉', '🍾']
  },
  {
    id: 'nature',
    label: '🌸 Nature',
    emojis: ['🌸', '🌺', '🌻', '🌼', '🌷', '🌿', '🍀', '🍁', '🍃', '🌴', '🌙', '☀️', '🌈', '⚡', '🌊', '🪐', '🦋', '🐝', '🐾', '🦁', '🐯', '🐼', '🐬', '🕊️']
  },
  {
    id: 'food',
    label: '🍕 Treats',
    emojis: ['🍓', '🍒', '🍎', '🍉', '🍇', '🥑', '🍕', '🍔', '🍟', '🌮', '🍣', '🍦', '🍰', '🧁', '🍫', '🍿', '☕', '🧋', '🥂', '🍷', '🍹', '🎂', '🎁', '🎈']
  },
  {
    id: 'activities',
    label: '🏆 Fun',
    emojis: ['⚽', '🏀', '🎾', '🎮', '🎲', '🎯', '🎨', '🎭', '🎪', '🎟️', '🎸', '🎹', '🎧', '🎤', '🎬', '📸', '✈️', '🚀', '🏖️', '🏕️', '🎡', '🎢', '🚗', '🚲']
  }
];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMe,
  onAddReaction,
  onOpenVideoNoteModal,
  onOpenVideoModal,
  onDownloadAttachment,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  onStartSelection,
  onDeleteMessage
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState<number>(1);
  const [audioProgress, setAudioProgress] = useState(0);

  // Media source resolution (fallback to IndexedDB vault if cloud purged)
  const [resolvedMediaUrl, setResolvedMediaUrl] = useState<string>(message.attachment?.url || '');

  useEffect(() => {
    if (message.attachment?.url) {
      setResolvedMediaUrl(message.attachment.url);
      // Ensure media is backed up to local device IndexedDB vault
      saveMediaToDeviceVault(
        message.id,
        message.attachment.url,
        message.type,
        message.attachment.fileName || `cuddles_${message.type}_${Date.now()}`
      );
    } else if (message.attachment) {
      getMediaFromDeviceVault(message.id).then((vaultData) => {
        if (vaultData) {
          setResolvedMediaUrl(vaultData);
        }
      });
    }
  }, [message.id, message.attachment?.url]);

  const currentMediaUrl = resolvedMediaUrl || message.attachment?.url || '';
  const playableMediaUrl = React.useMemo(() => {
    return dataUrlToBlobUrl(currentMediaUrl || message.attachment?.url || '', message.attachment?.mimeType);
  }, [currentMediaUrl, message.attachment?.url, message.attachment?.mimeType]);

  // Video note state
  const [isPlayingVideoNote, setIsPlayingVideoNote] = useState(false);
  const [isVideoNoteMuted, setIsVideoNoteMuted] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  // Video file (regular attachment) state
  const [isPlayingVideoFile, setIsPlayingVideoFile] = useState(false);
  const [isVideoFileMuted, setIsVideoFileMuted] = useState(false);
  const [videoFileProgress, setVideoFileProgress] = useState(0);
  const [videoFileDuration, setVideoFileDuration] = useState(message.attachment?.durationSeconds || 0);

  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [justSavedNotification, setJustSavedNotification] = useState<string | null>(null);

  // Message Action Popover & Full Emoji Pack State
  const [showActionPopover, setShowActionPopover] = useState(false);
  const [showEmojiPack, setShowEmojiPack] = useState(false);
  const [activePackCategory, setActivePackCategory] = useState<'love' | 'smileys' | 'gestures' | 'nature' | 'food' | 'activities'>('love');
  const [copiedText, setCopiedText] = useState(false);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number; placeAbove: boolean } | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  const openActionPopover = () => {
    if (bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const popoverWidth = Math.min(320, viewportWidth - 24);
      const popoverHeight = 110;

      let left: number;
      if (viewportWidth < 640) {
        left = Math.max(12, (viewportWidth - popoverWidth) / 2);
      } else {
        left = isMe
          ? Math.max(12, rect.right - popoverWidth)
          : Math.max(12, Math.min(viewportWidth - popoverWidth - 12, rect.left));
      }

      let top: number;
      if (rect.top >= popoverHeight + 80) {
        top = rect.top - popoverHeight - 8;
      } else if (viewportHeight - rect.bottom >= popoverHeight + 80) {
        top = rect.bottom + 8;
      } else {
        top = Math.max(70, (viewportHeight - popoverHeight) / 2);
      }

      const minTop = 64;
      const maxTop = Math.max(minTop, viewportHeight - popoverHeight - 70);
      top = Math.max(minTop, Math.min(maxTop, top));

      setPopoverCoords({
        top,
        left,
        placeAbove: false
      });
      setShowActionPopover(true);
      setShowEmojiPack(false);
    }
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoNoteRef = useRef<HTMLVideoElement | null>(null);
  const videoFileRef = useRef<HTMLVideoElement | null>(null);

  // When media URL resolves from IndexedDB or cloud, trigger .load() so browser decoder initializes
  useEffect(() => {
    if (videoNoteRef.current && playableMediaUrl) {
      videoNoteRef.current.load();
    }
  }, [playableMediaUrl]);

  useEffect(() => {
    if (videoFileRef.current && playableMediaUrl) {
      videoFileRef.current.load();
    }
  }, [playableMediaUrl]);

  useEffect(() => {
    if (audioRef.current && playableMediaUrl) {
      audioRef.current.load();
    }
  }, [playableMediaUrl]);

  // Universal Media Save & Purge Trigger
  const handleSaveMedia = async (
    msg: Message,
    mediaKind: 'image' | 'voice' | 'video_note' | 'document' | 'video'
  ) => {
    const url = currentMediaUrl || msg.attachment?.url;
    if (!url) return;

    let defaultName = msg.attachment?.fileName || `cuddles_${mediaKind}_${Date.now()}`;
    let mime = msg.attachment?.mimeType;

    if (mediaKind === 'image' && !defaultName.includes('.')) defaultName += '.jpg';
    if (mediaKind === 'voice' && !defaultName.includes('.')) defaultName += '.webm';
    if (mediaKind === 'video_note' && !defaultName.includes('.')) defaultName += '.webm';

    // 1. Save to device IndexedDB
    await saveMediaToDeviceVault(msg.id, url, mediaKind, defaultName);

    // 2. Trigger native download to gallery/disk
    const res = await downloadMediaToDeviceGallery(url, defaultName, mime);

    // 3. Purge from online database payload
    onDownloadAttachment?.(msg.id);

    setJustSavedNotification(res.success ? 'Saved to Gallery • Purged from Cloud' : 'Saved locally');
    setTimeout(() => setJustSavedNotification(null), 3000);
  };

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

      // Auto-save to device & trigger purge on first play for receiver
      if (!isMe && !message.attachment?.isDownloadedToDevice) {
        handleSaveMedia(message, 'voice');
      }
    }
  };

  const cycleSpeed = () => {
    const nextSpeed = audioSpeed === 1 ? 1.5 : audioSpeed === 1.5 ? 2 : 1;
    setAudioSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  // Video note inline controls
  const toggleVideoNote = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoNoteRef.current) return;
    if (isPlayingVideoNote) {
      videoNoteRef.current.pause();
      setIsPlayingVideoNote(false);
    } else {
      if (videoNoteRef.current.ended) {
        videoNoteRef.current.currentTime = 0;
      }
      videoNoteRef.current.muted = isVideoNoteMuted;

      // Play synchronously within the user interaction gesture for iOS Safari & Android Chrome compatibility
      const playPromise = videoNoteRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlayingVideoNote(true);
          })
          .catch((err) => {
            console.warn('Autoplay unmuted restricted by mobile browser, falling back to muted play:', err);
            if (videoNoteRef.current) {
              videoNoteRef.current.muted = true;
              setIsVideoNoteMuted(true);
              videoNoteRef.current
                .play()
                .then(() => {
                  setIsPlayingVideoNote(true);
                })
                .catch((secondErr) => {
                  console.warn('Inline playback failed on mobile device, opening popup modal:', secondErr);
                  if (onOpenVideoNoteModal) {
                    onOpenVideoNoteModal(message);
                  }
                });
            }
          });
      }

      // Check device vault in background if currentMediaUrl is missing
      if (!currentMediaUrl && message.attachment) {
        getMediaFromDeviceVault(message.id).then((vaultUrl) => {
          if (vaultUrl) {
            setResolvedMediaUrl(vaultUrl);
          }
        });
      }

      // Auto-save to device & trigger purge on first play for receiver
      if (!isMe && !message.attachment?.isDownloadedToDevice) {
        handleSaveMedia(message, 'video_note');
      }
    }
  };

  // Video file controls
  const toggleVideoFilePlay = () => {
    if (!videoFileRef.current) return;
    if (isPlayingVideoFile) {
      videoFileRef.current.pause();
      setIsPlayingVideoFile(false);
    } else {
      const playPromise = videoFileRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlayingVideoFile(true);
          })
          .catch(() => {
            if (videoFileRef.current) {
              videoFileRef.current.muted = true;
              setIsVideoFileMuted(true);
              videoFileRef.current.play().then(() => setIsPlayingVideoFile(true)).catch(() => {});
            }
          });
      }

      if (!isMe && !message.attachment?.isDownloadedToDevice) {
        handleSaveMedia(message, 'video');
      }
    }
  };

  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isTouchGestureRef = useRef(false);
  const wasLongPressRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    isTouchGestureRef.current = true;
    wasLongPressRef.current = false;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      wasLongPressRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(40); } catch (_) {}
      }
      if (!isSelectionMode) {
        openActionPopover();
      } else {
        onToggleSelect?.(message.id);
      }
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
    }
  };

  const lastTouchEndTimeRef = useRef<number>(0);

  const handleTouchEnd = () => {
    lastTouchEndTimeRef.current = Date.now();
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    // Release touch flag after delay to block synthetic click from opening popup
    setTimeout(() => {
      isTouchGestureRef.current = false;
      wasLongPressRef.current = false;
    }, 400);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isSelectionMode) {
      openActionPopover();
    } else {
      onToggleSelect?.(message.id);
    }
  };

  const handleBubbleClick = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.stopPropagation();
      onToggleSelect?.(message.id);
      return;
    }
    // User requirement: "The pop-up on mobile view should come up only when I press and hold on a message."
    const isTouchRecent = Date.now() - lastTouchEndTimeRef.current < 600;
    const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isTouchGestureRef.current || wasLongPressRef.current || isTouchRecent || isMobileViewport) {
      return;
    }
    // On desktop view, mouse click opens popover
    openActionPopover();
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={handleContextMenu}
      onClick={handleBubbleClick}
      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1 px-1 sm:px-2 group relative transition-all w-full max-w-full overflow-visible ${
        isSelectionMode ? 'cursor-pointer' : ''
      }`}
    >
      <div className={`flex items-center gap-1.5 sm:gap-2 max-w-[88%] sm:max-w-md ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Selection Checkbox */}
        {isSelectionMode && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(message.id);
            }}
            className="shrink-0 p-1 cursor-pointer transition-transform active:scale-90"
          >
            <div
              className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/40 ring-2 ring-rose-400'
                  : 'bg-slate-800 border border-slate-600 text-transparent'
              }`}
            >
              <Check className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        )}

        {!isMe && (
          <img
            src={message.senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(message.senderName || message.senderId || 'user')}`}
            alt={message.senderName || 'Sender'}
            className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 shadow-sm ring-1 ring-slate-700"
            onError={(e) => {
              e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(message.senderName || message.senderId || 'user')}`;
            }}
          />
        )}

        <div ref={bubbleRef} className="relative min-w-0 max-w-full">
          {/* Main Bubble */}
          <div
            className={`relative rounded-2xl overflow-hidden transition-all shadow-md ${
              isSelected ? 'ring-2 ring-rose-400 shadow-rose-500/30' : ''
            } ${
              message.isDeletedForEveryone
                ? 'bg-slate-900/90 text-slate-400 border border-slate-800/80 px-3.5 py-2'
                : message.type === 'video_note'
                ? 'bg-transparent p-0 shadow-none'
                : message.priority === 'urgent' || message.priority === 'emergency'
                ? 'bg-gradient-to-br from-amber-600 via-rose-600 to-amber-700 text-white border-2 border-amber-400 shadow-xl shadow-amber-600/30 px-3.5 py-2.5 ring-2 ring-amber-400/40 animate-pulse'
                : isMe
                ? 'bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-500 text-slate-950 font-medium rounded-br-xs px-3.5 py-2.5 shadow-md shadow-amber-950/40 border border-amber-400/40'
                : 'bg-emerald-900/90 text-emerald-50 border border-amber-500/25 rounded-bl-xs px-3.5 py-2.5 shadow-md'
            }`}
          >
            {/* Deleted for everyone placeholder */}
            {message.isDeletedForEveryone ? (
              <div className="flex items-center gap-1.5 text-xs italic text-slate-400 select-none py-0.5">
                <Trash2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{isMe ? 'You deleted this message' : 'This message was deleted'}</span>
              </div>
            ) : (
              <>
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
            {(message.type === 'text' || (!message.type && message.text)) && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] select-text">
                {message.text}
              </p>
            )}

            {/* Content: IMAGE */}
            {message.type === 'image' && message.attachment && (
              <div className="space-y-1.5">
                <div className="relative rounded-xl overflow-hidden cursor-pointer max-w-xs group/img bg-slate-900 border border-slate-800">
                  <img
                    src={currentMediaUrl || message.attachment.url}
                    alt={message.attachment.fileName || 'Photo attachment'}
                    onClick={() => setShowImageZoom(true)}
                    className="w-full max-h-60 object-cover hover:scale-102 transition-transform duration-200"
                    onError={async () => {
                      const vault = await getMediaFromDeviceVault(message.id);
                      if (vault && vault !== currentMediaUrl) {
                        setResolvedMediaUrl(vault);
                      }
                    }}
                  />

                  {/* Explicit Save to Gallery button on Image */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveMedia(message, 'image');
                    }}
                    className="absolute bottom-2 right-2 px-2.5 py-1.5 rounded-xl bg-black/75 hover:bg-black/90 text-white backdrop-blur-md shadow-lg transition-transform active:scale-95 flex items-center gap-1.5 text-[11px] font-bold border border-white/20"
                    title="Save to Gallery / File Storage"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save to Gallery</span>
                  </button>
                </div>
                {message.text && (
                  <p className="text-xs text-slate-200 pt-1">{message.text}</p>
                )}
                {/* Saved status indicator */}
                {message.attachment.isDownloadedToDevice && (
                  <div className="text-[10px] text-emerald-300 flex items-center gap-1 font-medium pt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Saved to device • Cloud purged</span>
                  </div>
                )}
              </div>
            )}

            {/* Content: GIF */}
            {message.type === 'gif' && message.attachment && (
              <div className="rounded-xl overflow-hidden max-w-xs relative group/gif">
                <img
                  src={currentMediaUrl || message.attachment.url}
                  alt="GIF"
                  className="w-full object-cover max-h-56"
                />
                <button
                  onClick={() => handleSaveMedia(message, 'image')}
                  className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white backdrop-blur-sm shadow text-[10px] flex items-center gap-1 font-medium"
                  title="Save GIF to device"
                >
                  <Download className="w-3 h-3" />
                  <span>Save</span>
                </button>
              </div>
            )}

            {/* Content: VOICE NOTE */}
            {message.type === 'voice' && message.attachment && (
              <div className="flex flex-col gap-1.5 py-1 min-w-[220px] sm:min-w-[260px]">
                <div className="flex items-center gap-3">
                  <audio
                    ref={audioRef}
                    src={currentMediaUrl || message.attachment.url}
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
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow ${
                      isMe
                        ? 'bg-white text-rose-700 hover:bg-slate-100'
                        : 'bg-rose-600 text-white hover:bg-rose-500'
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
                                  : 'bg-rose-400'
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
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={cycleSpeed}
                          className="font-bold text-[10px] px-1 rounded bg-black/20 hover:bg-black/40 text-white"
                        >
                          {audioSpeed}x
                        </button>
                        {/* Explicit Save Audio / Download Button */}
                        <button
                          onClick={() => handleSaveMedia(message, 'voice')}
                          className="p-1 rounded bg-black/25 hover:bg-black/45 text-white transition-colors"
                          title="Save Audio to device & gallery"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Downloaded status badge */}
                {message.attachment.isDownloadedToDevice && (
                  <span className="text-[10px] text-emerald-300 flex items-center gap-1 font-medium pl-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Saved on device • Cloud purged
                  </span>
                )}
              </div>
            )}

            {/* Content: ATTACHED VIDEO FILE (IN-APP PLAYABLE) */}
            {message.type === 'video' && message.attachment && (
              <div className="space-y-2 py-1 min-w-[260px] sm:min-w-[320px] max-w-sm">
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-rose-500/20 shadow-xl group/videofile">
                  <video
                    ref={videoFileRef}
                    src={resolvedMediaUrl || message.attachment.url}
                    playsInline
                    loop
                    muted={isVideoFileMuted}
                    onTimeUpdate={() => {
                      if (videoFileRef.current) {
                        const curr = videoFileRef.current.currentTime;
                        const dur = videoFileRef.current.duration || videoFileDuration || 1;
                        setVideoFileProgress((curr / dur) * 100);
                        if (!videoFileDuration && videoFileRef.current.duration) {
                          setVideoFileDuration(videoFileRef.current.duration);
                        }
                      }
                    }}
                    onEnded={() => setIsPlayingVideoFile(false)}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={toggleVideoFilePlay}
                  />

                  {/* Play / Pause Center Overlay */}
                  {!isPlayingVideoFile && (
                    <div
                      className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer"
                      onClick={toggleVideoFilePlay}
                    >
                      <div className="w-14 h-14 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95">
                        <Play className="w-7 h-7 fill-white ml-0.5" />
                      </div>
                    </div>
                  )}

                  {/* Top Bar: Expand / Fullscreen & Mute */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 opacity-90 group-hover/videofile:opacity-100 transition-opacity">
                    <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] text-white font-medium truncate max-w-[150px]">
                      {message.attachment.fileName || 'Video'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Mute button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (videoFileRef.current) {
                            videoFileRef.current.muted = !isVideoFileMuted;
                            setIsVideoFileMuted(!isVideoFileMuted);
                          }
                        }}
                        className="p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm transition-colors"
                        title={isVideoFileMuted ? 'Unmute' : 'Mute'}
                      >
                        {isVideoFileMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>

                      {/* Fullscreen modal button */}
                      {onOpenVideoModal && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenVideoModal(message);
                          }}
                          className="p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm transition-colors"
                          title="Open Video in Fullscreen Player"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bottom Timeline Bar */}
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                    <div
                      className="h-full bg-rose-500 transition-all duration-100"
                      style={{ width: `${videoFileProgress}%` }}
                    />
                  </div>
                </div>

                {message.text && (
                  <p className="text-xs text-slate-200 px-1">{message.text}</p>
                )}

                {/* Video File Actions & Status */}
                <div className="flex items-center justify-between gap-2 pt-0.5 px-0.5">
                  <div className="text-[10px] text-slate-300">
                    {message.attachment.isDownloadedToDevice ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Saved on device
                      </span>
                    ) : (
                      <span className="text-amber-300 flex items-center gap-1">
                        <CloudOff className="w-3.5 h-3.5" />
                        Purges online on save
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleSaveMedia(message, 'video')}
                    className="py-1 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 bg-rose-600 hover:bg-rose-500 text-white shadow transition-all active:scale-95"
                    title="Save video file to Gallery / Storage"
                  >
                    <Download className="w-3 h-3" />
                    <span>Save to Gallery</span>
                  </button>
                </div>
              </div>
            )}

            {/* Content: DOCUMENT ATTACHMENT */}
            {message.type === 'document' && message.attachment && (
              <div className="space-y-2 py-1 min-w-[220px] sm:min-w-[270px]">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-black/25 border border-white/10">
                  <div className="p-2.5 rounded-lg bg-rose-500/20 text-rose-300 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-xs text-white block truncate" title={message.attachment.fileName}>
                      {message.attachment.fileName || 'Shared Document'}
                    </span>
                    <span className="text-[11px] text-slate-300 block">
                      {message.attachment.fileSize || 'Attachment'}
                    </span>

                    {/* Status badge */}
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

                {/* Explicit Download / Save Button */}
                <div className="pt-0.5">
                  <button
                    onClick={() => handleSaveMedia(message, 'document')}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow active:scale-98 ${
                      message.attachment.isDownloadedToDevice
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/40'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {message.attachment.isDownloadedToDevice
                      ? 'Saved to Device (Download Again)'
                      : 'Download to Device & Purge Cloud'}
                  </button>
                </div>
              </div>
            )}

            {/* Content: CIRCULAR VIDEO NOTE */}
            {message.type === 'video_note' && message.attachment && (
              <div className="relative flex flex-col items-center my-1 group/vnote">
                <div
                  className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden border-4 border-rose-500/80 shadow-2xl cursor-pointer bg-slate-950"
                  onClick={toggleVideoNote}
                >
                  <video
                    ref={videoNoteRef}
                    src={playableMediaUrl}
                    poster={message.attachment.thumbnailUrl}
                    playsInline
                    preload="auto"
                    loop
                    muted={isVideoNoteMuted}
                    onPlay={() => setIsPlayingVideoNote(true)}
                    onPause={() => setIsPlayingVideoNote(false)}
                    onEnded={() => {
                      setIsPlayingVideoNote(false);
                      setVideoProgress(0);
                    }}
                    onError={(err) => {
                      console.warn('Video note inline playback error:', err);
                    }}
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      if (!message.attachment?.thumbnailUrl && v.currentTime === 0) {
                        try {
                          v.currentTime = 0.05;
                        } catch {
                          // ignore seek error on non-ready streams
                        }
                      }
                    }}
                    onTimeUpdate={() => {
                      if (videoNoteRef.current) {
                        setVideoProgress(
                          (videoNoteRef.current.currentTime / (videoNoteRef.current.duration || 1)) * 100
                        );
                      }
                    }}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      isPlayingVideoNote || !message.attachment.thumbnailUrl ? 'opacity-100' : 'opacity-90'
                    }`}
                  />

                  {/* Guaranteed Poster Preview Frame (prevents dark screen when paused) */}
                  {!isPlayingVideoNote && message.attachment.thumbnailUrl && (
                    <img
                      src={message.attachment.thumbnailUrl}
                      alt="Video note preview"
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    />
                  )}

                  {/* Play Overlay */}
                  {!isPlayingVideoNote && (
                    <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                      <div className="w-13 h-13 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white backdrop-blur-md flex items-center justify-center shadow-xl ring-2 ring-white/40 transition-transform active:scale-95">
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

                  {/* Fullscreen Pop-up button */}
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

                  {/* Explicit Save to Gallery / Download button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveMedia(message, 'video_note');
                    }}
                    className="absolute top-2 left-10 p-1.5 rounded-full bg-rose-600/90 text-white hover:bg-rose-500 backdrop-blur-sm shadow"
                    title="Save Video Note to Gallery / Device"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {/* Mute/Sound toggle button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsVideoNoteMuted(!isVideoNoteMuted);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm"
                    title={isVideoNoteMuted ? 'Unmute' : 'Mute'}
                  >
                    {isVideoNoteMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>

                  {/* Duration Badge */}
                  <div className="absolute bottom-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-[10px] font-mono text-white font-semibold">
                    0:{Math.floor(message.attachment.durationSeconds || 9).toString().padStart(2, '0')}
                  </div>
                </div>

                {/* Video Note Device Status pill & Meta */}
                <div className="mt-1 flex items-center justify-between gap-2">
                  {message.attachment.isDownloadedToDevice ? (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium bg-slate-900/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Saved on device
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSaveMedia(message, 'video_note')}
                      className="text-[10px] text-rose-300 hover:text-white flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded-full border border-rose-500/30 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Save
                    </button>
                  )}

                  <div className="flex items-center gap-1 text-[10px] text-slate-300">
                    <span>{message.timestamp}</span>
                    {isMe && (
                      <span
                        className="inline-flex items-center ml-0.5"
                        title={message.status === 'read' ? 'Seen / Read' : message.status === 'delivered' ? 'Delivered' : 'Sent'}
                      >
                        {message.status === 'read' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.95)] inline stroke-[2.5]" />
                        ) : message.status === 'delivered' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-slate-400 inline stroke-[2]" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-slate-400 inline stroke-[2]" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Message Meta: Time + Status for non-video-note messages */}
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
                  <span
                    className="inline-flex items-center ml-0.5"
                    title={message.status === 'read' ? 'Seen / Read' : message.status === 'delivered' ? 'Delivered' : 'Sent'}
                  >
                    {message.status === 'read' ? (
                      <CheckCheck className="w-3.5 h-3.5 text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.95)] inline stroke-[2.5]" />
                    ) : message.status === 'delivered' ? (
                      <CheckCheck className="w-3.5 h-3.5 text-slate-400 inline stroke-[2]" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-slate-400 inline stroke-[2]" />
                    )}
                  </span>
                )}
              </div>
            )}
            </>
          )}
          </div>

          {/* Toast on save */}
          {justSavedNotification && (
            <div className="absolute -top-7 left-0 right-0 mx-auto w-max px-2.5 py-1 rounded-full bg-slate-900 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold shadow-xl backdrop-blur-md flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-150 z-20">
              <HardDrive className="w-3 h-3 text-emerald-400" />
              <span>{justSavedNotification}</span>
            </div>
          )}

          {/* Reactions Pill Display */}
          {!message.isDeletedForEveryone && message.reactions && message.reactions.length > 0 && (
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

          {/* Quick Reaction & Delete Action on Hover (Desktop) */}
          {!isSelectionMode && !message.isDeletedForEveryone && (
            <div
              className={`hidden sm:flex absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity items-center gap-1 ${
                isMe ? '-left-16' : '-right-16'
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openActionPopover();
                }}
                className="p-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 hover:text-amber-400 shadow-md cursor-pointer"
                title="Add reaction & actions"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteMessage?.(message);
                }}
                className="p-1 rounded-full bg-emerald-950 border border-emerald-800 text-slate-400 hover:text-rose-400 shadow-md cursor-pointer"
                title="Delete message"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Image Zoom Modal with explicit Save to Gallery button */}
      {showImageZoom && message.attachment && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-y-0 right-0 left-0 lg:left-[22rem] z-[99999] flex flex-col items-center justify-between bg-black/95 p-4 sm:p-6 backdrop-blur-xl animate-in fade-in duration-200"
          onClick={() => setShowImageZoom(false)}
        >
          <div
            className="w-full max-w-2xl flex items-center justify-between z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs text-slate-300 font-medium">{message.senderName} • Photo</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSaveMedia(message, 'image')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg active:scale-95 transition-all"
                title="Save Photo to Gallery / Files"
              >
                <Download className="w-4 h-4" />
                <span>Save to Gallery</span>
              </button>
              <button
                onClick={() => setShowImageZoom(false)}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-2 max-w-4xl max-h-[80vh]">
            <img
              src={currentMediaUrl || message.attachment.url}
              alt="Zoomed"
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl ring-1 ring-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="text-center text-xs text-slate-400 z-10">
            Ephemeral Photo • Saved to local device vault & purged from cloud upon download
          </div>
        </div>,
        document.body
      )}

      {/* WhatsApp-Style Message Action & Emoji Pack Popover Portal */}
      {showActionPopover && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop: click outside closes popover */}
          <div
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[1px] animate-in fade-in duration-100"
            onClick={(e) => {
              e.stopPropagation();
              setShowActionPopover(false);
            }}
          />

          {/* Floating Popover Card (Quick Reactions + Actions) */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[9999] rounded-3xl bg-[#021e14] border border-amber-500/50 p-3 shadow-2xl backdrop-blur-2xl text-white select-none w-[300px] sm:w-[330px] animate-in zoom-in-95 fade-in duration-150"
            style={{
              filter: 'drop-shadow(0 25px 35px rgba(0, 0, 0, 0.9))',
              top: `${popoverCoords?.top ?? 100}px`,
              left: `${popoverCoords?.left ?? 16}px`
            }}
          >
            {/* 1. Quick Reaction Bar with Button for Full Emoji Pack */}
            <div className="flex items-center justify-between gap-1 pb-2 border-b border-amber-500/20">
              <div className="flex items-center gap-1 sm:gap-1.5 flex-1 justify-between">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onAddReaction(message.id, emoji);
                      setShowActionPopover(false);
                    }}
                    className="p-1 sm:p-1.5 text-lg sm:text-xl rounded-full hover:scale-130 active:scale-95 hover:bg-emerald-900/60 transition-transform cursor-pointer"
                    title={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Emoji Pack Button to open Dedicated Full Emoji Pack Modal */}
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPack(true);
                  setShowActionPopover(false);
                }}
                className="p-1.5 ml-1 rounded-full border border-amber-500/40 bg-emerald-950 hover:bg-amber-500/20 text-amber-300 transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
                title="Open Full Emoji Pack"
                aria-label="Open Full Emoji Pack"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>

            {/* 2. Action Buttons Row: Copy Text, Select, Delete */}
            <div className="flex items-center justify-between pt-2 gap-2 text-xs">
              {message.text && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(message.text || '');
                    setCopiedText(true);
                    setTimeout(() => {
                      setCopiedText(false);
                      setShowActionPopover(false);
                    }, 800);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 hover:text-white border border-emerald-800/60 transition-colors cursor-pointer"
                  title="Copy text to clipboard"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText ? 'Copied!' : 'Copy'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowActionPopover(false);
                  onStartSelection?.(message.id);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 hover:text-white border border-emerald-800/60 transition-colors cursor-pointer"
                title="Select messages for multi-delete"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Select</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowActionPopover(false);
                  onDeleteMessage?.(message);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-800/60 transition-colors cursor-pointer ml-auto"
                title="Delete this message"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Dedicated High-Z-Index Full Emoji Pack Modal Portal (100% visible, never cut off) */}
      {showEmojiPack && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[10001] bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={(e) => {
              e.stopPropagation();
              setShowEmojiPack(false);
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-x-0 bottom-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[10002] rounded-t-3xl sm:rounded-3xl bg-[#021e14] border border-amber-500/50 p-4 shadow-2xl backdrop-blur-2xl text-white w-full sm:w-[380px] max-w-full animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            style={{ filter: 'drop-shadow(0 25px 40px rgba(0, 0, 0, 0.95))' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-amber-500/25 mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-amber-200">Emoji Reactions Pack</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowEmojiPack(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 py-2 overflow-x-auto no-scrollbar">
              {EMOJI_PACK_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActivePackCategory(cat.id as any)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    activePackCategory === cat.id
                      ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50'
                      : 'text-slate-400 hover:text-slate-200 bg-emerald-950/70'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Large, Spacious Emoji Grid */}
            <div className="grid grid-cols-8 gap-1.5 p-2 bg-emerald-950/60 rounded-2xl max-h-56 overflow-y-auto">
              {EMOJI_PACK_CATEGORIES.find((c) => c.id === activePackCategory)?.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onAddReaction(message.id, emoji);
                    setShowEmojiPack(false);
                  }}
                  className="w-9 h-9 text-xl rounded-xl hover:bg-emerald-900 active:scale-95 flex items-center justify-center transition-transform hover:scale-125 cursor-pointer"
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="pt-2 text-center text-[11px] text-emerald-400/70">
              Tap any emoji to attach reaction to message
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
