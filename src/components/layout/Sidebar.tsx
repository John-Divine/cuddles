import React, { useState, useRef, useEffect } from 'react';
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
  Download,
  Image as ImageIcon,
  MoreVertical,
  X
} from 'lucide-react';
import { Conversation, UserProfile } from '../../types';
import { AUTO_PURGE_DAYS } from '../../lib/storage';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { getConversationDisplayDetails } from '../../lib/conversationResolver';
import { AkomaIcon } from '../common/AdinkraIcons';

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
  onOpenMediaGallery?: () => void;
  onOpenMemoriesVault?: () => void;
  onStartCall: (conversationId: string, type: 'audio' | 'video') => void;
  isMobileOpen?: boolean;
  isMobileFullWidth?: boolean;
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
  onOpenMediaGallery,
  onOpenMemoriesVault,
  onStartCall,
  isMobileOpen = false,
  isMobileFullWidth = false,
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

  const safePartners = partners.filter((p) => 
    p.id !== currentUser.id && 
    p.name.trim().toLowerCase() !== currentUser.name.trim().toLowerCase() && 
    (!currentUser.username || p.username?.trim().toLowerCase().replace(/^@/, '') !== currentUser.username.trim().toLowerCase().replace(/^@/, ''))
  );

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [showMenu]);

  return (
    <aside
      className={
        isMobileFullWidth
          ? 'w-full max-w-full lg:max-w-sm lg:w-88 bg-[#021810] border-r border-amber-500/20 flex flex-col shadow-2xl h-full static translate-x-0 backdrop-blur-2xl z-30'
          : `fixed inset-y-0 left-0 z-[100] w-full max-w-[340px] sm:max-w-sm sm:w-88 bg-[#021810] border-r border-amber-500/20 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 backdrop-blur-2xl ${
              isMobileOpen ? 'translate-x-0' : '-translate-x-full'
            }`
      }
    >
      {/* Streamlined, Spacious Nav Header: Profile on Left, Bell + Menu on Right */}
      <div className="p-3 sm:py-3.5 border-b border-amber-500/20 bg-[#021e14]/98 flex items-center justify-between gap-2 select-none">
        {/* Left: User Profile Avatar & App Identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => {
              onCloseMobile?.();
              onOpenProfileModal();
            }}
            className="relative w-11 h-11 rounded-2xl hover:ring-2 hover:ring-amber-400/60 transition-all active:scale-95 flex items-center justify-center cursor-pointer shrink-0"
            title={`Your Profile & Account Settings (@${currentUser.username || 'user'}) - Click to change photo`}
            aria-label="Your Profile"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400/80 shadow-md"
            />
            <span className="absolute -bottom-0.5 -right-0.5 text-xs bg-[#021e14] rounded-full p-0.5 border border-amber-500/30">
              {currentUser.moodEmoji}
            </span>
          </button>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-amber-200 tracking-tight leading-none truncate">
              Cuddles
            </h2>
            <p className="text-[10px] text-emerald-400/80 truncate font-medium mt-0.5">
              Couple Sanctuary
            </p>
          </div>
        </div>

        {/* Right: Notifications Bell, Consolidated 3-Dots Menu, Mobile Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Connection Requests Icon */}
          {onOpenRequestsModal && (
            <button
              onClick={() => {
                onCloseMobile?.();
                onOpenRequestsModal();
              }}
              className="relative p-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 hover:text-amber-300 flex items-center justify-center active:scale-95 transition-all shadow-sm cursor-pointer"
              title="Connection Requests"
              aria-label="Connection Requests"
            >
              <Bell className="w-5 h-5" />
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-extrabold flex items-center justify-center ring-2 ring-slate-900 animate-pulse">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          )}

          {/* Consolidated 3-Dots Menu - Houses all auxiliary feature icons */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className={`p-2 rounded-xl border active:scale-95 transition-all cursor-pointer flex items-center justify-center ${
                showMenu
                  ? 'bg-amber-500/25 text-amber-300 border-amber-400'
                  : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-white border-emerald-800/80 shadow-sm'
              }`}
              title="More options & features"
              aria-label="More options"
            >
              <MoreVertical className="w-5 h-5 shrink-0" />
            </button>

            {showMenu && (
              <div
                className="absolute right-0 top-12 rounded-3xl bg-[#021e14]/98 border border-amber-500/35 shadow-2xl p-2.5 z-50 backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 select-none w-64 text-white"
                style={{ filter: 'drop-shadow(0 25px 35px rgba(0, 0, 0, 0.9))' }}
              >
                <div className="flex flex-col gap-1">
                  {/* 1. All Media Gallery */}
                  {onOpenMediaGallery && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onCloseMobile?.();
                        onOpenMediaGallery();
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-emerald-900/60 active:bg-emerald-900 text-left transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-amber-300 truncate">All Media Gallery</div>
                        <div className="text-[10px] text-emerald-400/70 truncate">Photos, videos & notes across chats</div>
                      </div>
                    </button>
                  )}

                  {/* 2. Add Partner or Friend */}
                  {onOpenAddContactModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onCloseMobile?.();
                        onOpenAddContactModal();
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-emerald-900/60 active:bg-emerald-900 text-left transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-emerald-200 truncate">Add Contact</div>
                        <div className="text-[10px] text-emerald-400/70 truncate">Invite partner or friend by username</div>
                      </div>
                    </button>
                  )}

                  {/* 3. Day Schedules & Quiet Mode */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onCloseMobile?.();
                      onOpenScheduleModal();
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-emerald-900/60 active:bg-emerald-900 text-left transition-colors cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-emerald-200 truncate">Day Schedules</div>
                      <div className="text-[10px] text-emerald-400/70 truncate">Focus hours & quiet delivery mode</div>
                    </div>
                  </button>

                  {/* 4. Shared Memories & Milestones */}
                  {onOpenMemoriesVault && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onCloseMobile?.();
                        onOpenMemoriesVault();
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-emerald-900/60 active:bg-emerald-900 text-left transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
                        <AkomaIcon className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-amber-300 truncate">Memories & Milestones</div>
                        <div className="text-[10px] text-emerald-400/70 truncate">Anniversary vault & love timeline</div>
                      </div>
                    </button>
                  )}

                  {/* 5. Partners Sanctuary Modal */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onCloseMobile?.();
                      onOpenPartnersModal();
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-emerald-900/60 active:bg-emerald-900 text-left transition-colors cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center shrink-0 border border-rose-500/30">
                      <Heart className="w-4 h-4 fill-rose-500/30" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-rose-300 truncate">Manage Partners</div>
                      <div className="text-[10px] text-emerald-400/70 truncate">Up to 2 priority partners</div>
                    </div>
                  </button>

                  {/* 6. Friends Circle Modal */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onCloseMobile?.();
                      onOpenFriendsModal();
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-emerald-900/60 active:bg-emerald-900 text-left transition-colors cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-500/30">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-indigo-200 truncate">Friends Circle</div>
                      <div className="text-[10px] text-emerald-400/70 truncate">Manage friends & connections</div>
                    </div>
                  </button>

                  {/* 7. Profile & Settings */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onCloseMobile?.();
                      onOpenProfileModal();
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-emerald-900/60 active:bg-emerald-900 text-left transition-colors cursor-pointer group border-t border-amber-500/20 mt-1 pt-2"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 border border-slate-700">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-200 truncate">Profile & Settings</div>
                      <div className="text-[10px] text-emerald-400/70 truncate">Change profile photo & bio</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Close button for mobile drawer */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Partners Sanctuary Priority Bar (Max 2 Allowed) - Royal Emerald & Gold */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-950/90 via-emerald-900/40 to-[#021810] border-b border-amber-500/25">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <AkomaIcon className="w-3.5 h-3.5 text-amber-400" strokeWidth={2.4} />
            <span className="text-xs font-bold text-amber-200">Partners Sanctuary ({partners.length}/2)</span>
          </div>
          <div className="flex items-center gap-2">
            {onOpenMemoriesVault && (
              <button
                type="button"
                onClick={() => {
                  onCloseMobile?.();
                  onOpenMemoriesVault();
                }}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                title="Open Shared Memories & Milestones (Odo Nnyew Fie Kwan)"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Memories</span>
              </button>
            )}
            <button
              onClick={() => {
                onCloseMobile?.();
                onOpenPartnersModal();
              }}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 cursor-pointer"
            >
              Manage
            </button>
          </div>
        </div>

        {/* Partners Quick Row with Schedule Badges */}
        <div className="flex items-center gap-2">
          {safePartners.map((partner) => {
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

          {safePartners.length < 2 && (
            <button
              onClick={() => {
                onCloseMobile?.();
                onOpenPartnersModal();
              }}
              className="flex items-center justify-center p-2 rounded-2xl border border-dashed border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs gap-1 transition-all"
              title="Add second partner (max 2)"
            >
              <UserPlus className="w-3.5 h-3.5" />
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
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                : 'text-emerald-300/70 hover:text-emerald-100 hover:bg-emerald-950/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredConversations.length === 0 ? (
          <div className="py-12 px-4 text-center text-xs text-emerald-300/70 space-y-3">
            <p className="font-semibold text-emerald-200">No conversations yet</p>
            <p className="text-[11px] text-emerald-400/50 leading-relaxed">
              Connect with people by sending a partner or friend request to their @username!
            </p>
            {onOpenAddContactModal && (
              <button
                type="button"
                onClick={onOpenAddContactModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add by @Username</span>
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const allContacts = [...partners, ...friends];
            const details = getConversationDisplayDetails(conv, currentUser, allContacts);
            const isPartnerChat = details.isPartner;
            const displayTitle = details.title;
            const displayAvatar = details.avatar;

            return (
              <div
                key={conv.id}
                onClick={() => {
                  onSelectConversation(conv.id);
                  onCloseMobile?.();
                }}
                className={`flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[#032a1e] to-[#021f16] border-l-4 border-l-amber-400 border border-amber-500/35 shadow-md'
                    : 'hover:bg-emerald-950/60 border border-transparent text-emerald-100/90'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {displayAvatar ? (
                    <img
                      src={displayAvatar}
                      alt={displayTitle}
                      className={`w-11 h-11 rounded-full object-cover ring-2 ${
                        isPartnerChat ? 'ring-amber-400' : 'ring-emerald-500/40'
                      }`}
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center font-bold text-slate-950 text-sm shadow">
                      <Users className="w-5 h-5 text-slate-950" />
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

      {/* Bottom Footer Actions */}
      <div className="p-3 border-t border-rose-950/40 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
        <button
          onClick={onOpenFriendsModal}
          className="flex items-center gap-1.5 hover:text-pink-300 transition-colors cursor-pointer"
        >
          <Users className="w-4 h-4 text-pink-400" />
          <span>Friends ({friends.length})</span>
        </button>

        <button
          onClick={onOpenPartnersModal}
          className="flex items-center gap-1.5 hover:text-rose-300 transition-colors cursor-pointer"
        >
          <Heart className="w-4 h-4 text-rose-400 fill-rose-400/30" />
          <span>Partners ({partners.length}/2)</span>
        </button>

        <button
          onClick={onOpenProfileModal}
          className="flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer font-medium"
          title="Account Settings & Delete Account"
        >
          <Settings className="w-4 h-4 text-rose-400" />
          <span>Account</span>
        </button>
      </div>
    </aside>
  );
};
