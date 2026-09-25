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
  Zap,
  Copy,
  Check,
  Info
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install, platformType, platformName } = usePWAInstall();

  // Tab state, defaulting to detected platform
  const initialTab: 'android' | 'ios' | 'desktop' =
    platformType === 'ios'
      ? 'ios'
      : platformType === 'desktop-chrome' || platformType === 'desktop-mac' || platformType === 'desktop-windows'
      ? 'desktop'
      : 'android';

  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>(initialTab);
  const [installing, setInstalling] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    setInstalling(true);
    try {
      const success = await install();
      if (success) {
        onClose();
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
      setCopiedLink(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-rose-500/40 p-5 sm:p-6 shadow-2xl text-slate-100 relative overflow-hidden max-h-[92vh] flex flex-col">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-gradient-to-b from-rose-500/20 to-transparent blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between relative z-10 pb-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 p-0.5 shadow-lg shadow-rose-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center p-1.5">
                <img src="/icon.svg" alt="Cuddles App" className="w-full h-full object-contain" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Install Cuddles to Phone
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {platformName}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Install as a standalone app on your home screen
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto pr-1 py-3 space-y-4">
          {/* Installed State Notice */}
          {isInstalled && (
            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3 text-xs text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Cuddles is already installed and running as a standalone app!</span>
            </div>
          )}

          {/* Direct 1-Click Install Button if supported */}
          {isInstallable && !isInstalled && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/70 via-slate-900 to-pink-950/50 border border-rose-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
              <div className="text-left w-full sm:w-auto">
                <div className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Direct 1-Tap Install Ready
                </div>
                <p className="text-xs text-rose-200/80 mt-0.5">
                  Chrome is ready to add Cuddles directly to your home screen.
                </p>
              </div>
              <button
                onClick={handleNativeInstall}
                disabled={installing}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>{installing ? 'Triggering...' : 'Install to Home Screen'}</span>
              </button>
            </div>
          )}

          {/* Platform Selector Tabs */}
          <div className="flex p-1 bg-slate-950 rounded-2xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab('android')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'android'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Android (Chrome)</span>
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'ios'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Apple className="w-4 h-4" />
              <span>iPhone / iOS</span>
            </button>
            <button
              onClick={() => setActiveTab('desktop')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'desktop'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>PC / Mac</span>
            </button>
          </div>

          {/* Android Chrome Walkthrough Tab */}
          {activeTab === 'android' && (
            <div className="space-y-3">
              {/* Chrome Recent Name Change Callout */}
              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-2.5 text-xs text-amber-200">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-white block font-bold mb-0.5">
                    Google Chrome Update Note
                  </strong>
                  In recent Google Chrome updates on Android, Google renamed the menu option from{' '}
                  <span className="text-amber-300 font-semibold underline underline-offset-2">"Add to Home screen"</span>{' '}
                  to{' '}
                  <span className="text-white font-bold bg-amber-500/20 px-1 py-0.5 rounded border border-amber-500/40">
                    "Install app"
                  </span>.
                  Look for the download icon (📥) next to <strong>Install app</strong>!
                </div>
              </div>

              {/* Step by Step Cards */}
              <div className="space-y-2.5">
                {/* Step 1 */}
                <div className="flex items-start gap-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 font-extrabold text-sm">
                    ⋮
                  </div>
                  <div className="text-xs">
                    <strong className="text-white block font-bold text-sm">
                      1. Tap the Chrome Menu (3 dots)
                    </strong>
                    <span className="text-slate-300 block mt-0.5">
                      In Google Chrome on your phone, tap the <strong className="text-white font-bold">⋮</strong> menu button located at the top-right corner next to the address bar.
                    </span>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50">
                  <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <strong className="text-white block font-bold text-sm">
                      2. Tap "Install app" (or "Add to Home screen")
                    </strong>
                    <span className="text-slate-300 block mt-0.5">
                      Scroll slightly down the list and tap <strong className="text-white font-bold">"Install app"</strong> (on some Chrome versions it is labeled <strong className="text-white font-bold">"Add to Home screen"</strong>).
                    </span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <strong className="text-white block font-bold text-sm">
                      3. Confirm "Install" on popup
                    </strong>
                    <span className="text-slate-300 block mt-0.5">
                      Tap <strong className="text-white font-bold">Install</strong>. Android will create the Cuddles icon directly on your phone's home screen and app launcher!
                    </span>
                  </div>
                </div>
              </div>

              {/* In-app Browser Tip & Copy Link */}
              <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-300">
                <span className="text-[11px] text-slate-400">
                  Opening inside an in-app browser? Tap Chrome menu &rarr; <strong>"Open in Chrome"</strong>.
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-600/50 shrink-0"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300 font-bold">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-rose-400" />
                      <span>Copy App URL</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* iOS Safari Tab */}
          {activeTab === 'ios' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300">
                On iOS (Safari), Apple requires adding web apps through the Share menu:
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                    <Share className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <strong className="text-white block font-bold text-sm">1. Tap the Share button</strong>
                    <span className="text-slate-400 mt-0.5 block">
                      Located in the bottom navigation bar of Safari (the square with an arrow pointing up).
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <strong className="text-white block font-bold text-sm">2. Tap "Add to Home Screen"</strong>
                    <span className="text-slate-400 mt-0.5 block">
                      Scroll down the action sheet and tap <strong>Add to Home Screen</strong>.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <strong className="text-white block font-bold text-sm">3. Tap "Add" in Top-Right</strong>
                    <span className="text-slate-400 mt-0.5 block">
                      Confirm and Cuddles will instantly appear on your home screen with its custom app icon.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Tab */}
          {activeTab === 'desktop' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300">
                Install Cuddles on macOS, Windows PC, or Chromebook:
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold">
                    ⊕
                  </div>
                  <div className="text-xs">
                    <strong className="text-white block font-bold text-sm">Chrome & Edge Address Bar</strong>
                    <span className="text-slate-400 mt-0.5 block">
                      Click the <strong>Install Cuddles</strong> icon (a computer monitor or ⊕ icon) right inside your URL address bar on the right side.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <Apple className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <strong className="text-white block font-bold text-sm">Safari on macOS Sonoma+</strong>
                    <span className="text-slate-400 mt-0.5 block">
                      Click <strong>File</strong> in the top Mac menu bar &rarr; choose <strong>"Add to Dock"</strong> to run Cuddles as an independent Mac app.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
            <span>Private & Encrypted</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Got it, close
          </button>
        </div>
      </div>
    </div>
  );
};
