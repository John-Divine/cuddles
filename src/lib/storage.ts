import { UserProfile, Conversation, Message, ScheduleEvent, UserAccount } from '../types';

export const CURRENT_USER: UserProfile = {
  id: 'user_me',
  name: 'Alex Rivera',
  email: 'alex@cuddles.app',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  status: 'Ready for cuddles & chats ✨',
  moodEmoji: '💖',
  online: true,
  relationshipType: 'partner',
  safetyFingerprint: '9B2E74FA',
  verifiedKey: true,
  bio: 'Photographer & romantic soul. Connecting deeply with my favorites.',
  location: 'San Francisco, CA',
  currentSchedule: {
    isBusy: false,
    activityTitle: 'Open & Available',
    untilTime: '8:00 PM',
    category: 'available'
  }
};

export const INITIAL_CONTACTS: UserProfile[] = [
  {
    id: 'partner_elena',
    name: 'Elena Rostova',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    status: 'Thinking of our next cuddle & trip 🌸',
    moodEmoji: '💕',
    online: true,
    relationshipType: 'partner',
    partnerNickname: 'My Love',
    partnerAnniversary: '2023-08-14',
    safetyFingerprint: 'A1C498D3',
    verifiedKey: true,
    bio: 'Architect, plant lover, and your biggest fan.',
    location: 'Downtown Loft',
    currentSchedule: {
      isBusy: true,
      activityTitle: 'Design Sprint & Deep Focus',
      untilTime: '4:30 PM',
      category: 'work_focus'
    }
  },
  {
    id: 'partner_marcus',
    name: 'Marcus Vance',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status: 'Cooking dinner tonight 🍳',
    moodEmoji: '☕',
    online: true,
    relationshipType: 'partner',
    partnerNickname: 'Marc',
    partnerAnniversary: '2024-02-18',
    safetyFingerprint: 'E8421F90',
    verifiedKey: true,
    bio: 'Chef & pastry enthusiast. Warm vibes only.',
    location: 'North Beach',
    currentSchedule: {
      isBusy: false,
      activityTitle: 'Prepping Kitchen & Free to Chat',
      untilTime: '7:00 PM',
      category: 'available'
    }
  },
  {
    id: 'friend_sophia',
    name: 'Sophia Chen',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    status: 'At the studio recording 🎙️',
    moodEmoji: '🎵',
    online: false,
    lastSeen: '10m ago',
    relationshipType: 'friend',
    safetyFingerprint: '52D8A109',
    verifiedKey: true,
    bio: 'Music producer and coffee connoisseur.',
    currentSchedule: {
      isBusy: true,
      activityTitle: 'Vocal Studio Recording',
      untilTime: '6:00 PM',
      category: 'work_focus'
    }
  },
  {
    id: 'friend_liam',
    name: 'Liam Gallagher',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    status: 'Bouldering this weekend 🧗',
    moodEmoji: '🏔️',
    online: true,
    relationshipType: 'friend',
    safetyFingerprint: '4B892E1C',
    verifiedKey: false,
    bio: 'Outdoor climber & UI designer.',
    currentSchedule: {
      isBusy: false,
      activityTitle: 'Open & Chilling',
      untilTime: '9:00 PM',
      category: 'available'
    }
  },
  {
    id: 'friend_maya',
    name: 'Maya Patel',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    status: 'Reading novel in the park 📖',
    moodEmoji: '☕',
    online: true,
    relationshipType: 'friend',
    safetyFingerprint: '77DF302B',
    verifiedKey: true,
    bio: 'Novelist and tea drinker.',
    currentSchedule: {
      isBusy: false,
      activityTitle: 'Reading Afternoon',
      untilTime: '5:30 PM',
      category: 'available'
    }
  }
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_elena',
    title: 'Elena Rostova',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    isGroup: false,
    participantIds: ['user_me', 'partner_elena'],
    partnerIds: ['partner_elena'],
    createdAt: '2024-01-01T00:00:00Z',
    isE2EESecure: true,
    sharedKeyFingerprint: '84D190AE',
    pinned: true,
    lastMessage: {
      text: 'Sent a video note 🎥',
      timestamp: 'Just now',
      senderName: 'Elena',
      unreadCount: 1
    }
  },
  {
    id: 'conv_marcus',
    title: 'Marcus Vance',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    isGroup: false,
    participantIds: ['user_me', 'partner_marcus'],
    partnerIds: ['partner_marcus'],
    createdAt: '2024-01-02T00:00:00Z',
    isE2EESecure: true,
    sharedKeyFingerprint: '3C99FE41',
    pinned: true,
    lastMessage: {
      text: 'Are you free for our weekly sync tonight?',
      timestamp: '15m ago',
      senderName: 'Marcus',
      unreadCount: 0
    }
  },
  {
    id: 'conv_triad',
    title: 'Partners Sanctuary 💕',
    avatar: '',
    isGroup: true,
    participantIds: ['user_me', 'partner_elena', 'partner_marcus'],
    partnerIds: ['partner_elena', 'partner_marcus'],
    createdAt: '2024-02-01T00:00:00Z',
    isE2EESecure: true,
    sharedKeyFingerprint: 'EE829031',
    pinned: true,
    lastMessage: {
      text: 'Marcus: Reserved the table for Friday evening!',
      timestamp: '1h ago',
      senderName: 'Marcus',
      unreadCount: 0
    }
  },
  {
    id: 'conv_friends_hangout',
    title: 'Close Circle & Friends 🌟',
    avatar: '',
    isGroup: true,
    participantIds: ['user_me', 'partner_elena', 'partner_marcus', 'friend_sophia', 'friend_liam', 'friend_maya'],
    partnerIds: ['partner_elena', 'partner_marcus'],
    createdAt: '2024-03-01T00:00:00Z',
    isE2EESecure: true,
    sharedKeyFingerprint: '7A1B8820',
    pinned: false,
    lastMessage: {
      text: 'Sophia: Who is ready for group video call?',
      timestamp: '3h ago',
      senderName: 'Sophia',
      unreadCount: 2
    }
  },
  {
    id: 'conv_sophia',
    title: 'Sophia Chen',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    isGroup: false,
    participantIds: ['user_me', 'friend_sophia'],
    partnerIds: [],
    createdAt: '2024-04-01T00:00:00Z',
    isE2EESecure: true,
    sharedKeyFingerprint: '94D02199',
    pinned: false,
    lastMessage: {
      text: 'Loved the photos from yesterday!',
      timestamp: 'Yesterday',
      senderName: 'Sophia',
      unreadCount: 0
    }
  }
];

