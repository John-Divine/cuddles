import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  RefreshCw,
  Share2,
  Users,
  Grid,
  Maximize2,
  Minimize2,
  Volume2,
  ShieldCheck,
  UserPlus,
  Heart,
  Plus,
  Check
} from 'lucide-react';
import { ActiveCall, CallParticipant, UserProfile } from '../../types';
import { playConnectSound, playEndCallSound, stopRingtone } from '../../lib/audio';

interface CallModalProps {
  call: ActiveCall;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onMinimize: () => void;
  availableContacts?: UserProfile[];
  onAddParticipantToCall?: (contact: UserProfile) => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  call,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onMinimize,
  availableContacts = [],
  onAddParticipantToCall
}) => {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'speaker'>('grid');
  const [activeSpeakerId, setActiveSpeakerId] = useState<string>('partner_elena');
  const [showParticipantsDrawer, setShowParticipantsDrawer] = useState(false);
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Local camera stream initialization
  useEffect(() => {
    stopRingtone();
    playConnectSound();

    if (call.callType === 'video') {
      navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true
      })
        .then((stream) => {
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.muted = true;
          }
        })
        .catch((err) => {
          console.warn('Camera stream error:', err);
        });
    }

    const durationTimer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(durationTimer);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [call.callType, facingMode]);

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleTerminate = () => {
    playEndCallSound();
    onEndCall();
  };

  const formatCallTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const localParticipant = call.participants.find((p) => p.isLocal);
  const existingParticipantIds = new Set(call.participants.map((p) => p.id));
  const contactsToAdd = availableContacts.filter((c) => !existingParticipantIds.has(c.id));

  // Determine grid template based on participant count
  const getGridColsClass = () => {
    const count = call.participants.length;
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    return 'grid-cols-2 sm:grid-cols-3';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col justify-between text-slate-100 select-none animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="p-3 sm:p-4 flex items-center justify-between border-b border-rose-950/40 bg-slate-900/60 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30">
            <Heart className="w-3.5 h-3.5 fill-current text-rose-400" />
            <span className="font-mono">{formatCallTime(callDuration)}</span>
          </div>

          <div>
            <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
              <span>{call.conversationTitle}</span>
              {call.participants.length > 2 ? (
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-[11px] font-semibold">
                  Group Call ({call.participants.length})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-medium">
                  1-on-1 Call
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>E2EE Encrypted Call</span>
            </div>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Add People to Call Button */}
          {contactsToAdd.length > 0 && onAddParticipantToCall && (
            <button
              onClick={() => setShowAddParticipantModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition-all"
              title="Add people to call"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add to Call</span>
            </button>
          )}

          {/* Toggle Participants List */}
          <button
            onClick={() => setShowParticipantsDrawer(!showParticipantsDrawer)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all relative"
            title="View participants"
          >
            <Users className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] text-white flex items-center justify-center font-bold">
              {call.participants.length}
            </span>
          </button>

          {/* Minimize Call */}
          <button
            onClick={onMinimize}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
            title="Minimize to floating window"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Video/Audio Grid Area */}
      <div className="flex-1 p-2 sm:p-4 overflow-hidden relative flex items-center justify-center">
        <div className={`grid ${getGridColsClass()} gap-3 w-full h-full max-h-[82vh]`}>
          {call.participants.map((participant) => {
            const isLocal = participant.isLocal;
            const isSpeaking = participant.isSpeaking;

            return (
              <div
                key={participant.id}
                className={`relative rounded-3xl overflow-hidden bg-slate-900/90 border transition-all flex items-center justify-center shadow-xl ${
                  isSpeaking
                    ? 'border-rose-500/80 ring-2 ring-rose-500/40'
                    : 'border-slate-800/80'
                }`}
              >
                {/* Visual Video Content */}
                {call.callType === 'video' && !participant.isVideoOff ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {isLocal ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
                      />
                    ) : (
                      <img
                        src={participant.avatar}
                        alt={participant.name}
                        className="w-full h-full object-cover filter brightness-90"
                      />
                    )}
                    {/* Simulated romantic call lighting gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />
                  </div>
                ) : (
                  /* Audio-only or Video-muted view */
                  <div className="flex flex-col items-center justify-center p-4">
                    <div className="relative">
                      <img
                        src={participant.avatar}
                        alt={participant.name}
                        className={`w-20 h-20 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ${
                          isSpeaking ? 'ring-rose-400 animate-pulse' : 'ring-slate-700'
                        } shadow-2xl`}
                      />
                      {isSpeaking && (
                        <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-rose-600 text-white shadow">
                          <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Participant Label overlay */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between p-1.5 px-3 rounded-2xl bg-black/65 backdrop-blur-md text-xs border border-white/10">
                  <span className="font-semibold text-white truncate max-w-[140px] flex items-center gap-1.5">
                    {participant.name} {isLocal && '(You)'}
                    {participant.relationshipType === 'partner' && (
                      <span className="text-rose-400 text-xs">💕</span>
                    )}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {participant.isMuted && (
                      <span className="p-1 rounded-full bg-rose-500/80 text-white">
                        <MicOff className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Participants Drawer (Mobile / Desktop) */}
        {showParticipantsDrawer && (
          <div className="absolute right-2 top-2 bottom-2 w-72 bg-slate-900/95 border border-rose-900/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl z-30 flex flex-col animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-400" />
                In This Call ({call.participants.length})
              </h4>
              <button
                onClick={() => setShowParticipantsDrawer(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1">
              {call.participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/50"
                >
                  <div className="flex items-center gap-2.5">
                    <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <span className="text-xs font-medium text-white block">
                        {p.name} {p.isLocal && '(You)'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {p.relationshipType === 'partner' ? 'Partner 💕' : 'Friend'}
                      </span>
                    </div>
                  </div>
                  {p.isMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
              ))}
            </div>

            {/* Quick Add Button inside drawer */}
            {contactsToAdd.length > 0 && onAddParticipantToCall && (
              <button
                onClick={() => {
                  setShowParticipantsDrawer(false);
                  setShowAddParticipantModal(true);
                }}
                className="mt-3 w-full py-2 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-rose-200 text-xs font-semibold border border-rose-500/30 flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add More People to Call
              </button>
            )}
          </div>
        )}

        {/* Add People Modal (converts 1-on-1 into Group Call) */}
        {showAddParticipantModal && (
          <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-rose-900/40 p-5 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-rose-400" />
                    Add to Call
                  </h4>
                  <p className="text-[11px] text-slate-400">Turn this into a group call</p>
                </div>
                <button
                  onClick={() => setShowAddParticipantModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="mt-3 max-h-60 overflow-y-auto space-y-2 pr-1">
                {contactsToAdd.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">All partners and friends are already in this call!</p>
                ) : (
                  contactsToAdd.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <img src={contact.avatar} alt={contact.name} className="w-9 h-9 rounded-full object-cover ring-1 ring-rose-500/30" />
                        <div>
                          <span className="text-xs font-semibold text-white block">{contact.name}</span>
                          <span className="text-[10px] text-rose-300">
                            {contact.relationshipType === 'partner' ? 'Partner 💕' : 'Friend'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onAddParticipantToCall?.(contact);
                          setShowAddParticipantModal(false);
                        }}
                        className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating Controls Bar - Responsive for Mobile Touch */}
      <div className="p-4 sm:pb-6 flex items-center justify-center gap-2.5 sm:gap-4 bg-gradient-to-t from-slate-900/95 via-slate-900/80 to-transparent z-20">
        {/* Mic Toggle */}
        <button
          onClick={onToggleMute}
          className={`p-3.5 sm:p-4 rounded-2xl sm:rounded-full transition-all active:scale-95 shadow-lg ${
            localParticipant?.isMuted
              ? 'bg-rose-500 text-white ring-2 ring-rose-400/40'
              : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
          }`}
          title={localParticipant?.isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {localParticipant?.isMuted ? (
            <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />
          ) : (
            <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
          )}
        </button>

        {/* Video Toggle */}
        {call.callType === 'video' && (
          <button
            onClick={onToggleVideo}
            className={`p-3.5 sm:p-4 rounded-2xl sm:rounded-full transition-all active:scale-95 shadow-lg ${
              localParticipant?.isVideoOff
                ? 'bg-rose-500 text-white ring-2 ring-rose-400/40'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
            title={localParticipant?.isVideoOff ? 'Turn video on' : 'Turn video off'}
          >
            {localParticipant?.isVideoOff ? (
              <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <Video className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </button>
        )}

        {/* Add People Button in bottom bar */}
        {contactsToAdd.length > 0 && onAddParticipantToCall && (
          <button
            onClick={() => setShowAddParticipantModal(true)}
            className="p-3.5 sm:p-4 rounded-2xl sm:rounded-full bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-white border border-rose-500/30 shadow-lg active:scale-95"
            title="Add participant to call"
          >
            <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Flip Camera (for mobile video calls) */}
        {call.callType === 'video' && (
          <button
            onClick={handleFlipCamera}
            className="p-3.5 sm:p-4 rounded-2xl sm:rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-lg active:scale-95"
            title="Flip camera"
          >
            <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* End Call Button */}
        <button
          onClick={handleTerminate}
          className="p-3.5 sm:p-4 px-6 sm:px-8 rounded-2xl sm:rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white shadow-xl shadow-red-600/30 font-semibold flex items-center gap-2"
          title="End Call"
        >
          <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Leave</span>
        </button>
      </div>
    </div>
  );
};
