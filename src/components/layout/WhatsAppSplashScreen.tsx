import React from 'react';
import { ShieldCheck, Lock, Moon, Sparkles, MessageSquare } from 'lucide-react';
import { AkomaIcon, OdoNnyewFieKwanIcon, AfricanGeometricDivider } from '../common/AdinkraIcons';

interface WhatsAppSplashScreenProps {
  onStartNewChat?: () => void;
}

export const WhatsAppSplashScreen: React.FC<WhatsAppSplashScreenProps> = ({
  onStartNewChat
}) => {
  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 sm:p-10 bg-[#02140e] text-emerald-50 select-none relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute w-[450px] h-[450px] bg-emerald-600/15 rounded-full blur-[140px] pointer-events-none -top-20 -right-20" />
      <div className="absolute w-[350px] h-[350px] bg-amber-500/15 rounded-full blur-[120px] pointer-events-none -bottom-10 -left-10" />

      <div className="relative max-w-md w-full flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Sacred Sanctuary Logo */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-0.5 shadow-2xl shadow-amber-500/25 flex items-center justify-center">
            <div className="w-full h-full bg-[#021810] rounded-[22px] flex items-center justify-center">
              <AkomaIcon className="w-13 h-13" color="#fbbf24" strokeWidth={2.4} />
            </div>
          </div>
          <span className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 backdrop-blur-md">
            <ShieldCheck className="w-4 h-4" />
          </span>
        </div>

        {/* Brand Headline */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 tracking-tight">
            Cuddles Royal Sanctuary
          </h1>
          <p className="text-xs sm:text-sm text-amber-200/80 leading-relaxed max-w-sm mx-auto flex items-center justify-center gap-1.5">
            <OdoNnyewFieKwanIcon className="w-4 h-4 text-amber-400 shrink-0" color="#f59e0b" />
            <span>Odo Nnyew Fie Kwan • Love never loses its way home</span>
          </p>
        </div>

        <AfricanGeometricDivider className="w-40" />

        {/* Feature Badges */}
        <div className="w-full grid grid-cols-2 gap-2.5 pt-1 text-left">
          <div className="p-3 rounded-2xl bg-emerald-950/70 border border-amber-500/25 flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-200">Sacred 256-Bit E2EE</p>
              <p className="text-[11px] text-emerald-300/70">Zero cloud logging</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-950/70 border border-amber-500/25 flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300 shrink-0">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-200">Quiet Delivery</p>
              <p className="text-[11px] text-emerald-300/70">Schedule focus</p>
            </div>
          </div>
        </div>

        {/* Prompt */}
        <div className="pt-2 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-950/90 border border-amber-500/30 text-xs text-amber-200/90 font-medium shadow-sm">
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>Select a conversation to enter your sanctuary</span>
          </div>

          {onStartNewChat && (
            <button
              type="button"
              onClick={onStartNewChat}
              className="mt-1 text-xs text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer transition-colors"
            >
              Start a new connection
            </button>
          )}
        </div>

        {/* Bottom Lock Badge */}
        <div className="pt-4 flex items-center gap-1.5 text-[11px] text-emerald-400/60">
          <Lock className="w-3 h-3 text-amber-400/80" />
          <span>Sacred End-to-end encrypted sanctuary</span>
        </div>
      </div>
    </div>
  );
};
