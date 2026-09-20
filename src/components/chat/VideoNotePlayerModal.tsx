import React, { useRef, useState, useEffect } from 'react';
import { X, Play, Pause, Volume2, VolumeX, RotateCcw, ShieldCheck, Heart } from 'lucide-react';
import { Message } from '../../types';

interface VideoNotePlayerModalProps {
  message: Message;
  onClose: () => void;
}

export const VideoNotePlayerModal: React.FC<VideoNotePlayerModalProps> = ({ message, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(message.attachment?.durationSeconds || 0);

  const videoUrl = message.attachment?.url;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
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
    videoRef.current.play();
    setIsPlaying(true);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
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

        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/60 shadow-lg"
          aria-label="Close video note"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

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
                autoPlay
                playsInline
                loop
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-xs text-slate-400 p-4 text-center">Video preview unavailable</div>
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

        {/* Time Progress Label */}
        <div className="mt-4 px-3.5 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-xs font-mono text-slate-200">
          {formatTime(currentTime)} / {formatTime(duration)}
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
          className="p-3 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors border border-slate-700/60 shadow"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};
