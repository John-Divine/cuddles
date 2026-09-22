import React, { useState } from 'react';
import {
  User,
  Sparkles,
  Shield,
  Camera,
  X,
  Check,
  Heart,
  HardDrive,
  Trash2,
  Clock,
  Moon,
  Sun,
  MapPin,
  Calendar,
  LogOut,
  Download,
  Smartphone
} from 'lucide-react';
import { UserProfile, DayScheduleStatus } from '../../types';
import { AUTO_PURGE_DAYS } from '../../lib/storage';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from '../pwa/PWAInstallModal';

interface ProfileModalProps {
  user: UserProfile;
  isOwnProfile?: boolean;
  onUpdateUser?: (updates: Partial<UserProfile>) => void;
  onSignOut?: () => void;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  isOwnProfile = true,
  onUpdateUser,
  onSignOut,
  onClose
}) => {
  const [name, setName] = useState(user.name);
  const [status, setStatus] = useState(user.status);
  const [moodEmoji, setMoodEmoji] = useState(user.moodEmoji || '💖');
  const [avatar, setAvatar] = useState(user.avatar);
  const [bio, setBio] = useState(user.bio || '');
  const [location, setLocation] = useState(user.location || '');
  const [partnerNickname, setPartnerNickname] = useState(user.partnerNickname || '');
  const [showInstallModal, setShowInstallModal] = useState(false);
  const { isInstalled, platformName } = usePWAInstall();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnProfile || !onUpdateUser) return;
    onUpdateUser({
      name: name.trim(),
      status: status.trim(),
      moodEmoji,
      avatar,
      bio: bio.trim(),
      location: location.trim(),
      partnerNickname: partnerNickname.trim() || undefined
    });
    onClose();
  };

  const handlePresetAvatar = (seed: string) => {
    setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-rose-950/50 p-5 sm:p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
              {isOwnProfile ? <User className="w-5 h-5" /> : <Heart className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {isOwnProfile ? 'Your Cuddles Profile' : `${user.name}'s Profile`}
              </h3>
              <p className="text-xs text-slate-400">
                {isOwnProfile ? 'Editable on-device profile & cloud privacy' : 'Contact details & current schedule'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Profile Content */}
        <div className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Avatar display */}
          <div className="flex flex-col items-center justify-center gap-2.5">
            <div className="relative">
              <img
                src={isOwnProfile ? avatar : user.avatar}
                alt={user.name}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-rose-500/40 shadow-xl"
              />
              <span className="absolute -bottom-1 -right-1 text-base bg-slate-900 rounded-full p-1 shadow border border-slate-700">
                {isOwnProfile ? moodEmoji : user.moodEmoji || '💕'}
              </span>
            </div>

            {isOwnProfile && (
              <div className="flex gap-1.5 flex-wrap justify-center">
                {['Alex', 'Sam', 'Taylor', 'Jordan', 'Riley', 'Morgan'].map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => handlePresetAvatar(preset)}
                    className="px-2.5 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700 font-medium transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* If viewing other contact's profile */}
          {!isOwnProfile ? (
            <div className="space-y-3">
              <div className="text-center">
                <h4 className="font-bold text-lg text-white">{user.name}</h4>
                {user.partnerNickname && (
                  <p className="text-xs text-rose-300 font-medium">"{user.partnerNickname}"</p>
                )}
                <p className="text-xs text-slate-400 mt-1">{user.status}</p>
              </div>

              {/* Relationship Tag */}
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs">
                <span className="text-slate-400">Relationship</span>
                <span className="font-semibold text-rose-300 flex items-center gap-1">
                  {user.relationshipType === 'partner' ? (
                    <>
                      <Heart className="w-3.5 h-3.5 fill-current text-rose-400" />
                      Partner (Max 2 Allowed)
                    </>
                  ) : (
                    'Close Friend'
                  )}
                </span>
              </div>

              {/* Anniversary if Partner */}
              {user.partnerAnniversary && (
                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-pink-400" />
                    Anniversary
                  </span>
                  <span className="font-semibold text-white">
                    {new Date(user.partnerAnniversary).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              )}

              {/* Current Day Schedule Status */}
              {user.currentSchedule && (
                <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-amber-500/30">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5" />
                      Current Schedule Status
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      user.currentSchedule.isBusy
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {user.currentSchedule.isBusy ? 'Busy / Silent Mode' : 'Available'}
                    </span>
                  </div>
                  <p className="text-xs text-white font-medium">{user.currentSchedule.activityTitle}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Until {user.currentSchedule.untilTime}</p>
                </div>
              )}

              {/* Bio & Location */}
              {user.bio && (
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50 text-xs">
                  <span className="text-slate-400 block mb-1 font-medium">About</span>
                  <p className="text-slate-200">{user.bio}</p>
                </div>
              )}

              {user.location && (
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center gap-2 text-xs text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>{user.location}</span>
                </div>
              )}
            </div>
          ) : (
            /* Editing Own Profile */
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Display Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Mood & Status Note</label>
                <div className="flex gap-2">
                  <select
                    value={moodEmoji}
                    onChange={(e) => setMoodEmoji(e.target.value)}
                    className="px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    <option value="💖">💖 In Love</option>
                    <option value="✨">✨ Energetic</option>
                    <option value="☕">☕ Relaxed</option>
                    <option value="🧗">🧗 Adventurous</option>
                    <option value="🌙">🌙 Sleepy</option>
                    <option value="💻">💻 Busy</option>
                  </select>
                  <input
                    type="text"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    placeholder="Status note seen by partners & friends"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Bio</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a sweet thought or bio..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-xs font-semibold text-white shadow-lg shadow-rose-600/30 transition-all active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* Privacy & Storage Architecture Notice (User's explicit requirement) */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-rose-900/30 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-rose-300">
              <HardDrive className="w-4 h-4 text-rose-400" />
              <span>Storage Architecture & Privacy Policy</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              • <strong>On-Device Only:</strong> Profiles and all media (video notes, photos, audio clips) are saved strictly to local device storage for privacy.
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              • <strong>14-Day Ephemeral Text:</strong> Text messages automatically disappear every {AUTO_PURGE_DAYS} days (13–15 days cycle) to keep the online database lightweight and free.
            </p>
          </div>

          {/* Security Fingerprint */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>E2EE Key Fingerprint</span>
            </div>
            <span className="font-mono text-emerald-400 font-bold tracking-wider">
              {user.safetyFingerprint}
            </span>
          </div>

          {/* Cloud Database Integration Status */}
          <div className="p-3 rounded-2xl bg-slate-950/90 border border-emerald-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium">Firebase Free Tier (Spark)</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-300/80 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30">
              Firestore Connected
            </span>
          </div>

          {/* PWA App Installation Option */}
          {!isInstalled && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-950 to-pink-950/30 border border-rose-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Install on {platformName}</span>
                  <span className="text-[11px] text-slate-400">Launch fullscreen from your home screen</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallModal(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 cursor-pointer transition-all active:scale-95"
              >
                Install
              </button>
            </div>
          )}

          {/* Sign Out / Switch Account */}
          {isOwnProfile && onSignOut && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onSignOut();
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-800/80 hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 border border-rose-900/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <LogOut className="w-4 h-4" />
                Sign Out / Switch Account
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PWA Install Modal */}
      <PWAInstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </div>
  );
};
