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
  Volume2,
  VolumeX,
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

  // Playback review state
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [caption, setCaption] = useState('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Custom Overlay Player Controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [showControlsOverlay, setShowControlsOverlay] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingSecondsRef = useRef(0);
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
      if (recordedVideoUrl && recordedVideoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
    };
  }, [facingMode, recordedVideoUrl]);

  // Start recording
  const handleStartRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    recordingSecondsRef.current = 0;
    setRecordingSeconds(0);

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
        setRecordedBlob(blob);

        // Crucial for mobile Chrome/Safari: Blob Object URL provides hardware-accelerated playback
        const blobUrl = URL.createObjectURL(blob);
        setRecordedVideoUrl(blobUrl);

        const duration = Math.max(recordingSecondsRef.current, 1);
        setRecordedDuration(duration);
        setVideoDuration(duration);
        setCurrentTime(0);
        setIsPlaying(true);
        setIsProcessing(false);

        // Stop live tracks while reviewing
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
          setStream(null);
        }
      };

      recorder.start(250); // 250ms time slice for reliability
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        recordingSecondsRef.current += 1;
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
    if (recordedVideoUrl && recordedVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
    setRecordedBlob(null);
    setRecordedVideoUrl(null);
    setRecordedDuration(0);
    setVideoDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setRecordingSeconds(0);
    setCaption('');
    startCamera();
  };

  // Send recorded video
  const handleSend = () => {
    if (!recordedBlob && !recordedVideoUrl) return;

    setIsProcessing(true);

    if (recordedBlob) {
      // Convert blob to Data URL for persistent offline storage and Firestore message payload
      const reader = new FileReader();
      reader.onloadend = () => {
        setIsProcessing(false);
        if (typeof reader.result === 'string') {
          onCapture(reader.result, recordedDuration || 1, caption.trim() || undefined);
          onClose();
        }
      };
      reader.readAsDataURL(recordedBlob);
    } else if (recordedVideoUrl) {
      onCapture(recordedVideoUrl, recordedDuration || 1, caption.trim() || undefined);
      setIsProcessing(false);
      onClose();
    }
  };

  // Flip camera between front and back
  const flipCamera = () => {
    if (isRecording) return;
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Custom Video Player Controls
  const togglePlayPause = () => {
    if (!reviewVideoRef.current) return;
    if (isPlaying) {
      reviewVideoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (reviewVideoRef.current.ended) {
        reviewVideoRef.current.currentTime = 0;
      }
      reviewVideoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(console.warn);
    }
  };

  const toggleMute = () => {
    if (!reviewVideoRef.current) return;
    const nextMuted = !isMuted;
    reviewVideoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (reviewVideoRef.current) {
      reviewVideoRef.current.currentTime = time;
    }
  };

  // Native fallback file picker
  const handleNativeVideoFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRecordedBlob(file);
    const blobUrl = URL.createObjectURL(file);
    setRecordedVideoUrl(blobUrl);
    setRecordedDuration(5);
    setVideoDuration(5);
    setCurrentTime(0);
    setIsPlaying(true);
    e.target.value = '';
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const modalContent = (
    <div className="fixed inset-y-0 right-0 left-0 lg:left-[22rem] z-50 flex items-center justify-center bg-black/95 p-0 sm:p-4 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg h-full sm:h-[92vh] sm:max-h-[820px] bg-slate-950 rounded-none sm:rounded-3xl overflow-hidden border-0 sm:border border-slate-800 shadow-2xl flex flex-col justify-between">
        {/* Top Control Bar */}
        <div className="absolute top-0 inset-x-0 p-3.5 sm:p-4 z-30 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/50 to-transparent">
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
        <div
          className="flex-1 w-full h-full relative flex items-center justify-center bg-black overflow-hidden select-none"
          onClick={() => recordedVideoUrl && setShowControlsOverlay((prev) => !prev)}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-3 text-slate-300 z-10">
              <Loader2 className="w-9 h-9 animate-spin text-rose-500" />
              <p className="text-xs font-semibold">Preparing video...</p>
            </div>
          ) : recordedVideoUrl ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              {/* Native video element with Blob URL */}
              <video
                ref={reviewVideoRef}
                src={recordedVideoUrl}
                playsInline
                autoPlay
                muted={isMuted}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={() => {
                  if (reviewVideoRef.current) {
                    setCurrentTime(reviewVideoRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => {
                  if (reviewVideoRef.current) {
                    const dur = reviewVideoRef.current.duration;
                    if (dur && isFinite(dur) && dur > 0) {
                      setVideoDuration(dur);
                    }
                  }
                }}
                onEnded={() => {
                  setIsPlaying(false);
                  setShowControlsOverlay(true);
                }}
                className="max-h-full max-w-full w-full h-full object-contain"
              />

              {/* Big Center Play / Pause Touch Overlay */}
              {(!isPlaying || showControlsOverlay) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayPause();
                    }}
                    className="pointer-events-auto w-16 h-16 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white backdrop-blur-md flex items-center justify-center shadow-2xl ring-4 ring-white/30 active:scale-90 transition-transform cursor-pointer"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="w-7 h-7 text-white fill-white" />
                    ) : (
                      <Play className="w-7 h-7 text-white fill-white ml-1" />
                    )}
                  </button>
                </div>
              )}

              {/* Custom Bottom Scrub Controls Bar */}
              <div
                className={`absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/75 to-transparent z-20 transition-opacity duration-200 ${
                  showControlsOverlay || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Timeline Scrubber Slider */}
                <div className="flex items-center gap-3 mb-2">
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    className="p-1.5 rounded-lg text-white hover:bg-white/20 transition-colors"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                  </button>

                  <div className="flex-1 relative flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={videoDuration || recordedDuration || 1}
                      step={0.05}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-1.5 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:accent-rose-400 focus:outline-none"
                    />
                  </div>

                  {/* Monospace Time Counter */}
                  <span className="font-mono text-[11px] text-slate-300 font-semibold tracking-wider shrink-0">
                    {formatTimer(currentTime)} / {formatTimer(videoDuration || recordedDuration)}
                  </span>

                  {/* Mute/Unmute audio */}
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1.5 rounded-lg text-white hover:bg-white/20 transition-colors"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
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
        <div className="p-3.5 sm:p-5 bg-gradient-to-t from-black via-black/95 to-transparent z-30">
          {recordedVideoUrl ? (
            <div className="space-y-3">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption... (optional)"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-rose-500 transition-colors"
              />

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold active:scale-95 transition-all cursor-pointer border border-slate-700/60"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retake</span>
                </button>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-500/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Video...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Video</span>
                    </>
                  )}
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
