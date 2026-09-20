import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Check, X, Play, Pause, AlertCircle, Square, Send, RotateCcw } from 'lucide-react';
import { playRecordStartSound } from '../../lib/audio';

interface VideoNoteRecorderProps {
  onComplete: (videoBlobUrl: string, durationSeconds: number) => void;
  onCancel: () => void;
}

export const VideoNoteRecorder: React.FC<VideoNoteRecorderProps> = ({ onComplete, onCancel }) => {
  const [recordingState, setRecordingState] = useState<'recording' | 'review'>('recording');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [seconds, setSeconds] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [isPlayingReview, setIsPlayingReview] = useState(true);
  const [recordedDuration, setRecordedDuration] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Stop current tracks helper
  const stopTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  // Start Camera and start recording immediately
  const startCameraAndRecord = async () => {
    try {
      stopTracks();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 480 },
          height: { ideal: 480 },
          aspectRatio: 1
        },
        audio: true
      });

      mediaStreamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
      }

      // Start recording immediately
      playRecordStartSound();
      chunksRef.current = [];
      setSeconds(0);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setReviewUrl(url);
        setRecordedDuration((prev) => (prev > 0 ? prev : 1));
        setRecordingState('review');
        stopTracks();
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setRecordingState('recording');

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s >= 59) {
            // Reached the end (1 minute max)!
            setRecordedDuration(60);
            stopRecording();
            return 60;
          }
          const next = s + 1;
          setRecordedDuration(next);
          return next;
        });
      }, 1000);
    } catch (err) {
      console.warn('Camera/Mic permission error:', err);
      setHasPermission(false);
    }
  };

  useEffect(() => {
    startCameraAndRecord();
    return () => {
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [facingMode]);

  // Flip camera
  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Stop recording manually
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Re-record
  const handleRerecord = () => {
    if (reviewUrl) {
      URL.revokeObjectURL(reviewUrl);
      setReviewUrl(null);
    }
    setSeconds(0);
    setRecordedDuration(0);
    setRecordingState('recording');
    startCameraAndRecord();
  };

  // Confirm and send video note
  const handleSend = () => {
    if (reviewUrl) {
      onComplete(reviewUrl, Math.max(1, recordedDuration));
    }
  };

  const togglePlayReview = () => {
    if (!reviewVideoRef.current) return;
    if (isPlayingReview) {
      reviewVideoRef.current.pause();
      setIsPlayingReview(false);
    } else {
      reviewVideoRef.current.play();
      setIsPlayingReview(true);
    }
  };

  // 60-second circle circumference calculation
  const progressPercent = (seconds / 60) * 100;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * progressPercent) / 100;

  const content = (
    <div
      id="video-note-overlay"
      className="fixed inset-0 z-[999999] w-screen h-screen bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      {/* Top Bar with Cancel / Close Button */}
      <div className="absolute top-6 left-0 right-0 max-w-lg mx-auto px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-rose-500/30 shadow-lg">
          <div className={`w-2.5 h-2.5 rounded-full ${recordingState === 'recording' ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
          <span className="text-xs font-bold text-white tracking-wide">
            {recordingState === 'recording' ? 'Recording Video Note' : 'Review Video Note'}
          </span>
        </div>

        <button
          onClick={onCancel}
          className="p-2.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 shadow-lg active:scale-95 transition-all cursor-pointer"
          title="Cancel"
          aria-label="Cancel recording"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Center Area: Center Circle & Viewfinder */}
      <div className="flex flex-col items-center justify-center my-auto z-20">
        {/* Viewfinder Circle Container */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
          {/* Circular SVG Timer Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-30">
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              className="stroke-slate-800/80"
              strokeWidth="6"
              fill="transparent"
            />
            {recordingState === 'recording' && (
              <circle
                cx="50%"
                cy="50%"
                r={radius}
                className="stroke-rose-500 transition-all duration-300"
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            )}
          </svg>

          {/* Inner Camera / Video Frame */}
          <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-full overflow-hidden bg-slate-900 border-4 border-rose-500/40 shadow-2xl flex items-center justify-center relative">
            {hasPermission === false ? (
              <div className="p-4 text-center text-xs text-slate-300 flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 text-amber-400" />
                <p className="font-semibold text-white">Camera permission required</p>
                <p className="text-[11px] text-slate-400">Please grant camera and mic access to record video notes.</p>
                <button
                  onClick={startCameraAndRecord}
                  className="mt-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-lg active:scale-95"
                >
                  Retry Camera
                </button>
              </div>
            ) : recordingState === 'review' && reviewUrl ? (
              <div className="relative w-full h-full cursor-pointer" onClick={togglePlayReview}>
                <video
                  ref={reviewVideoRef}
                  src={reviewUrl}
                  playsInline
                  autoPlay
                  loop
                  onPlay={() => setIsPlayingReview(true)}
                  onPause={() => setIsPlayingReview(false)}
                  className="w-full h-full object-cover"
                />
                {!isPlayingReview && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center shadow-lg">
                      <Play className="w-7 h-7 text-white fill-white ml-1" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
              />
            )}

            {/* Live Recording Badge */}
            {recordingState === 'recording' && (
              <div className="absolute bottom-4 z-30 px-3 py-1 rounded-full bg-rose-600 text-white font-mono text-xs font-bold shadow-lg backdrop-blur-sm animate-pulse flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-white" />
                <span>0:{seconds.toString().padStart(2, '0')} / 1:00</span>
              </div>
            )}
          </div>
        </div>

        {/* Informative Guidance Caption */}
        <p className="text-xs text-slate-300 mt-5 font-medium text-center bg-slate-900/80 px-4 py-1.5 rounded-full border border-slate-700/60 shadow">
          {recordingState === 'recording'
            ? 'Recording circular note... Tap Stop when done or wait for 1:00'
            : 'Preview your video note before sending'}
        </p>
      </div>

      {/* Bottom Center Controls Bar */}
      <div className="w-full max-w-sm flex items-center justify-center gap-6 pb-8 z-30">
        {recordingState === 'recording' ? (
          <>
            {/* Cancel Button */}
            <button
              onClick={onCancel}
              className="flex flex-col items-center gap-1 text-xs text-slate-400 hover:text-white"
              title="Cancel recording"
            >
              <div className="p-3.5 rounded-full bg-slate-800/90 hover:bg-slate-700 active:scale-95 border border-slate-700 shadow-lg transition-all">
                <X className="w-5 h-5" />
              </div>
              <span className="font-semibold">Cancel</span>
            </button>

            {/* Stop Recording Button (Prominent Center) */}
            <button
              onClick={stopRecording}
              className="flex flex-col items-center gap-1.5 group"
              title="Stop recording"
            >
              <div className="w-18 h-18 rounded-full bg-gradient-to-tr from-rose-600 via-pink-600 to-rose-700 hover:from-rose-500 hover:to-pink-500 active:scale-90 flex items-center justify-center shadow-xl shadow-rose-600/40 transition-all ring-4 ring-rose-400/30">
                <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center shadow">
                  <Square className="w-4 h-4 text-rose-600 fill-rose-600" />
                </div>
              </div>
              <span className="text-xs font-bold text-white">Stop</span>
            </button>

            {/* Flip Camera Button */}
            <button
              onClick={handleFlipCamera}
              className="flex flex-col items-center gap-1 text-xs text-slate-300 hover:text-white"
              title="Flip camera"
            >
              <div className="p-3.5 rounded-full bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 shadow-lg transition-all">
                <RefreshCw className="w-5 h-5" />
              </div>
              <span className="font-semibold">Flip</span>
            </button>
          </>
        ) : (
          /* Review State Controls: Re-record or Send */
          <div className="flex items-center justify-center gap-4 w-full px-4">
            <button
              onClick={handleRerecord}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 shadow-lg transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Re-record
            </button>

            <button
              onClick={handleSend}
              className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 active:scale-95 text-white text-sm font-extrabold shadow-xl shadow-rose-600/40 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Send Video Note
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
