import {
  DailyPromptData,
  BucketListItem,
  IntimacyMoodState,
  HeartbeatPulseEvent,
  LoveVoucher,
  BucketCategory,
  VoucherCategory
} from '../types/intimacy';
import { db } from './firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// Curated collection of meaningful intimate connection prompts
export const DAILY_PROMPTS_BANK: Array<{
  id: string;
  text: string;
  category: 'deep' | 'romantic' | 'playful' | 'gratitude';
}> = [
  {
    id: 'dp_1',
    text: 'What was a small moment this week when you felt genuinely close to me?',
    category: 'romantic'
  },
  {
    id: 'dp_2',
    text: 'What is a secret dream or goal you rarely talk about out loud?',
    category: 'deep'
  },
  {
    id: 'dp_3',
    text: 'What is one quirky habit or thing I do that secretly makes you smile?',
    category: 'playful'
  },
  {
    id: 'dp_4',
    text: 'When you are stressed or overwhelmed, what kind of comfort helps you feel safest?',
    category: 'deep'
  },
  {
    id: 'dp_5',
    text: 'If we could teleport right now to any cozy spot in the world for one evening, where would we go?',
    category: 'romantic'
  },
  {
    id: 'dp_6',
    text: 'What is a song, place, or scent that instantly reminds you of us?',
    category: 'gratitude'
  },
  {
    id: 'dp_7',
    text: 'What is something you appreciate about how we handle misunderstandings or tough days?',
    category: 'gratitude'
  },
  {
    id: 'dp_8',
    text: 'What is a new adventure, hobby, or tradition you want us to start this year?',
    category: 'playful'
  },
  {
    id: 'dp_9',
    text: 'What was your very first impression of me, and how has it blossomed since?',
    category: 'romantic'
  },
  {
    id: 'dp_10',
    text: 'What is one emotion or thought you find hardest to put into words?',
    category: 'deep'
  }
];

export const DEFAULT_BUCKET_LIST_IDEAS: Array<{
  title: string;
  description: string;
  category: BucketCategory;
}> = [
  {
    title: 'Stargazing with blankets & hot cocoa',
    description: 'Find a dark hill or quiet rooftop, lay out pillows, and watch the stars.',
    category: 'romantic'
  },
  {
    title: 'Cook a 3-course homemade dinner from scratch',
    description: 'Pick an Italian or Thai menu, put on jazz, and cook every step together.',
    category: 'foodie'
  },
  {
    title: 'Spontaneous sunrise breakfast drive',
    description: 'Wake up early, grab coffee in mugs, and watch the dawn break over water.',
    category: 'adventure'
  },
  {
    title: 'Blanket fort movie marathon',
    description: 'Build a giant fortress with fairy lights and watch comfort movies all night.',
    category: 'cozy'
  },
  {
    title: 'Midnight dessert quest',
    description: 'Slip out late in pajama pants to find warm cookies, churros, or ice cream.',
    category: 'spontaneous'
  }
];

export const DEFAULT_VOUCHERS_TEMPLATE: Array<{
  title: string;
  description: string;
  category: VoucherCategory;
}> = [
  {
    title: 'Unconditional 20-Minute Massage',
    description: 'Full focus back, shoulder, or foot massage with soothing music. No rush, pure relaxation.',
    category: 'massage'
  },
  {
    title: '100% Focused Cuddle Sanctuary',
    description: 'Phone-free, zero-distraction cuddle session wrapped up in warm blankets.',
    category: 'cuddle'
  },
  {
    title: 'Pass on Doing Chores / Dishes',
    description: 'Redeem anytime to instantly hand over chore duty with a smile.',
    category: 'favor'
  },
  {
    title: 'Movie / Show Choice Dictator',
    description: 'Absolute unilateral control over what we watch tonight without debate.',
    category: 'date'
  },
  {
    title: 'Wildcard Wish Voucher',
    description: 'Redeem for any reasonable favor, sweet treat, or spontaneous outing.',
    category: 'custom'
  }
];

// Helper to get formatted date key YYYY-MM-DD
export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Get the prompt for a given date
export function getPromptForDate(dateKey: string): { id: string; text: string; category: 'deep' | 'romantic' | 'playful' | 'gratitude' } {
  // Deterministic hash based on date string
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash << 5) - hash + dateKey.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % DAILY_PROMPTS_BANK.length;
  return DAILY_PROMPTS_BANK[index];
}

// Local Storage helpers
const STORAGE_PREFIX = 'cuddles_intimacy_';

