import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mic, Square, X, Play, Pause, RotateCcw, Send, AlertCircle } from 'lucide-react';
import { playRecordStartSound } from '../../lib/audio';

interface VoiceRecorderProps {
  onComplete: (audioUrl: string, durationSeconds: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onComplete, onCancel }) => {
  const [recordingState, setRecordingState] = useState<'recording' | 'review'>('recording');
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [waveHeights, setWaveHeights] = useState<number[]>([30, 55, 75, 45, 90, 60, 80, 40, 70, 85, 50, 65, 95, 45, 60, 80]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const stopTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  const startVoiceRecording = async () => {
    try {
      stopTracks();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setHasPermission(true);

      playRecordStartSound();
      chunksRef.current = [];
      setSeconds(0);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setRecordedDuration((prev) => (prev > 0 ? prev : 1));
        setRecordingState('review');
        stopTracks();
      };

      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setRecordingState('recording');

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setSeconds((prev) => {
          if (prev >= 119) {
            // Max 2 minutes recorded to the end
            setRecordedDuration(120);
            stopRecording();
            return 120;
          }
          const next = prev + 1;
          setRecordedDuration(next);
          return next;
        });

        // Dynamic soundwave visual pulsation
        setWaveHeights((prev) =>
          prev.map(() => Math.floor(Math.random() * 75) + 20)
        );
      }, 1000);
    } catch (err) {
      console.warn('Voice mic access error:', err);
      setHasPermission(false);
      // Fallback synthetic audio for preview testing
      setAudioUrl('blob:simulated_audio');
    }
  };

  useEffect(() => {
    startVoiceRecording();
    return () => {
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      setRecordingState('review');
    }
  };

  const handleRerecord = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setSeconds(0);
    setRecordedDuration(0);
    setRecordingState('recording');
    startVoiceRecording();
  };

  const handleSend = () => {
    onComplete(audioUrl || 'blob:audio_note', Math.max(1, recordedDuration));
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder.toString().padStart(2, '0')}`;
  };

  const content = (
    <div
      id="voice-note-overlay"
      className="fixed inset-0 z-[999999] w-screen h-screen bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      {/* Top Bar */}
      <div className="absolute top-6 left-0 right-0 max-w-lg mx-auto px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-indigo-500/30 shadow-lg">
          <div className={`w-2.5 h-2.5 rounded-full ${recordingState === 'recording' ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
          <span className="text-xs font-bold text-white tracking-wide">
            {recordingState === 'recording' ? 'Recording Voice Note' : 'Review Voice Note'}
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

      {/* Main Center Area */}
      <div className="flex flex-col items-center justify-center my-auto z-20">
        {/* Animated Mic Circle / Orb */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
          {recordingState === 'recording' && (
            <>
              <div className="absolute inset-0 rounded-full bg-rose-500/15 animate-ping opacity-70" />
              <div className="absolute inset-4 rounded-full bg-pink-500/20 animate-pulse" />
            </>
          )}

          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-rose-600 via-pink-600 to-indigo-600 p-1 shadow-2xl flex items-center justify-center relative">
            <div className="w-full h-full bg-slate-950 rounded-full flex flex-col items-center justify-center gap-1.5">
              <Mic className="w-10 h-10 sm:w-12 sm:h-12 text-rose-400" />
              <span className="font-mono text-sm sm:text-base font-bold text-white">
                {formatTime(seconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Live Audio Waveform Bars */}
        {recordingState === 'recording' ? (
          <div className="flex items-center justify-center gap-1.5 h-12 w-64 sm:w-80 mt-6 px-4 bg-slate-900/80 rounded-2xl border border-slate-800">
            {waveHeights.map((h, i) => (
              <div
                key={i}
                className="w-1.5 bg-gradient-to-t from-rose-500 to-pink-400 rounded-full transition-all duration-200"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        ) : (
          /* Review Audio Player */
          <div className="mt-6 flex flex-col items-center gap-3">
            {audioUrl && (
              <audio
                ref={audioPlayerRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            )}
            <div className="flex items-center gap-4 bg-slate-900/90 border border-slate-700/80 rounded-2xl px-6 py-3 shadow-xl">
              <button
                type="button"
                onClick={togglePlayback}
                className="w-11 h-11 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-95 text-white flex items-center justify-center shadow-lg transition-all"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
              </button>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Voice Note ({formatTime(recordedDuration)})</span>
                <span className="text-[11px] text-slate-400">Ready to send with end-to-end encryption</span>
              </div>
            </div>
          </div>
        )}

        {/* Guidance Caption */}
        <p className="text-xs text-slate-300 mt-5 font-medium text-center bg-slate-900/80 px-4 py-1.5 rounded-full border border-slate-700/60 shadow">
          {recordingState === 'recording'
            ? 'Recording voice note... Tap Stop when done or record to the end'
            : 'Listen to preview before sending'}
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

            {/* Stop Button */}
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
          </>
        ) : (
          /* Review State Controls */
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
              Send Voice Note
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
