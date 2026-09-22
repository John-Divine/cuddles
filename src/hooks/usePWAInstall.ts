import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Module-level cache for beforeinstallprompt in case it fires before component mounts
let cachedPromptEvent: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    cachedPromptEvent = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent('cuddles-pwa-prompt-ready'));
  });

  window.addEventListener('appinstalled', () => {
    cachedPromptEvent = null;
    window.dispatchEvent(new CustomEvent('cuddles-pwa-installed'));
  });
}

export type PlatformType = 'ios' | 'android' | 'desktop-chrome' | 'desktop-mac' | 'desktop-windows' | 'other';

export function getPlatform(): {
  type: PlatformType;
  name: string;
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isDesktop: boolean;
} {
  if (typeof window === 'undefined') {
    return {
      type: 'other',
      name: 'Device',
      isIOS: false,
      isAndroid: false,
      isMobile: false,
      isDesktop: true,
    };
  }

  const ua = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isMac = /macintosh|mac os x/.test(ua) && !isIOS;
  const isWindows = /windows/.test(ua);
  const isMobile = isIOS || isAndroid;

  let type: PlatformType = 'other';
  let name = 'Your Device';

  if (isIOS) {
    type = 'ios';
    name = /ipad/.test(ua) ? 'iPad' : 'iPhone';
  } else if (isAndroid) {
    type = 'android';
    name = 'Android Phone/Tablet';
  } else if (isMac) {
    type = 'desktop-mac';
    name = 'Mac';
  } else if (isWindows) {
    type = 'desktop-windows';
    name = 'Windows PC';
  } else {
    type = 'desktop-chrome';
    name = 'Computer';
  }

  return {
    type,
    name,
    isIOS,
    isAndroid,
    isMobile,
    isDesktop: !isMobile,
  };
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(cachedPromptEvent);
  const [isInstalled, setIsInstalled] = useState(false);
  const platform = getPlatform();

  useEffect(() => {
    // Check if running in standalone PWA window
    const checkStandalone = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(Boolean(isStandalone));
    };

    checkStandalone();

    if (cachedPromptEvent) {
      setDeferredPrompt(cachedPromptEvent);
    }

    const handlePromptReady = () => {
      setDeferredPrompt(cachedPromptEvent);
    };

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      cachedPromptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      cachedPromptEvent = null;
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener('cuddles-pwa-prompt-ready', handlePromptReady);
    window.addEventListener('cuddles-pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('cuddles-pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('cuddles-pwa-installed', handleInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        cachedPromptEvent = null;
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.warn('PWA install prompt error:', err);
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS: platform.isIOS,
    isAndroid: platform.isAndroid,
    isMobile: platform.isMobile,
    isDesktop: platform.isDesktop,
    platformName: platform.name,
    platformType: platform.type,
    install,
  };
}