export function getLocalDailyPrompt(conversationId: string, dateKey: string): DailyPromptData | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}prompt_${conversationId}_${dateKey}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalDailyPrompt(conversationId: string, data: DailyPromptData): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}prompt_${conversationId}_${data.dateKey}`, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save daily prompt locally', err);
  }
}

export function getLocalBucketList(conversationId: string): BucketListItem[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}bucket_${conversationId}`);
    if (raw) return JSON.parse(raw);
    // Initialize default ideas if empty
    const seeded: BucketListItem[] = DEFAULT_BUCKET_LIST_IDEAS.map((idea, idx) => ({
      id: `bl_seed_${idx}_${Date.now()}`,
      conversationId,
      title: idea.title,
      description: idea.description,
      category: idea.category,
      completed: false,
      addedByUserId: 'system',
      addedByName: 'Cuddles Sanctuary'
    }));
    saveLocalBucketList(conversationId, seeded);
    return seeded;
  } catch {
    return [];
  }
}

export function saveLocalBucketList(conversationId: string, items: BucketListItem[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}bucket_${conversationId}`, JSON.stringify(items));
  } catch (err) {
    console.warn('Failed to save bucket list locally', err);
  }
}

export function getLocalMoods(conversationId: string): Record<string, IntimacyMoodState> {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}moods_${conversationId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalMoods(conversationId: string, moods: Record<string, IntimacyMoodState>): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}moods_${conversationId}`, JSON.stringify(moods));
  } catch (err) {
    console.warn('Failed to save moods locally', err);
  }
}

export function getLocalVouchers(conversationId: string, currentUserId: string, partnerId?: string): LoveVoucher[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}vouchers_${conversationId}`);
    if (raw) return JSON.parse(raw);
    // Initialize seeded vouchers
    const seeded: LoveVoucher[] = DEFAULT_VOUCHERS_TEMPLATE.map((tpl, idx) => ({
      id: `vouch_seed_${idx}_${Date.now()}`,
      conversationId,
      title: tpl.title,
      description: tpl.description,
      category: tpl.category,
      issuerId: partnerId || 'partner',
      issuerName: 'Love Token',
      recipientId: currentUserId,
      status: 'available'
    }));
    saveLocalVouchers(conversationId, seeded);
    return seeded;
  } catch {
    return [];
  }
}

export function saveLocalVouchers(conversationId: string, vouchers: LoveVoucher[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}vouchers_${conversationId}`, JSON.stringify(vouchers));
  } catch (err) {
    console.warn('Failed to save vouchers locally', err);
  }
}

// ---------------------------------------------------------
// Firestore Realtime Synchronization
// ---------------------------------------------------------

// Daily Prompt Sync
export async function syncDailyPromptAnswer(
  conversationId: string,
  dateKey: string,
  userAnswer: {
    userId: string;
    userName: string;
    userAvatar?: string;
    text: string;
  }
): Promise<DailyPromptData> {
  const promptDef = getPromptForDate(dateKey);
  const current = getLocalDailyPrompt(conversationId, dateKey) || {
    dateKey,
    questionId: promptDef.id,
    questionText: promptDef.text,
    category: promptDef.category,
    responses: {}
  };

  current.responses[userAnswer.userId] = {
    userId: userAnswer.userId,
    userName: userAnswer.userName,
    userAvatar: userAnswer.userAvatar,
    text: userAnswer.text,
    answeredAt: new Date().toISOString()
  };

  saveLocalDailyPrompt(conversationId, current);

  if (db) {
    try {
      const docRef = doc(db, 'conversations', conversationId, 'intimacy', `prompt_${dateKey}`);
      await setDoc(docRef, current, { merge: true });
    } catch (e) {
      console.warn('Firestore prompt sync error, local saved', e);
    }
  }

  return current;
}

export function subscribeToDailyPrompt(
  conversationId: string,
  dateKey: string,
  onUpdate: (data: DailyPromptData) => void
): () => void {
  const local = getLocalDailyPrompt(conversationId, dateKey);
  if (local) onUpdate(local);

  if (!db) return () => {};

  try {
    const docRef = doc(db, 'conversations', conversationId, 'intimacy', `prompt_${dateKey}`);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const cloudData = snapshot.data() as DailyPromptData;
          saveLocalDailyPrompt(conversationId, cloudData);
          onUpdate(cloudData);
        }
      },
      (err) => console.warn('Daily prompt subscription error', err)
    );
  } catch {
    return () => {};
  }
}

