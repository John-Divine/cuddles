import React from 'react';
import { Phone, Maximize2, Mic, MicOff, PhoneOff, Video } from 'lucide-react';
import { ActiveCall } from '../../types';

interface FloatingCallBarProps {
  call: ActiveCall;
  onMaximize: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
}

export const FloatingCallBar: React.FC<FloatingCallBarProps> = ({
  call,
  onMaximize,
  onEndCall,
  onToggleMute,
}) => {
  const localParticipant = call.participants.find((p) => p.isLocal);
  const remoteParticipant = call.participants.find((p) => !p.isLocal);
  const displayTitle = !call.isGroup && remoteParticipant ? remoteParticipant.name : call.conversationTitle;

  return (
    <div className="fixed top-3 right-3 sm:right-6 z-40 flex items-center gap-3 bg-slate-900/95 border border-indigo-500/50 shadow-2xl rounded-2xl p-2 px-3.5 backdrop-blur-xl animate-in slide-in-from-top duration-200">
      <div
        onClick={onMaximize}
        className="flex items-center gap-2.5 cursor-pointer hover:opacity-90"
      >
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
            {call.callType === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          </div>
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
        </div>
        <div className="text-left">
          <span className="font-semibold text-xs text-white block max-w-[120px] truncate">
            {displayTitle}
          </span>
          <span className="text-[10px] text-emerald-400 font-medium">In Call • Tap to expand</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 border-l border-slate-700 pl-2">
        <button
          onClick={onToggleMute}
          className={`p-1.5 rounded-lg ${
            localParticipant?.isMuted ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-300'
          }`}
          title="Mute/Unmute"
        >
          {localParticipant?.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={onMaximize}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          title="Maximize"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onEndCall}
          className="p-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow"
          title="Leave Call"
        >
          <PhoneOff className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
