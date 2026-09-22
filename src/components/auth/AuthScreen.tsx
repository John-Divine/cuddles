import React, { useState } from 'react';
import {
  Heart,
  Lock,
  Mail,
  Key,
  User,
  Sparkles,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  UserPlus,
  LogIn,
  Camera,
  Sparkle
} from 'lucide-react';
import {
  registerNewAccount,
  authenticateAccount,
  getStoredAccounts,
  setActiveAccountId,
  saveStoredAccount
} from '../../lib/storage';
import { syncUserToFirestore } from '../../lib/firebase';
import { UserAccount } from '../../types';

interface AuthScreenProps {
  onAuthenticated: (account: UserAccount) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
];

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [partnerNickname, setPartnerNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);

  const existingAccounts = getStoredAccounts();

  const handleCustomAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomAvatar(reader.result);
        setSelectedAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your name or preferred nickname.');
        return;
      }

      const cleanUser = username.trim().replace(/^@/, '').toLowerCase();
      if (!cleanUser || cleanUser.length < 3) {
        setError('Please enter a username of at least 3 characters.');
        return;
      }

      if (!email.trim() || !email.includes('@')) {
        setError('Please enter a valid email address.');
        return;
      }

      // Check if email or username already registered
      const accounts = getStoredAccounts();
      if (accounts.some((a) => a.email.toLowerCase() === email.trim().toLowerCase())) {
        setError('An account with this email already exists. Please switch to Log In.');
        return;
      }
      if (accounts.some((a) => a.username && a.username.toLowerCase() === cleanUser)) {
        setError(`@${cleanUser} is already taken. Please choose another username.`);
        return;
      }

      const newAccount = registerNewAccount({
        name: name.trim(),
        username: cleanUser,
        email: email.trim(),
        password,
        avatar: customAvatar || selectedAvatar,
        partnerNickname: partnerNickname.trim() || undefined
      });

      // Sync to Firestore so other users can find them by username
      syncUserToFirestore(newAccount);

      setActiveAccountId(newAccount.id);
      onAuthenticated(newAccount);
    } else {
      // Sign in with email OR username
      if (!email.trim()) {
        setError('Please enter your email or @username.');
        return;
      }

      const account = authenticateAccount(email, password);
      if (!account) {
        setError('Incorrect username/email or password. If you do not have an account yet, tap Create Account.');
        return;
      }
      // Sync user to Firestore
      syncUserToFirestore(account);
      setActiveAccountId(account.id);
      onAuthenticated(account);
    }
  };

  // One-click demo guest login for instant testing
  const handleQuickDemoAccess = () => {
    const accounts = getStoredAccounts();
    let demoAcc = accounts.find((a) => a.email === 'alex@cuddles.app');
    if (!demoAcc) {
      demoAcc = registerNewAccount({
        name: 'Alex Morgan',
        email: 'alex@cuddles.app',
        password: 'password123',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        partnerNickname: 'My Love',
        partnerAnniversary: '2023-04-14'
      });
    }
    setActiveAccountId(demoAcc.id);
    onAuthenticated(demoAcc);
  };

  const handleQuickLogin = (acc: UserAccount) => {
    setActiveAccountId(acc.id);
    onAuthenticated(acc);
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-b from-slate-950 via-slate-900 to-rose-950/40 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto overflow-x-hidden selection:bg-rose-500 selection:text-white">
      {/* Decorative ambient background glows */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-ring" />
      <div className="fixed bottom-10 right-1/4 w-80 h-80 bg-pink-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-md my-auto flex flex-col py-6">
        {/* Cuddles Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 p-0.5 shadow-xl shadow-rose-600/25 mb-3">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
              <Heart className="w-8 h-8 text-rose-500 fill-rose-500 animate-heart-float" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            Cuddles
          </h1>
          <p className="text-xs text-rose-300/80 mt-1 font-medium">
            Private Sanctuary for Partners & Friends • 256-bit E2EE
          </p>
        </div>

        {/* Auth Form Card */}
        <div className="rounded-3xl bg-slate-900/90 border border-rose-500/20 backdrop-blur-xl p-6 sm:p-7 shadow-2xl shadow-rose-950/30">
          {/* Mode Tabs: Log In vs Create Account */}
          <div className="flex rounded-2xl bg-slate-800/90 p-1 mb-5 border border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'signin'
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'signup'
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Your Name or Display Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Julian, Maya, Alex"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>

                {/* Unique Username */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Unique Username
                    </label>
                    <span className="text-[11px] text-rose-400 font-medium">Used for friend & partner requests</span>
                  </div>
                  <div className="relative">
                    <span className="text-slate-400 font-bold absolute left-3.5 top-1/2 -translate-y-1/2 text-sm select-none">@</span>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="username"
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono lowercase"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Others can search and request to connect with you using @{username || 'username'}</p>
                </div>

                {/* Avatar Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Choose Your Avatar
                  </label>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {AVATAR_PRESETS.map((av, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedAvatar(av);
                          setCustomAvatar(null);
                        }}
                        className={`w-10 h-10 rounded-full overflow-hidden transition-all ${
                          selectedAvatar === av && !customAvatar
                            ? 'ring-3 ring-rose-500 scale-110 shadow-lg'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={av} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}

                    {/* Custom upload */}
                    <label className="w-10 h-10 rounded-full border border-dashed border-rose-400/50 hover:border-rose-400 flex items-center justify-center cursor-pointer bg-slate-800/50 text-rose-300 hover:text-white transition-colors" title="Upload custom photo">
                      <Camera className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCustomAvatar}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Partner Nickname */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Partner Nickname <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Heart className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={partnerNickname}
                      onChange={(e) => setPartnerNickname(e.target.value)}
                      placeholder="e.g. My Soulmate, Sweetheart"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email Address or Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {mode === 'signup' ? 'Email Address' : 'Email or @Username'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={mode === 'signup' ? 'email' : 'text'}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={mode === 'signup' ? 'name@example.com' : 'name@example.com or @username'}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 hover:from-rose-500 hover:to-pink-500 active:scale-98 text-white font-bold text-sm shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>{mode === 'signup' ? 'Create Cuddles Account' : 'Log In to Cuddles'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Access Button */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-center">
            <button
              type="button"
              onClick={handleQuickDemoAccess}
              className="w-full py-2 px-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-slate-700/50 cursor-pointer"
            >
              <Sparkle className="w-3.5 h-3.5 text-amber-400" />
              <span>Instant Demo Access (Skip Login)</span>
            </button>
          </div>

          {/* Privacy note */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-center flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted on your device • Never shared or sold</span>
          </div>
        </div>

        {/* Fast Switch: Previously created accounts on this device */}
        {existingAccounts.length > 0 && (
          <div className="mt-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-300 mb-2">
              Saved Accounts on this Device:
            </p>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {existingAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleQuickLogin(acc)}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-left transition-colors border border-slate-700/40 cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={acc.avatar} alt={acc.name} className="w-7 h-7 rounded-full object-cover ring-1 ring-rose-400/60 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white truncate block">{acc.name}</span>
                      <span className="text-[10px] text-slate-400 truncate block">{acc.email}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-rose-400 shrink-0">Log In &rarr;</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
