import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-500/95 text-slate-950 px-4 py-1.5 text-xs font-semibold shadow-xl backdrop-blur-md border border-amber-300/40 animate-pulse">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline Mode — End-to-end encrypted local cache active</span>
    </div>
  );
};