export const INITIAL_MESSAGES: Record<string, Message[]> = {
  conv_elena: [
    {
      id: 'm1',
      conversationId: 'conv_elena',
      senderId: 'partner_elena',
      senderName: 'Elena Rostova',
      senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      timestamp: '10:15 AM',
      createdAtISO: new Date(Date.now() - 3600000).toISOString(),
      type: 'text',
      text: 'Good morning my love! I was just reflecting on our weekend retreat. So peaceful.',
      status: 'read',
      reactions: [{ emoji: '💖', count: 1, userIds: ['user_me'] }]
    },
    {
      id: 'm2',
      conversationId: 'conv_elena',
      senderId: 'user_me',
      senderName: 'Alex Rivera',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      timestamp: '10:18 AM',
      createdAtISO: new Date(Date.now() - 3000000).toISOString(),
      type: 'text',
      text: 'Morning darling! It truly was magical. I checked your schedule, have a productive focus session today!',
      status: 'read'
    },
    {
      id: 'm3',
      conversationId: 'conv_elena',
      senderId: 'partner_elena',
      senderName: 'Elena Rostova',
      senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      timestamp: '10:22 AM',
      createdAtISO: new Date(Date.now() - 2400000).toISOString(),
      type: 'voice',
      attachment: {
        type: 'voice',
        url: 'blob:simulated_audio',
        durationSeconds: 14,
        isStoredLocally: true
      },
      text: 'Voice note (0:14)',
      status: 'read',
      reactions: [{ emoji: '🥰', count: 1, userIds: ['user_me'] }]
    },
    {
      id: 'm4',
      conversationId: 'conv_elena',
      senderId: 'partner_elena',
      senderName: 'Elena Rostova',
      senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      timestamp: '10:30 AM',
      createdAtISO: new Date(Date.now() - 1800000).toISOString(),
      type: 'video_note',
      attachment: {
        type: 'video_note',
        url: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-smiling-in-a-coffee-shop-40154-large.mp4',
        durationSeconds: 9,
        isStoredLocally: true
      },
      text: 'Video Note (0:09)',
      status: 'delivered'
    }
  ],
  conv_marcus: [
    {
      id: 'm_m1',
      conversationId: 'conv_marcus',
      senderId: 'partner_marcus',
      senderName: 'Marcus Vance',
      senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      timestamp: '9:00 AM',
      createdAtISO: new Date(Date.now() - 7200000).toISOString(),
      type: 'text',
      text: 'Hey Alex! Picked up ingredients for pasta carbonara tonight. Free around 7:30pm?',
      status: 'read'
    },
    {
      id: 'm_m2',
      conversationId: 'conv_marcus',
      senderId: 'user_me',
      senderName: 'Alex Rivera',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      timestamp: '9:12 AM',
      createdAtISO: new Date(Date.now() - 6500000).toISOString(),
      type: 'text',
      text: 'That sounds incredible Marc! I have wrapped up my work early so 7:30pm is perfect.',
      status: 'read',
      reactions: [{ emoji: '😋', count: 1, userIds: ['partner_marcus'] }]
    }
  ],
  conv_triad: [
    {
      id: 'm_t1',
      conversationId: 'conv_triad',
      senderId: 'partner_elena',
      senderName: 'Elena Rostova',
      senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      timestamp: '11:00 AM',
      createdAtISO: new Date(Date.now() - 3600000).toISOString(),
      type: 'text',
      text: 'Hello both of you ❤️ Checking in on our weekend schedule together.',
      status: 'read'
    },
    {
      id: 'm_t2',
      conversationId: 'conv_triad',
      senderId: 'partner_marcus',
      senderName: 'Marcus Vance',
      senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      timestamp: '11:05 AM',
      createdAtISO: new Date(Date.now() - 3400000).toISOString(),
      type: 'text',
      text: 'Reserved the table for Friday evening! Can’t wait for all three of us to unwind.',
      status: 'read',
      reactions: [{ emoji: '🎉', count: 2, userIds: ['user_me', 'partner_elena'] }]
    }
  ],
  conv_friends_hangout: [
    {
      id: 'm_fh1',
      conversationId: 'conv_friends_hangout',
      senderId: 'friend_sophia',
      senderName: 'Sophia Chen',
      senderAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      timestamp: '1:30 PM',
      createdAtISO: new Date(Date.now() - 7200000).toISOString(),
      type: 'text',
      text: 'Hey crew! Who is ready for group video call this evening?',
      status: 'read'
    },
    {
      id: 'm_fh2',
      conversationId: 'conv_friends_hangout',
      senderId: 'friend_liam',
      senderName: 'Liam Gallagher',
      senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      timestamp: '1:35 PM',
      createdAtISO: new Date(Date.now() - 7000000).toISOString(),
      type: 'text',
      text: 'Count me in! I tested my new mic.',
      status: 'read'
    }
  ]
};

