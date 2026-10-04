import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { HeartbeatPulseEvent } from '../../types/intimacy';

interface HeartbeatPulseOverlayProps {
  pulse: HeartbeatPulseEvent | null;
  onClear: () => void;
}

export const HeartbeatPulseOverlay: React.FC<HeartbeatPulseOverlayProps> = ({ pulse, onClear }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pulse) {
      setVisible(true);
      // Play soft dual cardiac audio pulse using Web Audio API
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const playThump = (freq: number, delayMs: number) => {
            setTimeout(() => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.25);

              gain.gain.setValueAtTime(0.4, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.3);
            }, delayMs);
          };

          playThump(85, 50);
          playThump(70, 260);
          playThump(85, 750);
          playThump(70, 960);
        }
      } catch (err) {
        console.warn('Heartbeat audio feedback error', err);
      }

      const timer = setTimeout(() => {
        setVisible(false);
        onClear();
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [pulse, onClear]);

  if (!visible || !pulse) return null;

  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center overflow-hidden animate-in fade-in duration-300">
      {/* Ambient pink pulse overlay backdrop */}
      <div className="absolute inset-0 bg-rose-950/30 backdrop-blur-[2px] animate-pulse" />

      {/* Ripple Rings */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-64 h-64 rounded-full bg-rose-500/20 animate-ping duration-1000" />
        <div className="absolute w-44 h-44 rounded-full bg-pink-500/30 animate-pulse duration-700" />

        {/* Central glowing heart */}
        <div className="relative w-28 h-28 rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center shadow-2xl shadow-rose-600/70 scale-110 animate-bounce duration-500">
          <Heart className="w-14 h-14 text-white fill-white drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
        </div>
      </div>

      <div className="relative mt-6 px-4 py-2 rounded-full bg-slate-900/90 border border-rose-500/50 text-white text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
        <span>{pulse.senderName} sent you a live heartbeat pulse 💕</span>
      </div>
    </div>
  );
};
