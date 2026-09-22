import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Sparkles, X, Smartphone, Monitor, Apple } from 'lucide-react';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallBannerProps {
  onOpenModal?: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ onOpenModal }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isDesktop, platformName, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showModalInternal, setShowModalInternal] = useState(false);

  // If already running as an installed standalone PWA or user dismissed this session
  if (isInstalled || dismissed) return null;

  const handleAction = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        if (onOpenModal) onOpenModal();
        else setShowModalInternal(true);
      }
    } else {
      if (onOpenModal) onOpenModal();
      else setShowModalInternal(true);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-rose-950/90 via-slate-900/95 to-pink-950/90 text-white px-3 sm:px-4 py-2 border-b border-rose-500/25 flex items-center justify-between gap-3 text-xs backdrop-blur-md relative z-40 transition-all">
        {/* Left info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 p-0.5 shadow-md shadow-rose-500/20 shrink-0 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center p-1">
              <img src="/icon.svg" alt="Cuddles" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-white tracking-tight">Install Cuddles Web App</span>
              <span className="hidden md:inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {platformName}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate">
              Add to home screen or desktop for fullscreen private chats & calls
            </p>
          </div>
        </div>

        {/* Right buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAction}
            className="flex items-center gap-1.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 active:scale-95 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 transition-all cursor-pointer"
          >
            {isIOS ? (
              <Apple className="w-3.5 h-3.5 text-white" />
            ) : isAndroid ? (
              <Smartphone className="w-3.5 h-3.5 text-white" />
            ) : (
              <Download className="w-3.5 h-3.5 text-white" />
            )}
            <span>Install App</span>
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
            aria-label="Dismiss install banner"
            title="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

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