export const INITIAL_SCHEDULES: ScheduleEvent[] = [
  {
    id: 'sch_day_1',
    title: 'Elena: Design Sprint & Deep Work',
    description: 'Silent mode active - urgent messages will pierce through',
    dateTime: '2026-09-20T09:00:00',
    endTime: '2026-09-20T16:30:00',
    isBusySlot: true,
    category: 'work_focus',
    targetGroup: 'partners',
    attendeeIds: ['partner_elena'],
    ownerId: 'partner_elena',
    color: '#e11d48',
    remindMinutesBefore: 15
  },
  {
    id: 'sch_day_2',
    title: 'Alex & Elena: Candlelight Cuddle & Dinner',
    description: 'Bistro L’Ami - Table 12 reserved',
    dateTime: '2026-09-21T19:30:00',
    endTime: '2026-09-21T22:00:00',
    isBusySlot: true,
    category: 'partner_date',
    targetGroup: 'partners',
    attendeeIds: ['user_me', 'partner_elena'],
    ownerId: 'user_me',
    color: '#f43f5e',
    remindMinutesBefore: 60
  },
  {
    id: 'sch_day_3',
    title: 'Marcus: Cooking & Pastry Session',
    description: 'Homemade Carbonara & Gelato tasting',
    dateTime: '2026-09-22T19:30:00',
    endTime: '2026-09-22T21:30:00',
    isBusySlot: true,
    category: 'partner_date',
    targetGroup: 'partners',
    attendeeIds: ['user_me', 'partner_marcus'],
    ownerId: 'partner_marcus',
    color: '#8b5cf6',
    remindMinutesBefore: 30
  },
  {
    id: 'sch_day_4',
    title: 'Partners & Friends Group Video Call',
    description: 'Weekly video catch-up and games',
    dateTime: '2026-09-23T20:00:00',
    endTime: '2026-09-23T21:00:00',
    isBusySlot: true,
    category: 'group_call',
    targetGroup: 'all',
    attendeeIds: ['user_me', 'partner_elena', 'partner_marcus', 'friend_sophia', 'friend_liam'],
    ownerId: 'user_me',
    color: '#06b6d4',
    remindMinutesBefore: 15
  }
];

