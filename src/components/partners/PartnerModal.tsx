import React, { useState } from 'react';
import { Heart, Plus, Calendar, Sparkles, Phone, MessageSquare, AlertCircle, X, Trash2 } from 'lucide-react';
import { UserProfile } from '../../types';

interface PartnerModalProps {
  partners: UserProfile[];
  onAddPartner: (partner: Omit<UserProfile, 'id' | 'safetyFingerprint'>) => void;
  onUpdatePartner: (id: string, updates: Partial<UserProfile>) => void;
  onRemovePartner: (id: string) => void;
  onStartChat: (partnerId: string) => void;
  onStartCall: (partnerId: string, type: 'audio' | 'video') => void;
  onClose: () => void;
}

export const PartnerModal: React.FC<PartnerModalProps> = ({
  partners,
  onAddPartner,
  onUpdatePartner,
  onRemovePartner,
  onStartChat,
  onStartCall,
  onClose,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [status, setStatus] = useState('Thinking of you 💕');
  const [moodEmoji, setMoodEmoji] = useState('💖');
  const [anniversary, setAnniversary] = useState('');
  const [nickname, setNickname] = useState('');

  const isAtLimit = partners.length >= 2;

  const calculateDaysTogether = (dateStr?: string) => {
    if (!dateStr) return null;
    const start = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAtLimit) return;
    if (!name.trim()) return;

    onAddPartner({
      name: name.trim(),
      avatar: avatar.trim() || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      status: status.trim() || 'Connected with love',
      moodEmoji,
      online: true,
      relationshipType: 'partner',
      partnerAnniversary: anniversary || undefined,
      partnerNickname: nickname.trim() || undefined,
      verifiedKey: true
    });

    setIsAdding(false);
    setName('');
    setAvatar('');
    setAnniversary('');
    setNickname('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Heart className="w-5 h-5 fill-rose-500/30 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Partners Sanctuary</h3>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  isAtLimit 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}>
                  {partners.length} / 2 Maximum
                </span>
              </div>
              <p className="text-xs text-slate-400">Manage your closest intimate relationships</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content list */}
        <div className="mt-4 space-y-4 overflow-y-auto pr-1">
          {/* Rule notification */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p>
              Under Cuddles’ relationship protocol, an account can connect with <strong>at most two partners</strong>, while maintaining unlimited friends. Partners receive priority encryption, intimate widgets, and shared anniversary tracking.
            </p>
          </div>

          {/* Current Partners List */}
          <div className="space-y-3">
            {partners.map((partner) => {
              const days = calculateDaysTogether(partner.partnerAnniversary);
              const isEditing = editingId === partner.id;

              return (
                <div
                  key={partner.id}
                  className="rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-rose-500/20 p-4 transition-all hover:border-rose-500/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={partner.avatar}
                          alt={partner.name}
                          className="w-13 h-13 rounded-full object-cover ring-2 ring-rose-400/50 shadow-md"
                        />
                        <span className="absolute -bottom-1 -right-1 text-sm bg-slate-900 rounded-full p-0.5 shadow">
                          {partner.moodEmoji || '💖'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-white text-sm">
                            {partner.name}
                          </h4>
                          {partner.partnerNickname && (
                            <span className="text-xs text-rose-300 font-medium italic">
                              "{partner.partnerNickname}"
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <span>{partner.status}</span>
                        </p>
                        {days !== null && (
                          <div className="flex items-center gap-1.5 text-[11px] text-rose-400 font-medium mt-1">
                            <Sparkles className="w-3 h-3" />
                            <span>{days} days of shared love</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Partner Actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          onStartChat(partner.id);
                          onClose();
                        }}
                        className="p-2 rounded-lg bg-slate-700/60 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 transition-colors"
                        title="Open Private Encrypted Chat"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          onStartCall(partner.id, 'video');
                          onClose();
                        }}
                        className="p-2 rounded-lg bg-slate-700/60 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 transition-colors"
                        title="Start Video Call"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onRemovePartner(partner.id)}
                        className="p-2 rounded-lg bg-slate-700/60 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                        title="Remove Partner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Anniversary details */}
                  {partner.partnerAnniversary && (
                    <div className="mt-3 pt-2.5 border-t border-slate-700/40 flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-rose-400" />
                        Anniversary: {new Date(partner.partnerAnniversary).toLocaleDateString(undefined, { dateStyle: 'long' })}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        KEY: {partner.safetyFingerprint}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Partner Form or Button */}
          {!isAdding ? (
            <div>
              {isAtLimit ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Maximum of 2 partners reached. To add a different partner, remove or adjust one of your existing partner slots.
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => setIsAdding(true)}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-rose-500/30 hover:border-rose-500/60 text-rose-300 hover:text-rose-200 bg-rose-500/5 hover:bg-rose-500/10 flex items-center justify-center gap-2 text-xs font-semibold transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Partner ({partners.length}/2)
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSaveNew} className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-xs text-rose-300 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5" />
                  New Partner Profile
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Blake"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Intimate Nickname</label>
                  <input
                    type="text"
                    placeholder="e.g. Sweetheart"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Anniversary Date</label>
                  <input
                    type="date"
                    value={anniversary}
                    onChange={(e) => setAnniversary(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Mood / Status</label>
                <div className="flex gap-2">
                  <select
                    value={moodEmoji}
                    onChange={(e) => setMoodEmoji(e.target.value)}
                    className="px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                  >
                    <option value="💖">💖 In Love</option>
                    <option value="💕">💕 Soft</option>
                    <option value="☕">☕ Cozy</option>
                    <option value="✨">✨ Happy</option>
                    <option value="🌙">🌙 Dreamy</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Status note"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold text-xs shadow-lg shadow-rose-500/20 transition-all"
              >
                Save Partner
              </button>
            </form>
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
