import React, { useState, useEffect, useRef } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, X, Smartphone, Apple, Monitor, HelpCircle, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallBannerProps {
  onOpenModal?: () => void;
  autoHideSeconds?: number;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  onOpenModal,
  autoHideSeconds = 8,
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isMobile, platformName, install } = usePWAInstall();

  // Banner visibility states
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissedByUser, setIsDismissedByUser] = useState(false);
  const [timeLeft, setTimeLeft] = useState(autoHideSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [showModalInternal, setShowModalInternal] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // If already installed as standalone PWA, never render
  if (isInstalled) return null;

  // Auto-hide countdown timer (8 seconds default)
  useEffect(() => {
    if (!isVisible || isPaused || timeLeft <= 0 || installSuccess) return;

    timerRef.current = setTimeout(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsVisible(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isVisible, isPaused, timeLeft, installSuccess]);

  const handleOpenGuide = () => {
    if (onOpenModal) {
      onOpenModal();
    } else {
      setShowModalInternal(true);
    }
  };

  const handleInstallAction = async () => {
    // If the browser provided a direct beforeinstallprompt event
    if (isInstallable) {
      setIsInstalling(true);
      try {
        const success = await install();
        if (success) {
          setInstallSuccess(true);
          setTimeout(() => {
            setIsVisible(false);
          }, 2500);
          return;
        }
      } catch (err) {
        console.warn('Install error, opening walkthrough fallback:', err);
      } finally {
        setIsInstalling(false);
      }
    }

    // Fallback: If not directly triggerable (or user canceled prompt), open Chrome walkthrough
    handleOpenGuide();
  };

  const handleReopenBanner = () => {
    setIsVisible(true);
    setIsDismissedByUser(false);
    setTimeLeft(autoHideSeconds);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissedByUser(true);
  };

  const progressPercent = Math.max(0, Math.min(100, (timeLeft / autoHideSeconds) * 100));

  return (
    <>
      {/* 1. Floating Bottom Banner */}
      {isVisible && (
        <aside
          role="dialog"
          aria-label="Add Cuddles to Home Screen"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-[120] bg-slate-900/95 backdrop-blur-2xl border border-rose-500/40 shadow-2xl shadow-rose-950/70 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 text-white transition-all animate-in slide-in-from-bottom-5 fade-in duration-300"
        >
          {/* Top Row: App Icon, Content & Dismiss */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* App Icon with Ambient Ring */}
              <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 p-0.5 shadow-lg shadow-rose-500/30 shrink-0 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center p-1.5">
                  <img src="/icon.svg" alt="Cuddles" className="w-full h-full object-contain" />
                </div>
                {/* Micro badge */}
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
              </div>

              {/* Title & Copy */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-extrabold text-sm text-white tracking-tight">
                    Add Cuddles to Home Screen
                  </h4>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {isAndroid ? 'Android' : isIOS ? 'iPhone' : 'Web App'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug line-clamp-2">
                  {installSuccess
                    ? '🎉 Added! Launch Cuddles from your home screen anytime.'
                    : 'Tap to install on your phone for full-screen chats & private calls.'}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
              aria-label="Dismiss banner"
              title="Hide for now (you can tap the bottom icon to reopen)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Row */}
          {!installSuccess && (
            <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
              {/* Auto-hide countdown note */}
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                {isPaused ? (
                  <span className="text-amber-300 font-medium">Timer paused</span>
                ) : (
                  <span>Auto-hiding in <strong className="text-rose-300 font-semibold">{timeLeft}s</strong></span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Fallback guide button */}
                <button
                  type="button"
                  onClick={handleOpenGuide}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-slate-700/50"
                  title="How to install on Chrome or other browsers"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden xs:inline">Guide</span>
                </button>

                {/* Primary Install Button */}
                <button
                  type="button"
                  onClick={handleInstallAction}
                  disabled={isInstalling}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold shadow-md shadow-rose-500/30 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  {isInstalling ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      <span>Installing...</span>
                    </>
                  ) : (
                    <>
                      {isAndroid ? (
                        <Smartphone className="w-3.5 h-3.5" />
                      ) : isIOS ? (
                        <Apple className="w-3.5 h-3.5" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>Install App</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Success state display */}
          {installSuccess && (
            <div className="mt-2.5 flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/40 p-2 rounded-xl border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Installed! Check your phone's home screen or app drawer.</span>
            </div>
          )}

          {/* Micro 8-second progress line at very bottom */}
          {!installSuccess && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 overflow-hidden rounded-b-2xl sm:rounded-b-3xl">
              <div
                className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-rose-400 transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </aside>
      )}

      {/* 2. Reopen Floating Icon / Pill (when banner has auto-hidden or was dismissed) */}
      {!isVisible && (
        <button
          type="button"
          onClick={handleReopenBanner}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[110] group flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900/90 hover:bg-slate-900 border border-rose-500/50 shadow-xl shadow-rose-950/80 text-white backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer animate-in fade-in zoom-in-90"
          aria-label="Reopen Add to Home Screen prompt"
          title="Add Cuddles to your Home Screen"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 p-0.5 flex items-center justify-center shadow-sm">
            <Smartphone className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-bold text-slate-100 pr-1 group-hover:text-rose-300 transition-colors">
            Install App
          </span>
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        </button>
      )}

      {/* Embedded Modal if onOpenModal is not provided externally */}
      {!onOpenModal && (
        <PWAInstallModal
          isOpen={showModalInternal}
          onClose={() => setShowModalInternal(false)}
        />
      )}
    </>
  );
};
