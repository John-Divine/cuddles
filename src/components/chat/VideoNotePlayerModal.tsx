import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  RotateCcw,
  CheckCircle2,
  Heart,
  ShieldCheck,
  HardDrive,
  Sparkles
} from 'lucide-react';
import { Message } from '../../types';
import {
  downloadMediaToDeviceGallery,
  saveMediaToDeviceVault,
  getMediaFromDeviceVault
} from '../../lib/deviceMediaStorage';

interface VideoNotePlayerModalProps {
  message: Message;
  onClose: () => void;
  onDownloadAttachment?: (messageId: string) => void;
}

export const VideoNotePlayerModal: React.FC<VideoNotePlayerModalProps> = ({
  message,
  onClose,
  onDownloadAttachment
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(message.attachment?.durationSeconds || 0);
  const [isSaved, setIsSaved] = useState(!!message.attachment?.isDownloadedToDevice);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>(message.attachment?.url || '');
  const [isAutoplayMutedBlocked, setIsAutoplayMutedBlocked] = useState(false);

  // If initial URL is empty or was purged from cloud, look in local device vault
  useEffect(() => {
    async function checkVault() {
      if (!videoUrl) {
        const vaultData = await getMediaFromDeviceVault(message.id);
        if (vaultData) {
          setVideoUrl(vaultData);
        }
      }
    }
    checkVault();
  }, [message.id, videoUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted]);

  // Robust video autoplay handler with fallback if browser blocks unmuted audio
  useEffect(() => {
    if (videoRef.current && videoUrl) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsAutoplayMutedBlocked(false);
          })
          .catch((err) => {
            console.warn('Browser prevented unmuted autoplay, falling back to muted play:', err);
            if (videoRef.current) {
              videoRef.current.muted = true;
              setIsMuted(true);
              setIsAutoplayMutedBlocked(true);
              videoRef.current
                .play()
                .then(() => setIsPlaying(true))
                .catch(() => setIsPlaying(false));
            }
          });
      }
    }
  }, [videoUrl]);

  // When played by receiver, save to device vault & trigger ephemeral cloud purge
  useEffect(() => {
    if (videoUrl && !isSaved) {
      saveMediaToDeviceVault(
        message.id,
        videoUrl,
        'video_note',
        `cuddles_videonote_${message.id}.webm`
      );
      // Notify parent to purge cloud database payload
      onDownloadAttachment?.(message.id);
    }
  }, [message.id, videoUrl]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
    setIsAutoplayMutedBlocked(false);
  };

  const unmuteAndPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = false;
    setIsMuted(false);
    setIsAutoplayMutedBlocked(false);
    videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    const dur = videoRef.current.duration || duration || 1;
    setCurrentTime(curr);
    if (!duration && videoRef.current.duration) {
      setDuration(videoRef.current.duration);
    }
    setProgress((curr / dur) * 100);
  };

  const handleRestart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  const handleSaveToGallery = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoUrl) return;

    setStatusNotification('Saving to Gallery & Device Storage...');
    const filename = `cuddles_videonote_${Date.now()}.webm`;

    // 1. Save to device IndexedDB vault
    await saveMediaToDeviceVault(message.id, videoUrl, 'video_note', filename);

    // 2. Download directly to device photos/gallery/disk
    const res = await downloadMediaToDeviceGallery(videoUrl, filename, 'video/webm');

    // 3. Trigger cloud purge
    onDownloadAttachment?.(message.id);
    setIsSaved(true);
    setStatusNotification(res.success ? 'Saved to Gallery • Cloud Purged' : 'Saved to Device Vault');

    setTimeout(() => {
      setStatusNotification(null);
    }, 3500);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] w-screen h-screen bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-between p-4 sm:p-6 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div
        className="w-full max-w-lg flex items-center justify-between z-10 pt-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <img
            src={message.senderAvatar}
            alt={message.senderName}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-rose-500/80 shadow-md"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-sm sm:text-base">{message.senderName}</span>
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-rose-300/80">
              <span>Video Note</span>
              <span>•</span>
              <span>{message.timestamp}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Explicit Save to Gallery / Download File Button */}
          <button
            onClick={handleSaveToGallery}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg transition-all active:scale-95 ${
              isSaved
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
            title="Save video note to device gallery / storage"
          >
            {isSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
            <span>{isSaved ? 'Saved to Device' : 'Save to Gallery'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/60 shadow-lg"
            aria-label="Close video note"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {statusNotification && (
        <div className="fixed top-16 z-50 px-4 py-2 rounded-full bg-slate-900/90 border border-rose-500/40 text-rose-200 text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <HardDrive className="w-4 h-4 text-rose-400" />
          <span>{statusNotification}</span>
        </div>
      )}

      {/* Center: Circular Video Note Pop-Up */}
      <div
        className="relative flex flex-col items-center justify-center my-auto cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
      >
        {/* Animated outer glowing ring */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full p-2 bg-gradient-to-tr from-rose-500 via-pink-500 to-indigo-500 shadow-[0_0_50px_rgba(244,63,94,0.35)] flex items-center justify-center">
          {/* Circular SVG Progress Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="2"
            />
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="#fb7185"
              strokeWidth="3"
              strokeDasharray="301.6"
              strokeDashoffset={301.6 - (301.6 * progress) / 100}
              strokeLinecap="round"
              className="transition-all duration-100"
            />
          </svg>

          {/* Video Container */}
          <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center relative">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                loop
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-xs text-slate-400 p-4 text-center">Video preview loading...</div>
            )}

            {/* Tap to Unmute Overlay if browser blocked audio */}
            {isAutoplayMutedBlocked && (
              <button
                onClick={unmuteAndPlay}
                className="absolute top-4 px-3 py-1.5 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold shadow-lg backdrop-blur-md flex items-center gap-1.5 animate-bounce z-20"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>Tap to Unmute</span>
              </button>
            )}

            {/* Play/Pause Overlay on Click/Pause */}
            {!isPlaying && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-xl backdrop-blur-sm">
                  <Play className="w-7 h-7 fill-white ml-1" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Time Progress Label & Storage Status */}
        <div className="mt-4 flex items-center gap-2">
          <div className="px-3.5 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-xs font-mono text-slate-200">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-600/40 text-[11px] text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ephemeral Vault</span>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div
        className="w-full max-w-sm flex items-center justify-center gap-4 z-10 pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleRestart}
          className="p-3 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors border border-slate-700/60 shadow"
          title="Restart"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={togglePlay}
          className="p-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition-transform active:scale-95 shadow-xl shadow-rose-600/40"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
        </button>

        <button
          onClick={toggleMute}
          className={`p-3 rounded-full transition-colors border shadow ${
            isMuted
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700/60'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
