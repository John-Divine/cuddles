import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  X,
  RotateCcw,
  RefreshCw,
  Send,
  Sparkles,
  AlertCircle,
  Grid,
  Zap,
  Check,
  Smile
} from 'lucide-react';

interface CameraCaptureModalProps {
  onCapture: (imageDataUrl: string, caption?: string) => void;
  onClose: () => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  onCapture,
  onClose
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [flashAnimation, setFlashAnimation] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputFallbackRef = useRef<HTMLInputElement | null>(null);

  // Initialize camera stream
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
        audio: false
      });

      setStream(newStream);
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Camera access issue:', err);
      setHasPermission(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode]);

  // Handle snap photo
  const takePhoto = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);
    setFlashAnimation(true);
    setTimeout(() => setFlashAnimation(false), 250);

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // If user facing front camera, flip horizontally for natural mirror look
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.80);
      setCapturedImage(dataUrl);

      // Stop camera preview while reviewing
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
    }
    setIsCapturing(false);
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    setCaption('');
    startCamera();
  };

  // Send photo
  const handleSend = () => {
    if (capturedImage) {
      onCapture(capturedImage, caption.trim() || undefined);
      onClose();
    }
  };

  // Fallback native file capture (works on phones that prefer native camera)
  const handleNativeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCapturedImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const content = (
    <div className="fixed inset-0 z-[999999] w-screen h-screen bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-between p-3 sm:p-6 select-none animate-in fade-in duration-200">
      {/* Hidden fallback canvas and input */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        ref={fileInputFallbackRef}
        accept="image/*"
        capture="environment"
        onChange={handleNativeFileChange}
        className="hidden"
      />

      {/* Top Controls Bar */}
      <div className="w-full max-w-lg flex items-center justify-between z-20 pt-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white text-sm">
              {capturedImage ? 'Review Photo' : 'Take a Photo'}
            </span>
            <span className="text-[11px] text-rose-300 block">
              {capturedImage ? 'Add caption & send' : 'End-to-End Encrypted Photo'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!capturedImage && (
            <>
              {/* Grid Toggle */}
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-2 rounded-full border transition-colors ${
                  showGrid
                    ? 'bg-rose-600/40 text-rose-300 border-rose-500/50'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-white'
                }`}
                title="Toggle composition grid"
              >
                <Grid className="w-4 h-4" />
              </button>

              {/* Flip camera */}
              <button
                onClick={flipCamera}
                className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
                title="Switch Front/Rear Camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Close modal */}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Flash animation overlay */}
      {flashAnimation && (
        <div className="fixed inset-0 bg-white z-50 pointer-events-none animate-out fade-out duration-250" />
      )}

      {/* Center Viewfinder / Preview Frame */}
      <div className="relative flex-1 w-full max-w-lg my-auto max-h-[70vh] flex items-center justify-center rounded-3xl overflow-hidden bg-slate-900 border-2 border-rose-500/30 shadow-2xl">
        {hasPermission === false && !capturedImage ? (
          <div className="p-6 text-center flex flex-col items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-white text-base">Camera Access Blocked</h4>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Please allow camera permissions in your browser, or tap below to snap with your device camera directly.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Retry Access
              </button>
              <button
                onClick={() => fileInputFallbackRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-bold shadow-lg"
              >
                Open Device Camera
              </button>
            </div>
          </div>
        ) : capturedImage ? (
          // Review Snapped Photo
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <img
              src={capturedImage}
              alt="Captured"
              className="max-w-full max-h-full object-contain rounded-2xl"
            />
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Photo Captured</span>
            </div>
          </div>
        ) : (
          // Live Camera Viewfinder
          <div className="relative w-full h-full bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {/* Optional Rule of Thirds Grid */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10 opacity-30">
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-white" />
                <div className="border-r border-white" />
                <div />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls Area */}
      <div className="w-full max-w-lg z-20 pb-2 space-y-3">
        {capturedImage ? (
          // Caption and Send Row
          <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-2 bg-slate-900/90 border border-rose-500/40 rounded-2xl px-3 py-2 backdrop-blur-md shadow-lg">
              <Sparkles className="w-4 h-4 text-rose-400 shrink-0" />
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
                placeholder="Add a sweet caption (optional)..."
                className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handleRetake}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700/80 transition-all active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake</span>
              </button>

              <button
                onClick={handleSend}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-sm shadow-xl shadow-rose-950/40 active:scale-95 transition-all"
              >
                <span>Send Photo</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          // Live Shutter Control
          <div className="flex items-center justify-around">
            <button
              onClick={() => fileInputFallbackRef.current?.click()}
              className="text-xs text-slate-400 hover:text-white px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60"
              title="Use Native System Camera"
            >
              Native Camera
            </button>

            {/* Big Shutter Button */}
            <button
              onClick={takePhoto}
              disabled={isCapturing}
              className="w-20 h-20 rounded-full bg-white/20 p-1.5 border-4 border-white flex items-center justify-center shadow-2xl active:scale-90 hover:scale-105 transition-transform cursor-pointer"
              title="Snap Photo"
              aria-label="Take Photo"
            >
              <div className="w-full h-full rounded-full bg-rose-500 hover:bg-rose-600 transition-colors shadow-inner" />
            </button>

            <button
              onClick={flipCamera}
              className="text-xs text-slate-400 hover:text-white px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Flip</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
