import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Share, PlusSquare, X } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed) return null;

  if (isInstallable) {
    return (
      <div className="bg-gradient-to-r from-indigo-900/90 via-purple-900/90 to-rose-900/90 text-white px-3.5 py-2 border-b border-indigo-500/20 flex items-center justify-between gap-3 text-xs sm:text-sm backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/30 flex items-center justify-center p-1">
            <img src="/icon.svg" alt="Cuddles" className="w-full h-full" />
          </div>
          <div>
            <span className="font-semibold text-white">Install Cuddles</span>
            <span className="hidden sm:inline text-slate-300 ml-1.5">— Fast private app access</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={install}
            className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Install
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-white p-1 rounded-md"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (isIOS) {
    return (
      <>
        <div className="bg-slate-900/90 border-b border-slate-800 text-slate-200 px-3.5 py-2 flex items-center justify-between text-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Share className="w-3.5 h-3.5 text-indigo-400" />
            <span>Install on iPhone/iPad for standalone experience</span>
          </div>
          <button
            onClick={() => setShowIOSGuide(true)}
            className="text-indigo-400 font-semibold underline underline-offset-2 hover:text-indigo-300"
          >
            How to Install
          </button>
        </div>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <Download className="w-4 h-4 text-rose-400" />
                  Install Cuddles on iOS
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-300">
                <div className="flex items-start gap-3 bg-slate-800/60 p-2.5 rounded-xl">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
                    <Share className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-white block font-medium">1. Tap Safari Share</strong>
                    Tap the Share button at the bottom of your Safari browser bar.
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-slate-800/60 p-2.5 rounded-xl">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-white block font-medium">2. Add to Home Screen</strong>
                    Scroll down in the action sheet and tap <strong>"Add to Home Screen"</strong>.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
