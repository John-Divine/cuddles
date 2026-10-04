import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  Battery,
  BatteryCharging,
  MessageCircle,
  Ear,
  Smile,
  Shield,
  Send,
  Zap,
  Radio,
  Clock
} from 'lucide-react';
import { IntimacyMoodState, IntimacyNeed } from '../../types/intimacy';
import {
  getLocalMoods,
  syncMoodState,
  subscribeToMoodStates,
  broadcastHeartbeatPulse
} from '../../lib/intimacyStorage';

interface MoodRadarViewProps {
  conversationId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  partnerId?: string;
  partnerName: string;
  partnerAvatar?: string;
  onSendMessage?: (text: string) => void;
}

export const MoodRadarView: React.FC<MoodRadarViewProps> = ({
  conversationId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  partnerId,
  partnerName,
  partnerAvatar,
  onSendMessage
}) => {
  const [moods, setMoods] = useState<Record<string, IntimacyMoodState>>(() => getLocalMoods(conversationId));
  const myMood = moods[currentUserId];
  const partnerMood = partnerId ? moods[partnerId] : Object.values(moods).find((m) => m.userId !== currentUserId);

  const [batteryPercent, setBatteryPercent] = useState<number>(myMood?.batteryPercent || 80);
  const [currentNeed, setCurrentNeed] = useState<IntimacyNeed>(myMood?.currentNeed || 'cuddle');
  const [customNote, setCustomNote] = useState<string>(myMood?.customNote || '');
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Tactile Heartbeat hold-down state
  const [isHoldingHeart, setIsHoldingHeart] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [heartbeatSentNotice, setHeartbeatSentNotice] = useState(false);
  const holdIntervalRef = useRef<any>(null);

  useEffect(() => {
    const unsub = subscribeToMoodStates(conversationId, (cloudMoods) => {
      setMoods(cloudMoods);
      if (cloudMoods[currentUserId]) {
        setBatteryPercent(cloudMoods[currentUserId].batteryPercent);
        setCurrentNeed(cloudMoods[currentUserId].currentNeed);
        if (cloudMoods[currentUserId].customNote !== undefined) {
          setCustomNote(cloudMoods[currentUserId].customNote || '');
        }
      }
    });
    return () => unsub();
  }, [conversationId, currentUserId]);

  const handleSaveMood = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated: IntimacyMoodState = {
        userId: currentUserId,
        conversationId,
        batteryPercent,
        currentNeed,
        customNote: customNote.trim() || undefined,
        updatedAt: new Date().toISOString()
      };
      await syncMoodState(conversationId, updated);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);

      if (onSendMessage) {
        onSendMessage(
          `💓 Updated intimacy check-in: Battery at ${batteryPercent}% · Need: ${getNeedLabel(currentNeed)}${
            customNote.trim() ? ` ("${customNote.trim()}")` : ''
          }`
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Heartbeat hold down handling
  const startHoldHeart = () => {
    setIsHoldingHeart(true);
    setHoldProgress(0);
    clearInterval(holdIntervalRef.current);

    holdIntervalRef.current = setInterval(() => {
      setHoldProgress((prev) => {
        if (prev >= 100) {
          clearInterval(holdIntervalRef.current);
          triggerSendHeartbeat();
          return 100;
        }
        return prev + 10;
      });
    }, 120);
  };

  const endHoldHeart = () => {
    clearInterval(holdIntervalRef.current);
    if (holdProgress >= 80) {
      triggerSendHeartbeat();
    }
    setIsHoldingHeart(false);
    setHoldProgress(0);
  };

  const triggerSendHeartbeat = async () => {
    const event = {
      id: `hb_${Date.now()}`,
      conversationId,
      senderId: currentUserId,
      senderName: currentUserName,
      intensity: 5,
      timestamp: new Date().toISOString()
    };
    await broadcastHeartbeatPulse(conversationId, event);
    setHeartbeatSentNotice(true);
    setTimeout(() => setHeartbeatSentNotice(false), 3000);

    if (onSendMessage) {
      onSendMessage(`💓 Sent a live tactile heartbeat pulse to you!`);
    }
  };

  function getNeedLabel(need: IntimacyNeed): string {
    switch (need) {
      case 'cuddle':
        return 'Need quiet cuddles & physical closeness';
      case 'talk':
        return 'Want to vent & talk things through';
      case 'listening':
        return 'Need gentle listening without advice';
      case 'fun':
        return 'Craving laughs, silliness & fun';
      case 'space':
        return 'Need quiet peaceful space to recharge';
    }
  }

  const needsList: Array<{ id: IntimacyNeed; label: string; icon: any; color: string }> = [
    { id: 'cuddle', label: 'Cuddles & Warmth', icon: Heart, color: 'text-rose-400' },
    { id: 'talk', label: 'Talk & Vent', icon: MessageCircle, color: 'text-blue-400' },
    { id: 'listening', label: 'Deep Listening', icon: Ear, color: 'text-purple-400' },
    { id: 'fun', label: 'Laughs & Fun', icon: Smile, color: 'text-amber-400' },
    { id: 'space', label: 'Quiet Recharge', icon: Shield, color: 'text-emerald-400' }
  ];

  const batteryColors = {
    20: 'bg-rose-500 text-rose-400',
    40: 'bg-amber-500 text-amber-400',
    60: 'bg-yellow-400 text-yellow-400',
    80: 'bg-emerald-400 text-emerald-400',
    100: 'bg-pink-500 text-pink-400'
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-6">
      {/* Top Section: Real-time Partner Mood Radar Snapshot */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>Connection & Emotional Radar</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Syncs in real-time</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Partner's State Card */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-800/60">
                {partnerAvatar ? (
                  <img src={partnerAvatar} alt={partnerName} className="w-8 h-8 rounded-full object-cover ring-1 ring-pink-500/50" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center text-xs font-bold text-white">
                    {partnerName.slice(0, 1)}
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold text-white">{partnerName}'s Heart State</h4>
                  <span className="text-[10px] text-slate-400">
                    {partnerMood?.updatedAt
                      ? `Updated ${new Date(partnerMood.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'No check-in yet today'}
                  </span>
                </div>
              </div>

              {partnerMood ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Emotional Battery</span>
                    <span className="font-bold tabular-nums text-white">{partnerMood.batteryPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        partnerMood.batteryPercent <= 20
                          ? 'bg-rose-500'
                          : partnerMood.batteryPercent <= 40
                          ? 'bg-amber-500'
                          : partnerMood.batteryPercent <= 60
                          ? 'bg-yellow-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{ width: `${partnerMood.batteryPercent}%` }}
                    />
                  </div>

                  <div className="pt-1.5">
                    <span className="text-[11px] text-slate-400 block mb-0.5">What they need right now:</span>
                    <p className="text-xs font-semibold text-rose-300">
                      {getNeedLabel(partnerMood.currentNeed)}
                    </p>
                  </div>

                  {partnerMood.customNote && (
                    <p className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 italic mt-2">
                      "{partnerMood.customNote}"
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-500 text-xs">
                  Waiting for {partnerName}'s first check-in today 💕
                </div>
              )}
            </div>
          </div>

          {/* Tactile Heartbeat Pulse Transmitter Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950/80 via-slate-950/80 to-rose-950/30 border border-rose-500/30 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <h4 className="text-xs font-bold text-white mb-1">Send a Live Tactile Heartbeat</h4>
            <p className="text-[11px] text-slate-400 max-w-xs mb-4">
              Press and hold the heart. It transmits a pulsing haptic vibration straight to {partnerName}'s screen in real time.
            </p>

            <button
              type="button"
              onMouseDown={startHoldHeart}
              onMouseUp={endHoldHeart}
              onTouchStart={startHoldHeart}
              onTouchEnd={endHoldHeart}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 ${
                isHoldingHeart
                  ? 'bg-rose-600 scale-110 shadow-2xl shadow-rose-600/80'
                  : 'bg-slate-800/80 hover:bg-slate-800 border border-rose-500/40'
              }`}
              style={{
                boxShadow: isHoldingHeart ? `0 0 ${holdProgress}px rgba(244, 63, 94, 0.8)` : undefined
              }}
              title="Hold down to send heartbeat"
              aria-label="Send live heartbeat"
            >
              {/* Progress Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-slate-800 fill-none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  className="text-rose-400 fill-none transition-all duration-100"
                  strokeDasharray="226"
                  strokeDashoffset={226 - (226 * holdProgress) / 100}
                />
              </svg>

              <Heart
                className={`w-9 h-9 transition-transform ${
                  isHoldingHeart
                    ? 'text-white fill-white scale-125 animate-pulse'
                    : 'text-rose-400 hover:scale-105'
                }`}
              />
            </button>

            <span className="text-[10px] font-semibold text-slate-400 mt-3">
              {isHoldingHeart ? `Charging Heartbeat: ${holdProgress}%` : 'Hold for 2 seconds to send'}
            </span>

            {heartbeatSentNotice && (
              <span className="mt-2 text-xs font-bold text-rose-400 animate-in fade-in flex items-center gap-1">
                <span>💕 Heartbeat transmitted to {partnerName}!</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Broadcast My Mood Form */}
      <form onSubmit={handleSaveMood} className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-5">
        <div>
          <h3 className="text-sm font-bold text-white">Your Emotional Battery & Intimacy Need</h3>
          <p className="text-xs text-slate-400 mt-1">
            Let {partnerName} know where your energy is today and how they can best show up for you.
          </p>
        </div>

        {/* Battery Level Selector */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
              <span>Current Emotional Battery</span>
            </span>
            <span className="font-bold tabular-nums text-white text-sm">{batteryPercent}%</span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {[20, 40, 60, 80, 100].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setBatteryPercent(val)}
                className={`py-2 px-2 rounded-xl text-xs font-bold tabular-nums border transition-all cursor-pointer ${
                  batteryPercent === val
                    ? 'bg-rose-600 text-white border-rose-500 shadow-md scale-105'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>

        {/* Intimacy Need Buttons */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-slate-300 block">
            What do you need most right now?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {needsList.map((item) => {
              const Icon = item.icon;
              const isSelected = currentNeed === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentNeed(item.id)}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-rose-500/20 border-rose-500/60 text-white shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/70'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${isSelected ? 'bg-rose-500/30 text-rose-300' : 'bg-slate-800 text-slate-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Note */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 block">
            Optional Note or Heart Whisper
          </label>
          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="e.g., Demanding day at work, would love a warm quiet evening together..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-rose-500"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          {justSaved ? (
            <span className="text-xs text-emerald-400 font-semibold animate-in fade-in">
              ✓ Mood updated & synced with {partnerName}
            </span>
          ) : (
            <span className="text-[11px] text-slate-500">
              Only visible to you and {partnerName}
            </span>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-rose-950/50 active:scale-95 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Broadcasting...' : 'Broadcast My Vibe'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
