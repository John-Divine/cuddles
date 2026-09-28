import React from 'react';
import { Heart, ShieldCheck, Lock, Sparkles, MessageCircle, Moon } from 'lucide-react';

interface EmptyChatSplashProps {
  onOpenAddContact?: () => void;
  onOpenMediaGallery?: () => void;
}

export const EmptyChatSplash: React.FC<EmptyChatSplashProps> = ({
  onOpenAddContact,
  onOpenMediaGallery,
}) => {
  return (
    <div className="flex-1 hidden lg:flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-l border-rose-950/40 relative overflow-hidden select-none">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full flex flex-col items-center text-center space-y-6">
        {/* Animated Brand Emblem */}
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-rose-500/20 via-pink-500/30 to-rose-500/20 rounded-full blur-md animate-pulse" />
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-rose-500/20 via-pink-600/30 to-purple-600/20 border border-rose-500/30 flex items-center justify-center shadow-xl shadow-rose-950/50">
            <Heart className="w-12 h-12 text-rose-400 fill-rose-500/30 drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-900 border border-rose-500/40 flex items-center justify-center shadow-md">
            <Sparkles className="w-4 h-4 text-pink-400" />
          </div>
        </div>

        {/* Title & Tagline */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>Cuddles Private Sanctuary</span>
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
            Your end-to-end encrypted romantic & private sanctuary. Select a conversation from the sidebar to start chatting.
          </p>
        </div>

        {/* Feature Highlights Pills */}
        <div className="grid grid-cols-2 gap-2.5 w-full pt-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800/80 text-left">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">Zero Footprint</p>
              <p className="text-[11px] text-slate-400 truncate">Auto-purged cloud media</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800/80 text-left">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">Device Vault</p>
              <p className="text-[11px] text-slate-400 truncate">Encrypted local media</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800/80 text-left">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
              <Moon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">Quiet Delivery</p>
              <p className="text-[11px] text-slate-400 truncate">Respects busy schedules</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800/80 text-left">
            <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 shrink-0">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">Read Receipts</p>
              <p className="text-[11px] text-slate-400 truncate">Rose-pink seen ticks</p>
            </div>
          </div>
        </div>

        {/* Bottom Encryption Footnote */}
        <div className="pt-6 border-t border-slate-800/60 w-full flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <Lock className="w-3.5 h-3.5 text-emerald-500" />
          <span>256-bit AES-GCM Encrypted &bull; No Chat History Stored In Plaintext</span>
        </div>
      </div>
    </div>
  );
};
