import React, { useState } from 'react';
import { Users, Plus, Phone, MessageSquare, Trash2, Search, Sparkles } from 'lucide-react';
import { UserProfile } from '../../types';

interface FriendsModalProps {
  friends: UserProfile[];
  onAddFriend: (friend: Omit<UserProfile, 'id' | 'safetyFingerprint'>) => void;
  onRemoveFriend: (id: string) => void;
  onStartChat: (friendId: string) => void;
  onStartCall: (friendId: string, type: 'audio' | 'video') => void;
  onClose: () => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  friends,
  onAddFriend,
  onRemoveFriend,
  onStartChat,
  onStartCall,
  onClose,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Available to chat');
  const [moodEmoji, setMoodEmoji] = useState('✨');

  const filteredFriends = friends.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.status.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddFriend({
      name: name.trim(),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`,
      status: status.trim(),
      moodEmoji,
      online: true,
      relationshipType: 'friend',
      verifiedKey: true
    });

    setIsAdding(false);
    setName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Friends Network</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  {friends.length} Friends
                </span>
              </div>
              <p className="text-xs text-slate-400">Connect with your broader circle & group chats</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg text-sm"
          >
            ✕
          </button>
        </div>

        {/* Search & Add action */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search friends..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Friend
          </button>
        </div>

        {/* Add Friend Form */}
        {isAdding && (
          <form onSubmit={handleAdd} className="mt-3 p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2.5">
            <h4 className="text-xs font-semibold text-indigo-300">Add New Friend</h4>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Name</label>
              <input
                type="text"
                required
                placeholder="Friend's full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={moodEmoji}
                onChange={(e) => setMoodEmoji(e.target.value)}
                className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              >
                <option value="✨">✨ Cool</option>
                <option value="🎮">🎮 Gaming</option>
                <option value="☕">☕ Chill</option>
                <option value="🏔️">🏔️ Outdoors</option>
                <option value="🎵">🎵 Music</option>
              </select>
              <input
                type="text"
                placeholder="Custom status message"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
              >
                Save Friend
              </button>
            </div>
          </form>
        )}

        {/* List */}
        <div className="mt-4 space-y-2.5 overflow-y-auto pr-1 flex-1">
          {filteredFriends.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No friends found matching your search.
            </div>
          ) : (
            filteredFriends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      className="w-10 h-10 rounded-full object-cover bg-slate-800 ring-1 ring-slate-700"
                    />
                    <span className="absolute -bottom-1 -right-1 text-xs">
                      {friend.moodEmoji || '✨'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-white text-xs">{friend.name}</span>
                      {friend.online ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      ) : (
                        <span className="text-[10px] text-slate-500">{friend.lastSeen || 'offline'}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-xs">
                      {friend.status}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      onStartChat(friend.id);
                      onClose();
                    }}
                    className="p-2 rounded-lg bg-slate-700/60 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 transition-colors"
                    title="Message Friend"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      onStartCall(friend.id, 'video');
                      onClose();
                    }}
                    className="p-2 rounded-lg bg-slate-700/60 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 transition-colors"
                    title="Start Call"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onRemoveFriend(friend.id)}
                    className="p-2 rounded-lg bg-slate-700/60 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                    title="Remove Friend"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
