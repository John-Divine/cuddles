import React, { useState } from 'react';
import {
  Sparkles,
  Compass,
  Radio,
  Ticket,
  X,
  Heart,
  Calendar
} from 'lucide-react';
import { DailyPromptView } from './DailyPromptView';
import { BucketListView } from './BucketListView';
import { MoodRadarView } from './MoodRadarView';
import { LoveVouchersView } from './LoveVouchersView';

interface IntimacyHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  conversationTitle: string;
  isPartner: boolean;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  partnerId?: string;
  partnerName: string;
  partnerAvatar?: string;
  onSendMessage?: (text: string) => void;
  initialTab?: 'prompt' | 'bucket' | 'mood' | 'vouchers';
}

type TabKey = 'prompt' | 'bucket' | 'mood' | 'vouchers';

export const IntimacyHubModal: React.FC<IntimacyHubModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  conversationTitle,
  isPartner,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  partnerId,
  partnerName,
  partnerAvatar,
  onSendMessage,
  initialTab = 'prompt'
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  if (!isOpen) return null;

  const tabs: Array<{ id: TabKey; label: string; icon: any; badge?: string }> = [
    { id: 'prompt', label: 'Daily Prompt', icon: Sparkles, badge: 'Daily' },
    { id: 'bucket', label: 'Bucket List', icon: Compass },
    { id: 'mood', label: 'Mood & Pulse', icon: Radio, badge: 'Live' },
    { id: 'vouchers', label: 'Love Vouchers', icon: Ticket }
  ];

  return (
    <div className="absolute inset-0 z-40 bg-slate-950/98 backdrop-blur-2xl flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Top Header */}
      <header className="shrink-0 p-3 sm:p-4 px-4 sm:px-6 bg-slate-900/95 border-b border-rose-950/40 flex items-center justify-between gap-3 shadow-md z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 shrink-0">
            <Heart className="w-5 h-5 fill-white text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white truncate">
                {isPartner ? 'Partner Connection & Intimacy Hub' : 'Friendship Connection Hub'}
              </h2>
              {isPartner && <span className="text-rose-400 text-xs">💕</span>}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
              <span>With {partnerName}</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 font-medium">Private 1-on-1 Sanctuary</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 sm:p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60 active:scale-95 transition-all cursor-pointer shrink-0"
          title="Close Intimacy Hub"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Tab Navigation Segmented Bar */}
      <div className="shrink-0 px-4 sm:px-6 py-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-rose-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab View Body */}
      <div className="flex-1 min-h-0 flex flex-col relative bg-slate-950/70">
        {activeTab === 'prompt' && (
          <DailyPromptView
            conversationId={conversationId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserAvatar={currentUserAvatar}
            partnerId={partnerId}
            partnerName={partnerName}
            partnerAvatar={partnerAvatar}
            onSendMessage={onSendMessage}
          />
        )}

        {activeTab === 'bucket' && (
          <BucketListView
            conversationId={conversationId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            partnerName={partnerName}
            onSendMessage={onSendMessage}
          />
        )}

        {activeTab === 'mood' && (
          <MoodRadarView
            conversationId={conversationId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserAvatar={currentUserAvatar}
            partnerId={partnerId}
            partnerName={partnerName}
            partnerAvatar={partnerAvatar}
            onSendMessage={onSendMessage}
          />
        )}

        {activeTab === 'vouchers' && (
          <LoveVouchersView
            conversationId={conversationId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            partnerId={partnerId}
            partnerName={partnerName}
            onSendMessage={onSendMessage}
          />
        )}
      </div>
    </div>
  );
};