// Local storage keys for Cuddles
const STORAGE_KEYS = {
  USER: 'cuddles_user_profile',
  CONTACTS: 'cuddles_contacts',
  CONVERSATIONS: 'cuddles_conversations',
  MESSAGES: 'cuddles_messages',
  SCHEDULES: 'cuddles_schedules',
  PURGE_TIMESTAMP: 'cuddles_last_purge',
  ACCOUNTS: 'cuddles_accounts',
  ACTIVE_ACCOUNT_ID: 'cuddles_active_account_id'
};

export const AUTO_PURGE_DAYS = 15; // Online text messages expire after 15 days, but local texts remain permanently intact

export function getStoredAccounts(): UserAccount[] {
  return loadStoredData<UserAccount[]>(STORAGE_KEYS.ACCOUNTS, []);
}

export function saveStoredAccount(account: UserAccount): void {
  const accounts = getStoredAccounts();
  const existingIdx = accounts.findIndex((a) => a.id === account.id || a.email.toLowerCase() === account.email.toLowerCase());
  if (existingIdx >= 0) {
    accounts[existingIdx] = account;
  } else {
    accounts.push(account);
  }
  saveStoredData(STORAGE_KEYS.ACCOUNTS, accounts);
}

export function getActiveAccountId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_ACCOUNT_ID);
  } catch {
    return null;
  }
}

export function setActiveAccountId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ACCOUNT_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ACCOUNT_ID);
    }
  } catch (e) {
    console.error('Failed to set active account ID:', e);
  }
}

export function authenticateAccount(email: string, pass: string): UserAccount | null {
  const accounts = getStoredAccounts();
  const found = accounts.find(
    (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === pass
  );
  return found || null;
}

export function registerNewAccount(params: {
  name: string;
  email: string;
  password: string;
  avatar?: string;
  bio?: string;
  partnerNickname?: string;
  partnerAnniversary?: string;
}): UserAccount {
  const id = 'acc_' + Date.now();
  const hex = Math.random().toString(16).substring(2, 10).toUpperCase();
  const newAccount: UserAccount = {
    id,
    name: params.name.trim(),
    email: params.email.trim().toLowerCase(),
    password: params.password,
    avatar:
      params.avatar ||
      `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
    createdAt: new Date().toISOString(),
    safetyFingerprint: hex,
    bio: params.bio || 'In an intimate sanctuary with my favorite person.',
    partnerNickname: params.partnerNickname || 'My Love',
    partnerAnniversary: params.partnerAnniversary,
    status: 'Here with you 💕',
    moodEmoji: '💖',
    currentSchedule: {
      isBusy: false,
      activityTitle: 'Open & Available',
      untilTime: '9:00 PM',
      category: 'available'
    }
  };

  saveStoredAccount(newAccount);
  setActiveAccountId(id);
  return newAccount;
}

/**
 * Retention policy: All text messages are retained locally permanently on the device,
 * allowing the user to view their full message history seamlessly like nothing happened.
 * Only the online cloud database purges messages older than 15 days.
 */
export function purgeOldMessages(
  messagesMap: Record<string, Message[]>,
  _olderThanDays: number = AUTO_PURGE_DAYS
): { cleanedCount: number; updatedMap: Record<string, Message[]> } {
  // Local messages are never purged; they stay on the user's device permanently.
  return { cleanedCount: 0, updatedMap: messagesMap };
}

export function loadStoredData<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

export function saveStoredData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Storage save error:', e);
  }
}

export { STORAGE_KEYS };
