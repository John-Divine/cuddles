import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Download,
  RotateCcw,
  CheckCircle2,
  HardDrive,
  Film,
  Sparkles,
  PictureInPicture2
} from 'lucide-react';
import { Message } from '../../types';
import {
  downloadMediaToDeviceGallery,
  saveMediaToDeviceVault,
  getMediaFromDeviceVault
} from '../../lib/deviceMediaStorage';

interface VideoPlayerModalProps {
  message: Message;
  onClose: () => void;
  onDownloadAttachment?: (messageId: string) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  message,
  onClose,
  onDownloadAttachment
}) => {
  const [videoSrc, setVideoSrc] = useState<string>(message.attachment?.url || '');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(message.attachment?.durationSeconds || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isSaved, setIsSaved] = useState(!!message.attachment?.isDownloadedToDevice);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  // If initial URL is empty or purged, attempt to retrieve from device IndexedDB vault
  useEffect(() => {
    async function loadFromVault() {
      if (!videoSrc) {
        const localData = await getMediaFromDeviceVault(message.id);
        if (localData) {
          setVideoSrc(localData);
        }
      }
    }
    loadFromVault();
  }, [message.id, videoSrc]);

  useEffect(() => {
    if (videoRef.current && videoSrc) {
      videoRef.current.load();
    }
  }, [videoSrc]);

  // Handle keyboard shortcuts
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
      if (e.key === 'ArrowRight') {
        if (videoRef.current) videoRef.current.currentTime += 5;
      }
      if (e.key === 'ArrowLeft') {
        if (videoRef.current) videoRef.current.currentTime -= 5;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted]);

  // Attempt autoplay safely (handling browser unmuted policy rejection)
  useEffect(() => {
    if (videoRef.current) {
      const p = videoRef.current.play();
      if (p !== undefined) {
        p.then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.warn('Autoplay unmuted blocked by browser, muting:', err);
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          }
        });
      }
    }
  }, [videoSrc]);

  // Auto-hide controls when mouse is idle
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    if (!duration && videoRef.current.duration) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP error:', e);
    }
  };

  const handleSaveToDevice = async () => {
    if (!videoSrc) return;
    setToastMessage('Saving video to Device Gallery...');
    const filename = message.attachment?.fileName || `cuddles_video_${Date.now()}.mp4`;

    await saveMediaToDeviceVault(message.id, videoSrc, 'video', filename);
    const res = await downloadMediaToDeviceGallery(videoSrc, filename, message.attachment?.mimeType || 'video/mp4');

    onDownloadAttachment?.(message.id);
    setIsSaved(true);
    setToastMessage(res.success ? 'Saved to Gallery & Disk' : 'Saved to Device Vault');

    setTimeout(() => setToastMessage(null), 3000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[999999] w-screen h-screen bg-black/95 backdrop-blur-2xl flex flex-col justify-between select-none animate-in fade-in duration-200"
      onMouseMove={handleMouseMove}
      onClick={togglePlay}
    >
      {/* Top Header Bar */}
      <div
        className={`w-full max-w-5xl mx-auto p-4 sm:p-6 flex items-center justify-between z-30 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <img
            src={message.senderAvatar}
            alt={message.senderName}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-rose-500/80 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm sm:text-base">{message.senderName}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-semibold">
                <Film className="w-3 h-3" />
                Video
              </span>
            </div>
            <span className="text-xs text-slate-400 block">
              {message.attachment?.fileName || 'Attached Video File'} • {message.timestamp}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save to Device / Gallery */}
          <button
            onClick={handleSaveToDevice}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg active:scale-95 transition-all ${
              isSaved
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
            title="Download & Save to Device Gallery"
          >
            {isSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
            <span>{isSaved ? 'Saved to Device' : 'Save to Gallery'}</span>
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 shadow-lg cursor-pointer"
            title="Close video"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <HardDrive className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Center Video Area */}
      <div className="flex-1 w-full max-w-5xl mx-auto flex items-center justify-center p-2 sm:p-6 relative">
        <video
          ref={videoRef}
          src={videoSrc}
          playsInline
          loop
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl ring-1 ring-white/10"
        />

        {/* Big play overlay when paused */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-2xl backdrop-blur-md animate-in zoom-in-95 duration-150">
              <Play className="w-9 h-9 fill-white ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div
        className={`w-full max-w-3xl mx-auto p-4 sm:p-6 z-30 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-xl shadow-2xl space-y-2.5">
          {/* Seek Bar */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-slate-400 min-w-[35px]">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <span className="text-[11px] font-mono text-slate-400 min-w-[35px]">
              {formatTime(duration)}
            </span>
          </div>

          {/* Buttons Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow active:scale-95 transition-all"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              {/* Restart */}
              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    videoRef.current.play();
                    setIsPlaying(true);
                  }
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Restart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Volume / Mute */}
              <div className="flex items-center gap-1.5 group/vol">
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Speed Rate Button */}
              <button
                onClick={cycleSpeed}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                title="Playback Speed"
              >
                {playbackRate}x
              </button>

              {/* Picture in Picture */}
              <button
                onClick={togglePiP}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Picture in Picture"
              >
                <PictureInPicture2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
