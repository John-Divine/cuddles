import React from 'react';
import { ShieldCheck, Lock, Heart, MessageSquare, Moon, Zap, Sparkles } from 'lucide-react';

interface WhatsAppSplashScreenProps {
  onStartNewChat?: () => void;
}

export const WhatsAppSplashScreen: React.FC<WhatsAppSplashScreenProps> = ({
  onStartNewChat
}) => {
  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 sm:p-10 bg-slate-950 text-slate-100 select-none relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute w-[450px] h-[450px] bg-rose-600/10 rounded-full blur-[140px] pointer-events-none -top-20 -right-20" />
      <div className="absolute w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none -bottom-10 -left-10" />

      <div className="relative max-w-md w-full flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Sanctuary Logo */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-rose-500 via-pink-600 to-indigo-600 p-0.5 shadow-2xl shadow-rose-500/30 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
              <Heart className="w-12 h-12 text-rose-500 fill-rose-500 animate-pulse" />
            </div>
          </div>
          <span className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 backdrop-blur-md">
            <ShieldCheck className="w-4 h-4" />
          </span>
        </div>

        {/* Brand Headline */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Cuddles Sanctuary
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
            Private, intimate messaging for you, your partner, and close circles.
          </p>
        </div>

        {/* Feature Badges */}
        <div className="w-full grid grid-cols-2 gap-2.5 pt-2 text-left">
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">256-Bit E2EE</p>
              <p className="text-[11px] text-slate-400">Zero cloud logging</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Quiet Delivery</p>
              <p className="text-[11px] text-slate-400">Smart schedule focus</p>
            </div>
          </div>
        </div>

        {/* Prompt */}
        <div className="pt-4 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 font-medium shadow-sm">
            <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
            <span>Select a conversation to start chatting</span>
          </div>

          {onStartNewChat && (
            <button
              type="button"
              onClick={onStartNewChat}
              className="mt-1 text-xs text-rose-400 hover:text-rose-300 underline font-semibold cursor-pointer transition-colors"
            >
              Or start a new connection
            </button>
          )}
        </div>

        {/* Bottom Lock Badge */}
        <div className="pt-6 flex items-center gap-1.5 text-[11px] text-slate-500">
          <Lock className="w-3 h-3 text-emerald-500" />
          <span>End-to-end encrypted with AES-GCM</span>
        </div>
      </div>
    </div>
  );
};
