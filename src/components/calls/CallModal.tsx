import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  RefreshCw,
  Users,
  Grid,
  Minimize2,
  Volume2,
  ShieldCheck,
  UserPlus,
  Heart,
  Plus,
  Repeat,
  AlertCircle
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
  const [isPiPSwapped, setIsPiPSwapped] = useState(false); // Swap self and remote in 1-on-1 calls (WhatsApp style)
  const [showParticipantsDrawer, setShowParticipantsDrawer] = useState(false);
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [cameraState, setCameraState] = useState<'loading' | 'ready' | 'error' | 'fallback'>('loading');
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [streamVersion, setStreamVersion] = useState(0); // Triggers re-bind when stream arrives

  // Safely attach stream to video element
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    localVideoRef.current = node;
    if (node && localStreamRef.current) {
      node.srcObject = localStreamRef.current;
      node.play().catch((e) => console.log('Autoplay handled:', e));
    }
  }, [streamVersion]);

  // Request camera and microphone with progressive fallbacks
  const startCamera = async () => {
    if (call.callType !== 'video') return;
    setCameraState('loading');
    setCameraErrorMessage(null);

    // Stop previous tracks if any
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    let stream: MediaStream | null = null;

    // Attempt 1: Video + Audio with preferred facingMode
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: true
      });
    } catch (err1) {
      console.warn('getUserMedia audio+video failed, falling back to video only:', err1);
      // Attempt 2: Video only with facingMode
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false
        });
      } catch (err2) {
        console.warn('getUserMedia facingMode video failed, falling back to basic video:', err2);
        // Attempt 3: Basic video only
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        } catch (err3: any) {
          console.warn('All webcam access attempts failed:', err3);
          setCameraState('error');
          setCameraErrorMessage(
            err3?.name === 'NotAllowedError'
              ? 'Camera permission denied. Please allow camera access in browser.'
              : 'Webcam not available or in use by another app.'
          );
          return;
        }
      }
    }

    if (stream) {
      localStreamRef.current = stream;
      setCameraState('ready');
      setStreamVersion((v) => v + 1);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        localVideoRef.current.play().catch((err) => console.log('Play warning:', err));
      }
    }
  };

  // Local camera stream initialization
  useEffect(() => {
    stopRingtone();
    playConnectSound();

    if (call.callType === 'video') {
      startCamera();
    }

    const durationTimer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(durationTimer);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [call.callType, facingMode]);

  // Keep video element attached if participant renders change
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => {});
    }
  }, [isPiPSwapped, call.participants.length]);

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
  const remoteParticipants = call.participants.filter((p) => !p.isLocal);
  const isGroupCall = call.participants.length >= 3;
  const existingParticipantIds = new Set(call.participants.map((p) => p.id));
  const contactsToAdd = availableContacts.filter((c) => !existingParticipantIds.has(c.id));

  // Renders the local user's live video stream or avatar fallback
  const renderLocalVideoTile = (isFloatingPiP: boolean = false) => {
    const isVideoOff = localParticipant?.isVideoOff;

    return (
      <div className={`relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden`}>
        {call.callType === 'video' && !isVideoOff ? (
          <>
            <video
              ref={setVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-transform ${
                facingMode === 'user' ? '-scale-x-100' : ''
              }`}
            />
            {/* If camera is loading or permission error */}
            {cameraState === 'loading' && (
              <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-2 p-3 text-center">
                <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-rose-200 font-medium">Starting camera...</span>
              </div>
            )}
            {cameraState === 'error' && (
              <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center gap-2 p-3 text-center">
                <AlertCircle className="w-8 h-8 text-amber-400" />
                <span className="text-xs text-slate-300 font-medium">
                  {isFloatingPiP ? 'Camera blocked' : (cameraErrorMessage || 'Camera access issue')}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startCamera();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shadow"
                >
                  Retry Camera
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-4">
            <img
              src={localParticipant?.avatar}
              alt="You"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-2 ring-rose-500 shadow-xl"
            />
            <span className="text-xs text-slate-300 mt-2 font-medium">Camera Off</span>
          </div>
        )}

        {/* Floating PiP overlay badge */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between p-1 px-2 rounded-xl bg-black/60 backdrop-blur-md text-[11px] text-white">
          <span className="truncate font-medium">You</span>
          {isFloatingPiP && (
            <span className="text-[10px] text-rose-300 flex items-center gap-0.5">
              <Repeat className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
    );
  };

  // Renders a remote participant's view
  const renderRemoteParticipantTile = (participant: CallParticipant, isFloatingPiP: boolean = false) => {
    const isSpeaking = participant.isSpeaking;

    return (
      <div className={`relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden`}>
        {call.callType === 'video' && !participant.isVideoOff ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={participant.avatar}
              alt={participant.name}
              className="w-full h-full object-cover filter brightness-95"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
          </div>
        ) : (
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

        {/* Remote participant name label */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between p-1.5 px-3 rounded-2xl bg-black/65 backdrop-blur-md text-xs border border-white/10">
          <span className="font-semibold text-white truncate max-w-[140px] flex items-center gap-1.5">
            {participant.name}
            {participant.relationshipType === 'partner' && <span className="text-rose-400 text-xs">💕</span>}
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
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between text-slate-100 select-none animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="p-3 sm:p-4 flex items-center justify-between border-b border-rose-950/40 bg-slate-900/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30">
            <Heart className="w-3.5 h-3.5 fill-current text-rose-400" />
            <span className="font-mono">{formatCallTime(callDuration)}</span>
          </div>

          <div>
            <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
              <span>{call.conversationTitle}</span>
              {isGroupCall ? (
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-[11px] font-semibold">
                  Group Call ({call.participants.length})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-medium">
                  WhatsApp Style 1-on-1
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

      {/* Main Video Presentation Stage */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
        {/* CASE 1: 1-on-1 WhatsApp Style Layout (Big Remote + Small Picture-in-Picture Self) */}
        {!isGroupCall ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* BIG MAIN SCREEN: Shows Remote by default, or Local if swapped */}
            <div className="w-full h-full">
              {isPiPSwapped
                ? renderLocalVideoTile(false)
                : renderRemoteParticipantTile(remoteParticipants[0] || (localParticipant as CallParticipant), false)}
            </div>

            {/* SMALL FLOATING PiP WINDOW: Shows Local by default, or Remote if swapped */}
            <div
              onClick={() => setIsPiPSwapped(!isPiPSwapped)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 w-32 h-44 sm:w-40 sm:h-56 rounded-3xl overflow-hidden shadow-2xl border-2 border-rose-400/60 ring-4 ring-black/40 cursor-pointer z-30 transition-all hover:scale-105 active:scale-95 group"
              title="Tap to swap screens (WhatsApp style)"
            >
              {isPiPSwapped
                ? renderRemoteParticipantTile(remoteParticipants[0] || (localParticipant as CallParticipant), true)
                : renderLocalVideoTile(true)}

              {/* Tap to swap indicator pill */}
              <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                <Repeat className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        ) : (
          /* CASE 2: Group Call Layout (3+ participants) -> Multi-person Grid */
          <div className="p-2 sm:p-4 w-full h-full max-h-[82vh] grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {call.participants.map((participant) => (
              <div
                key={participant.id}
                className="relative rounded-3xl overflow-hidden border border-slate-800/80 shadow-xl bg-slate-900"
              >
                {participant.isLocal
                  ? renderLocalVideoTile(false)
                  : renderRemoteParticipantTile(participant, false)}
              </div>
            ))}
          </div>
        )}

        {/* Participants Drawer */}
        {showParticipantsDrawer && (
          <div className="absolute right-2 top-2 bottom-2 w-72 bg-slate-900/95 border border-rose-900/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl z-40 flex flex-col animate-in slide-in-from-right-4 duration-200">
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

        {/* Add People Modal (Turns 1-on-1 into Group Call) */}
        {showAddParticipantModal && (
          <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-rose-900/40 p-5 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-rose-400" />
                    Add to Call
                  </h4>
                  <p className="text-[11px] text-slate-400">Expand to a group call (3+ people)</p>
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
                  <p className="text-xs text-slate-400 text-center py-4">All contacts are already in this call!</p>
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

      {/* Bottom Floating Controls Bar */}
      <div className="p-4 sm:pb-6 flex items-center justify-center gap-2.5 sm:gap-4 bg-gradient-to-t from-slate-950 via-slate-900/90 to-transparent z-30">
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

        {/* Add People Button */}
        {contactsToAdd.length > 0 && onAddParticipantToCall && (
          <button
            onClick={() => setShowAddParticipantModal(true)}
            className="p-3.5 sm:p-4 rounded-2xl sm:rounded-full bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-white border border-rose-500/30 shadow-lg active:scale-95"
            title="Add participant to call"
          >
            <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Flip Camera */}
        {call.callType === 'video' && (
          <button
            onClick={handleFlipCamera}
            className="p-3.5 sm:p-4 rounded-2xl sm:rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-lg active:scale-95"
            title="Flip camera"
          >
            <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* WhatsApp-Style Screen Swap Button (in 1-on-1 calls) */}
        {!isGroupCall && call.callType === 'video' && (
          <button
            onClick={() => setIsPiPSwapped(!isPiPSwapped)}
            className="p-3.5 sm:p-4 rounded-2xl sm:rounded-full bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 shadow-lg active:scale-95"
            title="Swap big & small screen"
          >
            <Repeat className="w-5 h-5 sm:w-6 sm:h-6" />
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
