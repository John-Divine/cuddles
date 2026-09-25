import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Check, X, Play, Pause, AlertCircle, Square, Send, RotateCcw } from 'lucide-react';
import { playRecordStartSound } from '../../lib/audio';

interface VideoNoteRecorderProps {
  onComplete: (
    videoBlobUrl: string,
    durationSeconds: number,
    posterUrl?: string,
    mimeType?: string,
    fileSizeBytes?: number
  ) => void;
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const recordedMimeRef = useRef<string>('video/webm');
  const totalRecordedBytesRef = useRef<number>(0);
  const posterDataUrlRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);

  // Stop current tracks and animations helper
  const stopTracks = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  // Capture center-cropped video frame to JPEG data URL so video note never renders dark
  const captureCurrentPoster = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 360;
      tempCanvas.height = 360;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        const vw = video.videoWidth || 480;
        const vh = video.videoHeight || 480;
        const size = Math.min(vw, vh);
        const sx = (vw - size) / 2;
        const sy = (vh - size) / 2;
        if (facingMode === 'user') {
          ctx.translate(360, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, sx, sy, size, size, 0, 0, 360, 360);
        const snap = tempCanvas.toDataURL('image/jpeg', 0.82);
        if (snap && snap.length > 200) {
          posterDataUrlRef.current = snap;
        }
      }
    } catch (err) {
      console.warn('Could not grab poster frame:', err);
    }
  };

  // Start Camera and start recording immediately
  const startCameraAndRecord = async () => {
    try {
      stopTracks();

      // Request mobile-optimized VGA constraints to keep file size small and hardware-accelerated
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 480, max: 720 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      mediaStreamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
        setTimeout(captureCurrentPoster, 400);
      }

      // Start recording immediately
      playRecordStartSound();
      chunksRef.current = [];
      totalRecordedBytesRef.current = 0;
      setSeconds(0);

      // Determine the browser's best native recording MIME type
      let preferredMime = '';
      if (typeof MediaRecorder !== 'undefined') {
        const candidateTypes = [
          'video/webm;codecs=vp8,opus',
          'video/webm;codecs=vp9,opus',
          'video/webm',
          'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
          'video/mp4;codecs=avc1',
          'video/mp4'
        ];
        for (const t of candidateTypes) {
          if (MediaRecorder.isTypeSupported(t)) {
            preferredMime = t;
            break;
          }
        }
      }

      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: 320000, // 320 kbps for clean mobile note (stays under 600KB)
        audioBitsPerSecond: 48000
      };
      if (preferredMime) {
        recorderOptions.mimeType = preferredMime;
      }

      // Record directly from hardware stream for perfect audio/video sync and zero canvas drops
      const recorder = new MediaRecorder(stream, recorderOptions);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
          totalRecordedBytesRef.current += e.data.size;
          // Firestore 1MB safety cap: 650KB binary leaves comfortable room for base64 + metadata
          if (totalRecordedBytesRef.current >= 650000) {
            console.log('Video note reached cloud storage size limit, finishing note...');
            stopRecording();
          }
        }
      };

      recorder.onstop = () => {
        captureCurrentPoster();
        // The real MIME type produced by the browser's MediaRecorder
        const actualMime = recorder.mimeType || preferredMime || 'video/webm';
        const containerMime = actualMime.toLowerCase().includes('webm') ? 'video/webm' : 'video/mp4';
        const blob = new Blob(chunksRef.current, { type: containerMime });
        recordedBlobRef.current = blob;
        recordedMimeRef.current = containerMime;
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
        captureCurrentPoster();
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
    captureCurrentPoster();
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
    const dur = Math.max(1, recordedDuration);
    const poster = posterDataUrlRef.current || undefined;
    const blob = recordedBlobRef.current;
    const mime = recordedMimeRef.current || 'video/webm';
    if (blob) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        onComplete(dataUrl, dur, poster, mime, blob.size);
      };
      reader.readAsDataURL(blob);
    } else if (reviewUrl) {
      onComplete(reviewUrl, dur, poster, mime, 0);
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
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * progressPercent) / 100;

  const content = (
    <div
      id="video-note-overlay"
      className="fixed inset-0 z-[999999] w-screen h-[100dvh] bg-slate-950/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 select-none animate-in fade-in duration-200"
    >
      {/* Top Bar with Cancel / Close Button */}
      <div className="w-full max-w-lg mx-auto flex items-center justify-between z-30 pt-2 sm:pt-4">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-rose-500/30 shadow-lg">
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
      <div className="flex-1 flex flex-col items-center justify-center my-auto z-20 min-h-0">
        {/* Viewfinder Circle Container - optimized size to prevent bottom overflow on mobile */}
        <div className="relative w-44 h-44 sm:w-60 sm:h-60 flex items-center justify-center">
          {/* Circular SVG Timer Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-30">
            <circle
              cx="50%"
              cy="50%"
              r="47%"
              className="stroke-slate-800/80"
              strokeWidth="5"
              fill="transparent"
            />
            {recordingState === 'recording' && (
              <circle
                cx="50%"
                cy="50%"
                r="47%"
                className="stroke-rose-500 transition-all duration-300"
                strokeWidth="5"
                strokeDasharray={2 * Math.PI * 100}
                strokeDashoffset={2 * Math.PI * 100 * (1 - progressPercent / 100)}
                strokeLinecap="round"
                fill="transparent"
              />
            )}
          </svg>

          {/* Inner Camera / Video Frame */}
          <div className="w-36 h-36 sm:w-52 sm:h-52 rounded-full overflow-hidden bg-slate-900 border-4 border-rose-500/40 shadow-2xl flex items-center justify-center relative">
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
                    <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center shadow-lg">
                      <Play className="w-6 h-6 text-white fill-white ml-0.5" />
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
              <div className="absolute bottom-2 sm:bottom-3 z-30 px-3 py-1 rounded-full bg-rose-600 text-white font-mono text-xs font-bold shadow-lg backdrop-blur-sm animate-pulse flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-white" />
                <span>0:{seconds.toString().padStart(2, '0')} / 1:00</span>
              </div>
            )}
          </div>
        </div>

        {/* Informative Guidance Caption */}
        <p className="text-xs text-white mt-3 font-semibold text-center bg-slate-900/95 px-4 py-1.5 rounded-full border border-slate-700 shadow-lg">
          {recordingState === 'recording'
            ? 'Recording circular note... Tap Stop when done'
            : 'Preview your video note before sending'}
        </p>
      </div>

      {/* Elevated Bottom Controls Bar - Raised high up above bottom screen & mobile home bar */}
      <div className="w-full max-w-sm mx-auto flex items-center justify-center pb-12 sm:pb-16 mb-4 sm:mb-6 z-30">
        {recordingState === 'recording' ? (
          <div className="flex items-center justify-center gap-8 w-full">
            {/* Cancel Button */}
            <button
              onClick={onCancel}
              className="flex flex-col items-center gap-1.5 text-xs text-slate-200 hover:text-white active:scale-95 transition-transform"
              title="Cancel recording"
            >
              <div className="p-3.5 rounded-full bg-slate-800 hover:bg-slate-700 border-2 border-slate-500 shadow-2xl transition-all">
                <X className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold tracking-wide">Cancel</span>
            </button>

            {/* Stop Recording Button (Prominent Center) */}
            <button
              onClick={stopRecording}
              className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform"
              title="Stop recording"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 flex items-center justify-center shadow-2xl shadow-rose-600/50 ring-4 ring-rose-400/50 transition-all">
                <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center shadow">
                  <Square className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                </div>
              </div>
              <span className="text-xs font-black text-white tracking-wide">Stop</span>
            </button>

            {/* Flip Camera Button */}
            <button
              onClick={handleFlipCamera}
              className="flex flex-col items-center gap-1.5 text-xs text-slate-200 hover:text-white active:scale-95 transition-transform"
              title="Flip camera"
            >
              <div className="p-3.5 rounded-full bg-slate-800 hover:bg-slate-700 border-2 border-slate-500 shadow-2xl text-white transition-all">
                <RefreshCw className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold tracking-wide">Flip</span>
            </button>
          </div>
        ) : (
          /* Review State Controls: Re-record or Send with high-contrast, large legible buttons */
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full px-4">
            <button
              onClick={handleRerecord}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-sm font-extrabold border-2 border-slate-500 shadow-2xl transition-all cursor-pointer ring-1 ring-white/10"
            >
              <RotateCcw className="w-4 h-4 text-white" />
              <span>Re-record</span>
            </button>

            <button
              onClick={handleSend}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 active:scale-95 text-white text-sm sm:text-base font-black shadow-2xl shadow-rose-600/50 ring-2 ring-white/20 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4 text-white fill-white" />
              <span>Send Video Note</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