// Bucket List Sync
export async function syncBucketList(conversationId: string, items: BucketListItem[]): Promise<void> {
  saveLocalBucketList(conversationId, items);
  if (db) {
    try {
      const docRef = doc(db, 'conversations', conversationId, 'intimacy', 'bucket_list');
      await setDoc(docRef, { items }, { merge: true });
    } catch (e) {
      console.warn('Bucket list sync error', e);
    }
  }
}

export function subscribeToBucketList(
  conversationId: string,
  onUpdate: (items: BucketListItem[]) => void
): () => void {
  const local = getLocalBucketList(conversationId);
  if (local.length) onUpdate(local);

  if (!db) return () => {};

  try {
    const docRef = doc(db, 'conversations', conversationId, 'intimacy', 'bucket_list');
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (Array.isArray(data.items)) {
            saveLocalBucketList(conversationId, data.items);
            onUpdate(data.items);
          }
        }
      },
      (err) => console.warn('Bucket list subscription error', err)
    );
  } catch {
    return () => {};
  }
}

// Mood Radar Sync
export async function syncMoodState(
  conversationId: string,
  mood: IntimacyMoodState
): Promise<void> {
  const allMoods = getLocalMoods(conversationId);
  allMoods[mood.userId] = mood;
  saveLocalMoods(conversationId, allMoods);

  if (db) {
    try {
      const docRef = doc(db, 'conversations', conversationId, 'intimacy', 'moods');
      await setDoc(docRef, { [mood.userId]: mood }, { merge: true });
    } catch (e) {
      console.warn('Mood sync error', e);
    }
  }
}

export function subscribeToMoodStates(
  conversationId: string,
  onUpdate: (moods: Record<string, IntimacyMoodState>) => void
): () => void {
  const local = getLocalMoods(conversationId);
  if (Object.keys(local).length > 0) onUpdate(local);

  if (!db) return () => {};

  try {
    const docRef = doc(db, 'conversations', conversationId, 'intimacy', 'moods');
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Record<string, IntimacyMoodState>;
          saveLocalMoods(conversationId, data);
          onUpdate(data);
        }
      },
      (err) => console.warn('Mood states subscription error', err)
    );
  } catch {
    return () => {};
  }
}

// Love Vouchers Sync
export async function syncVouchers(conversationId: string, vouchers: LoveVoucher[]): Promise<void> {
  saveLocalVouchers(conversationId, vouchers);
  if (db) {
    try {
      const docRef = doc(db, 'conversations', conversationId, 'intimacy', 'vouchers');
      await setDoc(docRef, { vouchers }, { merge: true });
    } catch (e) {
      console.warn('Vouchers sync error', e);
    }
  }
}

export function subscribeToVouchers(
  conversationId: string,
  currentUserId: string,
  partnerId: string | undefined,
  onUpdate: (vouchers: LoveVoucher[]) => void
): () => void {
  const local = getLocalVouchers(conversationId, currentUserId, partnerId);
  if (local.length) onUpdate(local);

  if (!db) return () => {};

  try {
    const docRef = doc(db, 'conversations', conversationId, 'intimacy', 'vouchers');
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (Array.isArray(data.vouchers)) {
            saveLocalVouchers(conversationId, data.vouchers);
            onUpdate(data.vouchers);
          }
        }
      },
      (err) => console.warn('Vouchers subscription error', err)
    );
  } catch {
    return () => {};
  }
}

// Heartbeat Pulse Event (Live vibration transmission)
export async function broadcastHeartbeatPulse(
  conversationId: string,
  event: HeartbeatPulseEvent
): Promise<void> {
  if (db) {
    try {
      const docRef = doc(db, 'conversations', conversationId, 'intimacy', 'live_pulse');
      await setDoc(docRef, event);
    } catch (e) {
      console.warn('Heartbeat broadcast error', e);
    }
  }
}

export function subscribeToHeartbeatPulse(
  conversationId: string,
  onPulse: (event: HeartbeatPulseEvent) => void
): () => void {
  if (!db) return () => {};

  try {
    const docRef = doc(db, 'conversations', conversationId, 'intimacy', 'live_pulse');
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as HeartbeatPulseEvent;
          // Only trigger if pulse is within the last 15 seconds
          const diffMs = Date.now() - new Date(data.timestamp).getTime();
          if (diffMs >= 0 && diffMs < 15000) {
            onPulse(data);
          }
        }
      },
      (err) => console.warn('Heartbeat subscription error', err)
    );
  } catch {
    return () => {};
  }
}
