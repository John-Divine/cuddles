import React, { useEffect } from 'react';
import { Phone, PhoneOff, Video, ShieldCheck } from 'lucide-react';
import { startRingtone, stopRingtone } from '../../lib/audio';

interface IncomingCallDialogProps {
  callerName: string;
  callerAvatar: string;
  callType: 'audio' | 'video';
  isPartner?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallDialog: React.FC<IncomingCallDialogProps> = ({
  callerName,
  callerAvatar,
  callType,
  isPartner,
  onAccept,
  onDecline,
}) => {
  useEffect(() => {
    startRingtone();
    return () => {
      stopRingtone();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/40 p-6 text-center shadow-2xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-4 border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          End-to-End Encrypted Call
        </div>

        <div className="relative mx-auto w-24 h-24 mb-4">
          <img
            src={callerAvatar}
            alt={callerName}
            className="w-full h-full rounded-full object-cover ring-4 ring-indigo-500/60 shadow-xl"
          />
          <div className="absolute -inset-2 rounded-full border-2 border-indigo-400 animate-ping opacity-30" />
        </div>

        <h3 className="text-lg font-bold text-white flex items-center justify-center gap-1.5">
          <span>{callerName}</span>
          {isPartner && <span className="text-rose-400 text-sm">💕</span>}
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Incoming {callType === 'video' ? 'Video' : 'Audio'} Call...
        </p>

        {/* Accept / Decline actions */}
        <div className="flex items-center justify-center gap-6 mt-8">
          <button
            onClick={() => {
              stopRingtone();
              onDecline();
            }}
            className="flex flex-col items-center gap-1 text-xs text-slate-300 group"
          >
            <div className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 active:scale-90 flex items-center justify-center text-white shadow-lg shadow-red-600/30 transition-all">
              <PhoneOff className="w-6 h-6" />
            </div>
            <span>Decline</span>
          </button>

          <button
            onClick={() => {
              stopRingtone();
              onAccept();
            }}
            className="flex flex-col items-center gap-1 text-xs text-slate-300 group"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-90 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 transition-all animate-bounce">
              {callType === 'video' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
            </div>
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};
