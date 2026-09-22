import React, { useState } from 'react';
import {
  Heart,
  Users,
  Search,
  UserPlus,
  X,
  Sparkles,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { UserAccount, RelationshipType, ContactRequest, UserProfile } from '../../types';
import { searchUserByUsernameInFirestore, sendContactRequestToFirestore } from '../../lib/firebase';
import { getStoredAccounts } from '../../lib/storage';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  currentPartnersCount: number;
  initialType?: RelationshipType;
  existingContacts: UserProfile[];
  onContactRequestSent: (request: ContactRequest) => void;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentPartnersCount,
  initialType = 'friend',
  existingContacts,
  onContactRequestSent
}) => {
  const [targetUsername, setTargetUsername] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>(initialType);
  const [partnerNickname, setPartnerNickname] = useState('');
  const [partnerAnniversary, setPartnerAnniversary] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<UserAccount | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = targetUsername.trim().replace(/^@/, '').toLowerCase();
    if (!clean) return;

    if (clean === currentUser.username.toLowerCase()) {
      setError('You cannot send a contact request to yourself.');
      setSearchResult(null);
      setSearchAttempted(true);
      return;
    }

    setError(null);
    setSearching(true);
    setSearchAttempted(true);
    setSearchResult(null);
    setSentSuccess(false);

    try {
      // 1. Check local accounts
      const localAccounts = getStoredAccounts();
      const localMatch = localAccounts.find(
        (a) =>
          (a.username && a.username.toLowerCase() === clean) ||
          a.email.toLowerCase().split('@')[0] === clean ||
          a.name.toLowerCase().replace(/\s+/g, '') === clean
      );

      if (localMatch && localMatch.id !== currentUser.id) {
        setSearchResult(localMatch);
        setSearching(false);
        return;
      }

      // 2. Query Firestore
      const remoteUser = await searchUserByUsernameInFirestore(clean);
      if (remoteUser && remoteUser.id !== currentUser.id) {
        setSearchResult(remoteUser);
      } else {
        setSearchResult(null);
      }
    } catch (err) {
      console.warn('Search error:', err);
      setError('Failed to search for user. Please check your connection.');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult) return;

    if (relationshipType === 'partner' && currentPartnersCount >= 2) {
      setError('You have reached the maximum of 2 partners allowed in your Sanctuary.');
      return;
    }

    const alreadyAdded = existingContacts.some(
      (c) => c.id === searchResult.id || (c.username && c.username.toLowerCase() === searchResult.username.toLowerCase())
    );

    if (alreadyAdded) {
      setError(`@${searchResult.username} is already in your contacts!`);
      return;
    }

    const request: ContactRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderUsername: currentUser.username,
      senderAvatar: currentUser.avatar,
      receiverId: searchResult.id,
      receiverUsername: searchResult.username,
      receiverName: searchResult.name,
      receiverAvatar: searchResult.avatar,
      relationshipType,
      partnerNickname: relationshipType === 'partner' ? partnerNickname.trim() || undefined : undefined,
      partnerAnniversary: relationshipType === 'partner' ? partnerAnniversary || undefined : undefined,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      await sendContactRequestToFirestore(request);
      onContactRequestSent(request);
      setSentSuccess(true);
    } catch (err) {
      console.warn('Error sending request:', err);
      setError('Failed to send request. Please try again.');
    }
  };

  const handleSendDirectRequest = async () => {
    const clean = targetUsername.trim().replace(/^@/, '').toLowerCase();
    if (!clean) return;

    if (relationshipType === 'partner' && currentPartnersCount >= 2) {
      setError('You have reached the maximum of 2 partners allowed in your Sanctuary.');
      return;
    }

    const alreadyAdded = existingContacts.some(
      (c) => c.username && c.username.toLowerCase() === clean
    );

    if (alreadyAdded) {
      setError(`@${clean} is already in your contacts!`);
      return;
    }

    const request: ContactRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderUsername: currentUser.username,
      senderAvatar: currentUser.avatar,
      receiverId: `user_${clean}`,
      receiverUsername: clean,
      receiverName: targetUsername.trim().replace(/^@/, ''),
      receiverAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(clean)}`,
      relationshipType,
      partnerNickname: relationshipType === 'partner' ? partnerNickname.trim() || undefined : undefined,
      partnerAnniversary: relationshipType === 'partner' ? partnerAnniversary || undefined : undefined,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      await sendContactRequestToFirestore(request);
      onContactRequestSent(request);
      setSentSuccess(true);
    } catch (err) {
      console.warn('Error sending direct request:', err);
      setError('Failed to dispatch request. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Add by Username</h3>
              <p className="text-xs text-slate-400">Send an intimate partner or friend request</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="py-4 space-y-4">
          {/* Relationship Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Relationship Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRelationshipType('partner')}
                className={`py-2.5 px-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-all border ${
                  relationshipType === 'partner'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md shadow-rose-500/15 ring-1 ring-rose-500/50'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Heart className="w-4 h-4 text-rose-400 fill-rose-400/40" />
                <span>Partner ({currentPartnersCount}/2)</span>
              </button>

              <button
                type="button"
                onClick={() => setRelationshipType('friend')}
                className={`py-2.5 px-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-all border ${
                  relationshipType === 'friend'
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-500/15 ring-1 ring-indigo-500/50'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Friend</span>
              </button>
            </div>
          </div>

          {/* Search by @username */}
          <form onSubmit={handleSearch} className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Target Username
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  @
                </span>
                <input
                  type="text"
                  value={targetUsername}
                  onChange={(e) => {
                    setTargetUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                    setSearchAttempted(false);
                    setSearchResult(null);
                    setSentSuccess(false);
                    setError(null);
                  }}
                  placeholder="enter username (e.g. elena)"
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={searching || !targetUsername.trim()}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/20 cursor-pointer"
              >
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>Search</span>
              </button>
            </div>
          </form>

          {/* Error notice */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Search Result Card */}
          {searchResult && !sentSuccess && (
            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <img
                  src={searchResult.avatar}
                  alt={searchResult.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-rose-400/80"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-white truncate">{searchResult.name}</h4>
                  <p className="text-xs text-rose-400 font-mono">@{searchResult.username}</p>
                  {searchResult.bio && (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{searchResult.bio}</p>
                  )}
                </div>
              </div>

              {/* Partner-specific customizations if sending as partner */}
              {relationshipType === 'partner' && (
                <div className="pt-2 border-t border-slate-700/60 space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Nickname for Partner <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={partnerNickname}
                      onChange={(e) => setPartnerNickname(e.target.value)}
                      placeholder="e.g. My Love, Sweetheart, Honey"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Anniversary Date <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      value={partnerAnniversary}
                      onChange={(e) => setPartnerAnniversary(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleSendRequest}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>
                  Send {relationshipType === 'partner' ? 'Partner Sanctuary' : 'Friend'} Request to @{searchResult.username}
                </span>
              </button>
            </div>
          )}

          {/* Not found state with option to dispatch invitation anyway */}
          {searchAttempted && !searching && !searchResult && !error && (
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-center text-xs text-slate-400 space-y-3">
              <div>
                <p className="font-semibold text-slate-200">No active profile found for "@{targetUsername}"</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  You can send an invitation to <strong className="text-rose-400 font-mono">@{targetUsername}</strong> directly. The request will automatically appear in their Sanctuary the moment they sign in!
                </p>
              </div>

              {relationshipType === 'partner' && (
                <div className="pt-2 border-t border-slate-700/60 space-y-2 text-left">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Nickname for Partner <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={partnerNickname}
                      onChange={(e) => setPartnerNickname(e.target.value)}
                      placeholder="e.g. My Love, Sweetheart"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Anniversary Date <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      value={partnerAnniversary}
                      onChange={(e) => setPartnerAnniversary(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleSendDirectRequest}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Send Request to @{targetUsername}</span>
              </button>
            </div>
          )}

          {/* Success confirmation */}
          {sentSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs space-y-2 animate-in zoom-in-95">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Request Dispatched!</span>
              </div>
              <p className="leading-relaxed">
                We sent your {relationshipType} connection request to{' '}
                <strong className="text-white font-mono">@{targetUsername}</strong>.
                As soon as they accept, they will automatically appear in your contacts list!
              </p>
              <button
                type="button"
                onClick={() => {
                  setSentSuccess(false);
                  setTargetUsername('');
                  setSearchResult(null);
                  setSearchAttempted(false);
                  onClose();
                }}
                className="mt-2 w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
