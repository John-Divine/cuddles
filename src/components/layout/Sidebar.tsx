import React, { useState } from 'react';
import {
  Heart,
  Users,
  Search,
  Lock,
  Calendar,
  Phone,
  Video,
  Plus,
  Pin,
  Sparkles,
  Settings,
  ShieldCheck,
  UserCheck,
  Moon,
  HardDrive,
  Bell,
  UserPlus,
  Download
} from 'lucide-react';
import { Conversation, UserProfile } from '../../types';
import { AUTO_PURGE_DAYS } from '../../lib/storage';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string;
  partners: UserProfile[];
  friends: UserProfile[];
  currentUser: UserProfile;
  pendingRequestsCount?: number;
  onSelectConversation: (id: string) => void;
  onOpenPartnersModal: () => void;
  onOpenFriendsModal: () => void;
  onOpenScheduleModal: () => void;
  onOpenProfileModal: () => void;
  onOpenRequestsModal?: () => void;
  onOpenAddContactModal?: () => void;
  onOpenInstallModal?: () => void;
  onStartCall: (conversationId: string, type: 'audio' | 'video') => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  partners,
  friends,
  currentUser,
  pendingRequestsCount = 0,
  onSelectConversation,
  onOpenPartnersModal,
  onOpenFriendsModal,
  onOpenScheduleModal,
  onOpenProfileModal,
  onOpenRequestsModal,
  onOpenAddContactModal,
  onOpenInstallModal,
  onStartCall,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { isInstalled, platformName } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'all' | 'partners' | 'groups' | 'friends'>('all');
  const [search, setSearch] = useState('');

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.lastMessage?.text || '').toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'partners') return c.partnerIds && c.partnerIds.length > 0 && !c.isGroup;
    if (activeTab === 'groups') return c.isGroup;
    if (activeTab === 'friends') return (!c.partnerIds || c.partnerIds.length === 0) && !c.isGroup;
    return true;
  });

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 w-80 sm:w-88 bg-slate-900/95 border-r border-rose-950/40 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 backdrop-blur-xl ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* App Brand Header: Cuddles */}
      <div className="p-3.5 border-b border-rose-950/40 flex items-center justify-between bg-slate-900/90">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-500 p-0.5 shadow-md shadow-rose-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-base tracking-tight text-white">Cuddles</h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                E2EE
              </span>
            </div>
            <p className="text-[10px] text-rose-200/70 font-medium">
              @{currentUser.username || 'user'} • Sanctuary
            </p>
          </div>
        </div>

        {/* Action icons: Add contact, Requests, Day Schedules & Profile */}
        <div className="flex items-center gap-1">
          {onOpenAddContactModal && (
            <button
              onClick={onOpenAddContactModal}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-slate-800/80 transition-colors"
              title="Add Contact by @Username"
            >
              <UserPlus className="w-4.5 h-4.5" />
            </button>
          )}

          {onOpenRequestsModal && (
            <button
              onClick={onOpenRequestsModal}
              className="relative p-2 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-slate-800/80 transition-colors"
              title="Contact Requests"
            >
              <Bell className="w-4.5 h-4.5" />
              {pendingRequestsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center ring-2 ring-slate-900 animate-pulse">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={onOpenScheduleModal}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-slate-800/80 transition-colors"
            title="Day Schedules & Quiet Mode"
          >
            <Calendar className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={onOpenProfileModal}
            className="relative p-1 rounded-xl hover:ring-2 hover:ring-rose-500/50 transition-all ml-0.5"
            title="Your Profile & Storage Settings"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-7 h-7 rounded-full object-cover ring-1 ring-rose-400"
            />
            <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">
              {currentUser.moodEmoji}
            </span>
          </button>
        </div>
      </div>

      {/* Partners Sanctuary Priority Bar (Max 2 Allowed) */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-rose-950/50 via-pink-950/30 to-slate-900 border-b border-rose-900/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/50" />
            <span className="text-xs font-bold text-rose-200">Partners ({partners.length}/2)</span>
          </div>
          <button
            onClick={onOpenPartnersModal}
            className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold underline underline-offset-2"
          >
            Manage
          </button>
        </div>

        {/* Partners Quick Row with Schedule Badges */}
        <div className="flex items-center gap-2">
          {partners.map((partner) => {
            const isBusy = partner.currentSchedule?.isBusy;

            return (
              <div
                key={partner.id}
                onClick={() => {
                  const conv = conversations.find(
                    (c) => !c.isGroup && c.participantIds.includes(partner.id)
                  );
                  if (conv) {
                    onSelectConversation(conv.id);
                    onCloseMobile?.();
                  }
                }}
                className="flex-1 flex items-center gap-2 p-1.5 px-2 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-rose-500/20 hover:border-rose-500/50 cursor-pointer transition-all shadow-sm"
              >
                <div className="relative shrink-0">
                  <img
                    src={partner.avatar}
                    alt={partner.name}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-rose-400/80"
                  />
                  <span className="absolute -bottom-1 -right-1 text-[10px]">
                    {partner.moodEmoji || '💖'}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-white truncate block">
                      {partner.partnerNickname || partner.name.split(' ')[0]}
                    </span>
                    {isBusy && (
                      <span title="Busy (Focus mode)">
                        <Moon className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-rose-300 truncate block">
                    {isBusy ? partner.currentSchedule?.activityTitle : partner.status}
                  </span>
                </div>
              </div>
            );
          })}

          {partners.length < 2 && (
            <button
              onClick={onOpenPartnersModal}
              className="flex items-center justify-center p-2 rounded-2xl border border-dashed border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs gap-1 transition-all"
              title="Add second partner (max 2)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold">Slot 2</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search chats, messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-3 pb-2 flex gap-1 border-b border-rose-950/30">
        {[
          { id: 'all', label: 'All' },
          { id: 'partners', label: 'Partners 💕' },
          { id: 'groups', label: 'Groups' },
          { id: 'friends', label: 'Friends' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-1 text-[11px] font-semibold rounded-xl transition-colors whitespace-nowrap text-center ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-sm shadow-rose-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredConversations.length === 0 ? (
          <div className="py-12 px-4 text-center text-xs text-slate-400 space-y-3">
            <p className="font-semibold text-slate-300">No conversations yet</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Connect with people by sending a partner or friend request to their @username!
            </p>
            {onOpenAddContactModal && (
              <button
                type="button"
                onClick={onOpenAddContactModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add by @Username</span>
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const isPartnerChat = conv.partnerIds && conv.partnerIds.length > 0 && !conv.isGroup;

            // Resolve the other party's name and avatar for 1-on-1 chats
            const allContacts = [...partners, ...friends];
            const otherParticipantId = !conv.isGroup
              ? conv.participantIds.find((id) => id !== currentUser.id)
              : null;
            const matchingContact = otherParticipantId
              ? allContacts.find(
                  (c) =>
                    c.id === otherParticipantId ||
                    (c.username && otherParticipantId.toLowerCase().includes(c.username.toLowerCase()))
                )
              : null;

            const displayTitle = matchingContact
              ? (matchingContact.partnerNickname || matchingContact.name)
              : conv.title;
            const displayAvatar = matchingContact ? matchingContact.avatar : conv.avatar;

            return (
              <div
                key={conv.id}
                onClick={() => {
                  onSelectConversation(conv.id);
                  onCloseMobile?.();
                }}
                className={`flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-all ${
                  isActive
                    ? 'bg-rose-600/20 border border-rose-500/50 shadow-sm'
                    : 'hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {displayAvatar ? (
                    <img
                      src={displayAvatar}
                      alt={displayTitle}
                      className={`w-11 h-11 rounded-full object-cover ring-2 ${
                        isPartnerChat ? 'ring-rose-400' : 'ring-pink-500/40'
                      }`}
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-rose-700 to-pink-600 flex items-center justify-center font-bold text-white text-sm shadow">
                      <Users className="w-5 h-5 text-rose-100" />
                    </div>
                  )}
                  {conv.isE2EESecure && (
                    <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-900 text-emerald-400 shadow">
                      <Lock className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                {/* Conversation Meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="font-semibold text-xs text-white truncate flex items-center gap-1.5">
                      {displayTitle}
                      {isPartnerChat && <span className="text-rose-400 text-[10px]">💕</span>}
                    </h3>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {conv.lastMessage?.timestamp}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className="text-[11px] text-slate-400 truncate">
                      {conv.lastMessage?.text || 'No messages yet'}
                    </p>
                    {conv.lastMessage?.unreadCount ? (
                      <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {conv.lastMessage.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PWA Install Button on Any Device */}
      {!isInstalled && onOpenInstallModal && (
        <div className="px-3 py-2 border-t border-rose-950/40 bg-gradient-to-r from-rose-950/30 to-slate-900">
          <button
            type="button"
            onClick={onOpenInstallModal}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-rose-900/40 border border-rose-500/30 text-xs text-rose-200 hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Download className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-semibold">Install App</span>
            </div>
            <span className="text-[10px] bg-rose-500/20 text-rose-300 font-bold px-1.5 py-0.5 rounded-md border border-rose-500/30">
              {platformName}
            </span>
          </button>
        </div>
      )}

      {/* Bottom Footer Actions */}
      <div className="p-3 border-t border-rose-950/40 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
        <button
          onClick={onOpenFriendsModal}
          className="flex items-center gap-1.5 hover:text-pink-300 transition-colors"
        >
          <Users className="w-4 h-4 text-pink-400" />
          <span>Friends ({friends.length})</span>
        </button>

        <button
          onClick={onOpenPartnersModal}
          className="flex items-center gap-1.5 hover:text-rose-300 transition-colors"
        >
          <Heart className="w-4 h-4 text-rose-400 fill-rose-400/30" />
          <span>Partners ({partners.length}/2)</span>
        </button>
      </div>
    </aside>
  );
};
