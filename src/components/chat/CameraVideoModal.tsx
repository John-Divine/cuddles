import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Video,
  X,
  RotateCcw,
  RefreshCw,
  Send,
  AlertCircle,
  Play,
  Pause,
  Loader2
} from 'lucide-react';

interface CameraVideoModalProps {
  onCapture: (videoUrl: string, durationSeconds: number, caption?: string) => void;
  onClose: () => void;
}

export const CameraVideoModal: React.FC<CameraVideoModalProps> = ({
  onCapture,
  onClose
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [caption, setCaption] = useState('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputFallbackRef = useRef<HTMLInputElement | null>(null);

  // Initialize camera and microphone stream
  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });

      setStream(newStream);
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.muted = true; // prevent acoustic feedback during live viewfinder
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Camera/Mic video recording access issue:', err);
      setHasPermission(false);
    }
  };

  useEffect(() => {
    if (!recordedVideoUrl) {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [facingMode, recordedVideoUrl]);

  // Start recording
  const handleStartRecording = () => {
    if (!stream) return;
    chunksRef.current = [];

    // Preferred MIME type detection
    const mimeTypes = [
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm',
      'video/mp4'
    ];
    let selectedMime = '';
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMime = mime;
        break;
      }
    }

    try {
      const recorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        setIsProcessing(true);
        const actualMime = recorder.mimeType || selectedMime || 'video/webm';
        const blob = new Blob(chunksRef.current, { type: actualMime });

        // Convert to data URL for persistent offline storage and cross-device sync
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setRecordedVideoUrl(reader.result);
            setRecordedDuration(recordingSeconds);
          }
          setIsProcessing(false);
        };
        reader.readAsDataURL(blob);

        // Stop live tracks while reviewing
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
          setStream(null);
        }
      };

      recorder.start(500); // 500ms time slice for reliability
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
    }
  };

  // Stop recording
  const handleStopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Retake video
  const handleRetake = () => {
    setRecordedVideoUrl(null);
    setRecordedDuration(0);
    setRecordingSeconds(0);
    setCaption('');
    startCamera();
  };

  // Send recorded video
  const handleSend = () => {
    if (recordedVideoUrl) {
      onCapture(recordedVideoUrl, recordedDuration || 1, caption.trim() || undefined);
      onClose();
    }
  };

  // Flip camera between front and back
  const flipCamera = () => {
    if (isRecording) return;
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Native fallback file picker
  const handleNativeVideoFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRecordedVideoUrl(reader.result);
        setRecordedDuration(5);
      }
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-2 sm:p-4 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg h-[92vh] max-h-[820px] bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col justify-between">
        {/* Top Control Bar */}
        <div className="absolute top-0 inset-x-0 p-4 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Video className="w-4 h-4" />
            </span>
            <span className="text-white text-xs font-bold tracking-wide">
              {recordedVideoUrl ? 'Preview Video' : isRecording ? 'Recording Video' : 'Camera Video'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!recordedVideoUrl && !isRecording && (
              <button
                type="button"
                onClick={flipCamera}
                className="p-2.5 rounded-full bg-black/50 text-white hover:bg-black/75 border border-white/10 active:scale-95 transition-all cursor-pointer"
                title="Flip Camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-full bg-black/50 text-white hover:bg-black/75 border border-white/10 active:scale-95 transition-all cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewfinder or Video Preview Area */}
        <div className="flex-1 w-full h-full relative flex items-center justify-center bg-black overflow-hidden">
          {isProcessing ? (
            <div className="flex flex-col items-center gap-3 text-slate-300">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
              <p className="text-xs font-semibold">Processing video...</p>
            </div>
          ) : recordedVideoUrl ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video
                ref={reviewVideoRef}
                src={recordedVideoUrl}
                controls
                autoPlay
                playsInline
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : hasPermission === false ? (
            <div className="p-6 text-center max-w-xs space-y-4">
              <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
              <p className="text-sm font-semibold text-white">Camera or Microphone Access Needed</p>
              <p className="text-xs text-slate-400">
                Please allow camera and mic permissions in your browser or record with your device camera below.
              </p>
              <button
                type="button"
                onClick={() => fileInputFallbackRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/30"
              >
                Use Device Camera
              </button>
              <input
                ref={fileInputFallbackRef}
                type="file"
                accept="video/*"
                capture="environment"
                onChange={handleNativeVideoFallback}
                className="hidden"
              />
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
          )}

          {/* Recording Timer Overlay */}
          {isRecording && (
            <div className="absolute top-16 inset-x-0 flex justify-center z-20 pointer-events-none">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-950/80 border border-rose-500/60 backdrop-blur-md shadow-lg shadow-rose-950/50">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-white font-mono text-xs font-bold tracking-wider">
                  {formatTimer(recordingSeconds)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Controls */}
        <div className="p-4 sm:p-5 bg-gradient-to-t from-black via-black/90 to-transparent z-20">
          {recordedVideoUrl ? (
            <div className="space-y-3">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption... (optional)"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-rose-500"
              />

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retake</span>
                </button>

                <button
                  type="button"
                  onClick={handleSend}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-500/30 active:scale-95 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Video</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-8 py-2">
              {/* Shutter Button */}
              <button
                type="button"
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`relative flex items-center justify-center transition-all cursor-pointer ${
                  isRecording ? 'scale-105' : 'hover:scale-105 active:scale-95'
                }`}
                title={isRecording ? 'Stop Recording' : 'Start Recording'}
              >
                <div
                  className={`w-18 h-18 rounded-full border-4 flex items-center justify-center transition-all ${
                    isRecording
                      ? 'border-rose-500 bg-rose-500/20'
                      : 'border-white/80 bg-white/10'
                  }`}
                >
                  <div
                    className={`transition-all ${
                      isRecording
                        ? 'w-7 h-7 rounded-md bg-rose-500'
                        : 'w-14 h-14 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50'
                    }`}
                  />
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
