import React, { useState } from 'react';
import {
  Download,
  Share,
  PlusSquare,
  X,
  Smartphone,
  Monitor,
  Apple,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { usePWAInstall, PlatformType } from '../../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install, platformType, platformName } = usePWAInstall();

  // Tab state, defaulting to detected platform
  const initialTab: 'ios' | 'android' | 'desktop' =
    platformType === 'ios'
      ? 'ios'
      : platformType === 'android'
      ? 'android'
      : 'desktop';

  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>(initialTab);
  const [installing, setInstalling] = useState(false);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    setInstalling(true);
    const success = await install();
    setInstalling(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-rose-500/30 p-6 shadow-2xl text-slate-100 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-gradient-to-b from-rose-500/20 to-transparent blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between relative z-10 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 p-0.5 shadow-lg shadow-rose-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center p-1.5">
                <img src="/icon.svg" alt="Cuddles App" className="w-full h-full object-contain" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-white">Install Cuddles</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  PWA Web App
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Install on {platformName} for full-screen private chats & calls
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Installed State Notice */}
        {isInstalled && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3 text-xs text-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Cuddles is already installed and running as a standalone app!</span>
          </div>
        )}

        {/* Native 1-Click Install Button if supported by browser */}
        {isInstallable && !isInstalled && (
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-rose-950/60 to-pink-950/40 border border-rose-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-left">
              <div className="font-bold text-sm text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-300" />
                1-Click Fast Install Ready
              </div>
              <p className="text-xs text-rose-200/80 mt-0.5">
                Your browser supports direct instant installation.
              </p>
            </div>
            <button
              onClick={handleNativeInstall}
              disabled={installing}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>{installing ? 'Installing...' : 'Install Now'}</span>
            </button>
          </div>
        )}

        {/* Platform Selector Tabs */}
        <div className="mt-5 flex p-1 bg-slate-950 rounded-2xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'ios'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Apple className="w-4 h-4" />
            <span>iPhone / iPad</span>
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'android'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Android</span>
          </button>
          <button
            onClick={() => setActiveTab('desktop')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'desktop'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Desktop / PC / Mac</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'ios' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300">
                On iOS (Safari), Apple requires adding web apps through the Share menu:
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                    <Share className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <strong className="text-white block font-bold">1. Tap the Share button</strong>
                    <span className="text-slate-400">
                      Located in the bottom navigation bar of Safari (the square with an arrow pointing up).
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <strong className="text-white block font-bold">2. Tap "Add to Home Screen"</strong>
                    <span className="text-slate-400">
                      Scroll down in the action sheet and tap <strong>Add to Home Screen</strong>.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <strong className="text-white block font-bold">3. Tap "Add" in Top-Right</strong>
                    <span className="text-slate-400">
                      Confirm and Cuddles will instantly appear on your home screen with its custom app icon.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300">
                Install Cuddles directly on any Android phone or tablet:
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 font-bold text-sm">
                    ⋮
                  </div>
                  <div className="text-xs">
                    <strong className="text-white block font-bold">1. Tap the Browser Menu (3 dots)</strong>
                    <span className="text-slate-400">
                      In Chrome, Edge, or Samsung Internet, tap the <strong>⋮</strong> menu in the top right corner.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                  <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <strong className="text-white block font-bold">2. Tap "Install app" or "Add to Home screen"</strong>
                    <span className="text-slate-400">
                      Select <strong>Install app</strong> (or <strong>Add to Home screen</strong>) from the dropdown list.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <strong className="text-white block font-bold">3. Launch standalone app</strong>
                    <span className="text-slate-400">
                      Open Cuddles directly from your app drawer or home screen without any browser address bars!
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'desktop' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300">
                Install Cuddles on macOS, Windows PC, or Chromebook:
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold">
                    ⊕
                  </div>
                  <div className="text-xs">
                    <strong className="text-white block font-bold">Chrome & Edge Address Bar</strong>
                    <span className="text-slate-400">
                      Click the <strong>Install Cuddles</strong> icon (a computer monitor or ⊕ icon) right inside your URL address bar on the right side.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <Apple className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <strong className="text-white block font-bold">Safari on macOS Sonoma+</strong>
                    <span className="text-slate-400">
                      Click <strong>File</strong> in the top Mac menu bar &rarr; choose <strong>"Add to Dock"</strong> to run Cuddles as an independent Mac app.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Benefits Footnote */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
            <span>Private & Encrypted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Instant Audio/Video Calls</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
