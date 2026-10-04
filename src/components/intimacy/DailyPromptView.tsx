import React, { useState, useEffect } from 'react';
import { Sparkles, Lock, Heart, Check, Send, Calendar, Clock, History, ChevronRight } from 'lucide-react';
import { DailyPromptData } from '../../types/intimacy';
import {
  getTodayDateKey,
  getPromptForDate,
  syncDailyPromptAnswer,
  subscribeToDailyPrompt,
  DAILY_PROMPTS_BANK
} from '../../lib/intimacyStorage';

interface DailyPromptViewProps {
  conversationId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  partnerId?: string;
  partnerName: string;
  partnerAvatar?: string;
  onSendMessage?: (text: string) => void;
}

export const DailyPromptView: React.FC<DailyPromptViewProps> = ({
  conversationId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  partnerId,
  partnerName,
  partnerAvatar,
  onSendMessage
}) => {
  const todayKey = getTodayDateKey();
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);
  const [promptData, setPromptData] = useState<DailyPromptData | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasHeartReacted, setHasHeartReacted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Subscribe to prompt data for the selected date
  useEffect(() => {
    const unsub = subscribeToDailyPrompt(conversationId, selectedDateKey, (data) => {
      setPromptData(data);
    });
    return () => unsub();
  }, [conversationId, selectedDateKey]);

  const currentPromptDef = getPromptForDate(selectedDateKey);
  const myResponse = promptData?.responses?.[currentUserId];
  const partnerResponse = partnerId && promptData?.responses?.[partnerId]
    ? promptData.responses[partnerId]
    : Object.values(promptData?.responses || {}).find((r) => r.userId !== currentUserId);

  const bothAnswered = Boolean(myResponse && partnerResponse);

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const updated = await syncDailyPromptAnswer(conversationId, selectedDateKey, {
        userId: currentUserId,
        userName: currentUserName,
        userAvatar: currentUserAvatar,
        text: inputText.trim()
      });
      setPromptData(updated);
      setInputText('');

      // Optional chat notice
      if (onSendMessage) {
        onSendMessage(`💌 Answered today's prompt: "${currentPromptDef.text}"`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleHeartReaction = () => {
    setHasHeartReacted(!hasHeartReacted);
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-6">
      {/* Top Bar with Date & Archive Trigger */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Calendar className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-medium text-slate-200">
            {selectedDateKey === todayKey ? "Today's Deep Connection Prompt" : `Prompt for ${selectedDateKey}`}
          </span>
          <span aria-hidden="true">·</span>
          <span className="capitalize text-rose-300 font-medium">{currentPromptDef.category} Reflection</span>
        </div>

        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 transition-colors cursor-pointer"
        >
          <History className="w-3.5 h-3.5 text-rose-400" />
          <span>{showHistory ? 'Back to Today' : 'Prompt Archive'}</span>
        </button>
      </div>

      {showHistory ? (
        /* History Archive List */
        <div className="space-y-3 animate-in fade-in duration-200">
          <h4 className="text-sm font-semibold text-slate-200">Browse Past Intimate Questions</h4>
          <div className="grid grid-cols-1 gap-2.5">
            {DAILY_PROMPTS_BANK.map((item, idx) => {
              const pseudoDate = new Date();
              pseudoDate.setDate(pseudoDate.getDate() - idx);
              const dKey = pseudoDate.toISOString().slice(0, 10);
              const isSelected = dKey === selectedDateKey;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedDateKey(dKey);
                    setShowHistory(false);
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-rose-500/15 border-rose-500/50 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-[10px] text-rose-400 font-medium block uppercase tracking-wider mb-0.5">
                      {dKey === todayKey ? 'Today' : dKey} · {item.category}
                    </span>
                    <p className="text-xs font-medium text-slate-200 line-clamp-1">{item.text}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Main Question Hero Card */}
          <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/40 border border-rose-500/30 p-5 sm:p-6 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-20">
              <Sparkles className="w-24 h-24 text-rose-400" />
            </div>

            <div className="relative z-10 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-semibold mb-3 border border-rose-500/30">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                <span>Daily Vulnerability Ritual</span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-white leading-snug tracking-tight text-balance">
                "{currentPromptDef.text}"
              </h3>

              <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                Both of you answer independently. Your partner's response stays privately locked behind frosted glass until both answers are submitted.
              </p>
            </div>
          </div>

          {/* Answering State or Submitted Answers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* My Answer Box */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 flex flex-col justify-between min-h-[180px]">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                  <div className="flex items-center gap-2">
                    {currentUserAvatar ? (
                      <img src={currentUserAvatar} alt="Me" className="w-7 h-7 rounded-full object-cover ring-1 ring-rose-400/50" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-rose-600 flex items-center justify-center text-xs font-bold text-white">
                        {currentUserName.slice(0, 1)}
                      </div>
                    )}
                    <span className="text-xs font-semibold text-slate-200">{currentUserName} (You)</span>
                  </div>

                  {myResponse ? (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                      <Check className="w-3.5 h-3.5" />
                      Answered
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-400 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      Pending your answer
                    </span>
                  )}
                </div>

                {myResponse ? (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                      {myResponse.text}
                    </p>
                    <span className="text-[10px] text-slate-500 block">
                      Submitted at {new Date(myResponse.answeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitAnswer} className="space-y-3">
                    <textarea
                      rows={3}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Pour your heart out honestly... your answer is safe here."
                      className="w-full bg-slate-950/70 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/80 focus:ring-1 focus:ring-rose-500/50 resize-none"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim() || isSubmitting}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Locking in...' : 'Lock in My Answer'}</span>
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Partner's Answer Box (Double-Blind Glass Reveal) */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 flex flex-col justify-between min-h-[180px] relative overflow-hidden">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                  <div className="flex items-center gap-2">
                    {partnerAvatar ? (
                      <img src={partnerAvatar} alt={partnerName} className="w-7 h-7 rounded-full object-cover ring-1 ring-pink-500/50" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-pink-600 flex items-center justify-center text-xs font-bold text-white">
                        {partnerName.slice(0, 1)}
                      </div>
                    )}
                    <span className="text-xs font-semibold text-slate-200">{partnerName}</span>
                  </div>

                  {bothAnswered ? (
                    <span className="text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                      <Sparkles className="w-3.5 h-3.5" />
                      Revealed!
                    </span>
                  ) : partnerResponse ? (
                    <span className="text-[11px] text-amber-400 flex items-center gap-1 font-medium">
                      <Lock className="w-3.5 h-3.5" />
                      Answer ready & locked
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Waiting for answer
                    </span>
                  )}
                </div>

                {bothAnswered && partnerResponse ? (
                  /* Revealed State */
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <p className="text-sm text-pink-100 whitespace-pre-wrap leading-relaxed">
                      {partnerResponse.text}
                    </p>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] text-slate-500">
                        Submitted at {new Date(partnerResponse.answeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleHeartReaction}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                          hasHeartReacted
                            ? 'bg-rose-500/30 border-rose-400 text-rose-300'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-rose-400'
                        }`}
                        title="React with love"
                      >
                        <Heart className={`w-3.5 h-3.5 ${hasHeartReacted ? 'fill-rose-400 text-rose-400' : ''}`} />
                        <span>{hasHeartReacted ? 'Loved' : 'Send Love'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Locked Frosted Glass Mask */
                  <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h5 className="text-xs font-semibold text-slate-300">
                      {partnerResponse ? `${partnerName} has answered!` : `Waiting for ${partnerName}`}
                    </h5>
                    <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                      {!myResponse
                        ? 'Submit your own answer to unlock both responses together.'
                        : `Answers will automatically unlock as soon as ${partnerName} completes today's prompt.`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
