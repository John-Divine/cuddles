import { CoupleMemory, CoupleMilestone, RelationshipJourneyStats, MemoryCategory } from '../types/memories';
import { db } from './firebase';
import { doc, setDoc, deleteDoc, collection, onSnapshot, getDocs } from 'firebase/firestore';

const LOCAL_STORAGE_MEMORIES_PREFIX = 'cuddles_couple_memories_';
const LOCAL_STORAGE_MILESTONES_PREFIX = 'cuddles_couple_milestones_';
const LOCAL_STORAGE_STARTDATE_PREFIX = 'cuddles_relationship_start_';

// Initial curated African/Emerald couple milestones seed
export const DEFAULT_COUPLE_MILESTONES: CoupleMilestone[] = [
  {
    id: 'mile_first_date',
    title: 'The Spark: First Date',
    targetDate: '2024-04-18',
    category: 'first_date',
    ritualIdea: 'Revisit the first cafe or make the same meal together',
    completed: true,
    completedAt: '2024-04-18'
  },
  {
    id: 'mile_first_kiss',
    title: 'First Kiss Under the Stars',
    targetDate: '2024-05-02',
    category: 'first_kiss',
    ritualIdea: 'Stargaze while listening to our song',
    completed: true,
    completedAt: '2024-05-02'
  },
  {
    id: 'mile_anniversary_1',
    title: '1-Year Anniversary Milestone',
    targetDate: '2025-04-18',
    category: 'anniversary',
    ritualIdea: 'Exchange handwritten love scrolls with gold wax seals',
    giftRecommendation: 'Paper (Traditional) or Gold Keepsake (Modern)',
    completed: true,
    completedAt: '2025-04-18'
  },
  {
    id: 'mile_trip_getaway',
    title: 'Sunset Weekend Getaway',
    targetDate: '2026-11-20',
    category: 'first_trip',
    ritualIdea: 'Leave phones in hotel safe for one full golden evening',
    completed: false
  },
  {
    id: 'mile_anniversary_2',
    title: '2-Year Radiant Anniversary',
    targetDate: '2026-04-18',
    category: 'anniversary',
    ritualIdea: 'Cook a 4-course feast together wearing your finest attire',
    giftRecommendation: 'Cotton/Fine Fabric (Traditional) or Emerald Jewelry (Radiant)',
    completed: false
  }
];

// Initial starter memories
export const DEFAULT_COUPLE_MEMORIES: CoupleMemory[] = [
  {
    id: 'mem_1',
    conversationId: 'default',
    title: 'Our First Walk by the Waterfront',
    description: 'We talked for four hours until our coffee went completely cold, yet neither of us wanted the night to end.',
    date: '2024-04-18',
    category: 'first_date',
    location: 'Harbor Promenade',
    partnerReflection: 'The moment I knew you were my home.',
    addedByUserId: 'user_self',
    addedByUserName: 'You',
    createdAt: '2024-04-18T20:30:00Z',
    favorite: true
  },
  {
    id: 'mem_2',
    conversationId: 'default',
    title: 'Dancing in the Kitchen at 1:00 AM',
    description: 'Spilled flour all over the floor while trying to bake late-night pastries, ended up slow dancing to old soul records.',
    date: '2024-09-14',
    category: 'romantic',
    location: 'Our Kitchen',
    partnerReflection: 'Pure, effortless joy with my favorite soul.',
    addedByUserId: 'user_partner',
    addedByUserName: 'Love',
    createdAt: '2024-09-14T23:45:00Z',
    favorite: true
  },
  {
    id: 'mem_3',
    conversationId: 'default',
    title: 'Mountain Sunrise Hike',
    description: 'Woke up at 4:30 AM in the freezing fog. The moment the golden sunlight broke across the valley, you took my hand.',
    date: '2025-01-26',
    category: 'travel',
    location: 'Highland Peak',
    partnerReflection: 'Every climb is worth it with you beside me.',
    addedByUserId: 'user_self',
    addedByUserName: 'You',
    createdAt: '2025-01-26T07:15:00Z',
    favorite: false
  }
];

/**
 * Get or set the relationship start date for the relationship counter
 */
export function getRelationshipStartDate(conversationId: string): string {
  try {
    const stored = localStorage.getItem(`${LOCAL_STORAGE_STARTDATE_PREFIX}${conversationId}`);
    if (stored) return stored;
  } catch (err) {
    console.warn('LocalStorage error getting relationship start date:', err);
  }
  return '2024-04-18'; // Default romantic anniversary anchor
}

export function setRelationshipStartDate(conversationId: string, date: string): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_STARTDATE_PREFIX}${conversationId}`, date);
    if (db) {
      const docRef = doc(db, 'conversations', conversationId, 'settings', 'relationship');
      setDoc(docRef, { startDate: date, updatedAt: new Date().toISOString() }, { merge: true }).catch(console.warn);
    }
  } catch (err) {
    console.warn('LocalStorage error setting relationship start date:', err);
  }
}

/**
 * Calculate relationship journey stats (days together, upcoming milestone)
 */
export function calculateRelationshipStats(
  startDateStr: string,
  memories: CoupleMemory[],
  milestones: CoupleMilestone[]
): RelationshipJourneyStats {
  const now = new Date();
  const start = new Date(startDateStr);
  const diffTime = Math.max(0, now.getTime() - start.getTime());
  const daysTogether = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Find next upcoming milestone
  const upcoming = milestones
    .filter((m) => !m.completed && new Date(m.targetDate).getTime() >= now.getTime() - 86400000)
    .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())[0];

  let nextMilestoneTitle = 'Next Anniversary Celebration';
  let daysToNextMilestone = 30;
  let nextMilestoneDate = '';

  if (upcoming) {
    nextMilestoneTitle = upcoming.title;
    nextMilestoneDate = upcoming.targetDate;
    const diff = Math.max(0, new Date(upcoming.targetDate).getTime() - now.getTime());
    daysToNextMilestone = Math.ceil(diff / (1000 * 60 * 60 * 24));
  } else {
    // Default to next anniversary based on start date month/day
    const currentYear = now.getFullYear();
    let nextAnniv = new Date(currentYear, start.getMonth(), start.getDate());
    if (nextAnniv.getTime() < now.getTime()) {
      nextAnniv = new Date(currentYear + 1, start.getMonth(), start.getDate());
    }
    const diff = Math.max(0, nextAnniv.getTime() - now.getTime());
    daysToNextMilestone = Math.ceil(diff / (1000 * 60 * 60 * 24));
    nextMilestoneDate = nextAnniv.toISOString().split('T')[0];
    nextMilestoneTitle = `${currentYear - start.getFullYear() + 1}-Year Anniversary`;
  }

  return {
    startDate: startDateStr,
    daysTogether,
    totalMemories: memories.length,
    nextMilestoneTitle,
    daysToNextMilestone,
    nextMilestoneDate
  };
}

/**
 * Retrieve memories from local cache
 */
export function getLocalMemories(conversationId: string): CoupleMemory[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_MEMORIES_PREFIX}${conversationId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('LocalStorage error getting memories:', err);
  }
  return DEFAULT_COUPLE_MEMORIES.map((m) => ({ ...m, conversationId }));
}

/**
 * Save memories to local cache
 */
export function setLocalMemories(conversationId: string, memories: CoupleMemory[]): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_MEMORIES_PREFIX}${conversationId}`, JSON.stringify(memories));
  } catch (err) {
    console.warn('LocalStorage error saving memories:', err);
  }
}

/**
 * Retrieve milestones from local cache
 */
export function getLocalMilestones(conversationId: string): CoupleMilestone[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_MILESTONES_PREFIX}${conversationId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('LocalStorage error getting milestones:', err);
  }
  return DEFAULT_COUPLE_MILESTONES;
}

export function setLocalMilestones(conversationId: string, milestones: CoupleMilestone[]): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_MILESTONES_PREFIX}${conversationId}`, JSON.stringify(milestones));
  } catch (err) {
    console.warn('LocalStorage error saving milestones:', err);
  }
}

/**
 * Realtime Firestore subscription for Memories
 */
export function subscribeToMemories(
  conversationId: string,
  onUpdate: (memories: CoupleMemory[]) => void
): () => void {
  if (!db) {
    onUpdate(getLocalMemories(conversationId));
    return () => {};
  }

  try {
    const memsCol = collection(db, 'conversations', conversationId, 'memories');
    const unsub = onSnapshot(
      memsCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: CoupleMemory[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            list.push({ ...data, id: d.id } as CoupleMemory);
          });
          list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setLocalMemories(conversationId, list);
          onUpdate(list);
        } else {
          const fallback = getLocalMemories(conversationId);
          onUpdate(fallback);
        }
      },
      (error) => {
        console.warn('Firestore memories subscription warning, using local cache:', error);
        onUpdate(getLocalMemories(conversationId));
      }
    );
    return unsub;
  } catch (err) {
    console.warn('Error setting up memories listener:', err);
    onUpdate(getLocalMemories(conversationId));
    return () => {};
  }
}

/**
 * Realtime Firestore subscription for Milestones
 */
export function subscribeToMilestones(
  conversationId: string,
  onUpdate: (milestones: CoupleMilestone[]) => void
): () => void {
  if (!db) {
    onUpdate(getLocalMilestones(conversationId));
    return () => {};
  }

  try {
    const milCol = collection(db, 'conversations', conversationId, 'milestones');
    const unsub = onSnapshot(
      milCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: CoupleMilestone[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            list.push({ ...data, id: d.id } as CoupleMilestone);
          });
          list.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
          setLocalMilestones(conversationId, list);
          onUpdate(list);
        } else {
          const fallback = getLocalMilestones(conversationId);
          onUpdate(fallback);
        }
      },
      (error) => {
        console.warn('Firestore milestones subscription warning, using local cache:', error);
        onUpdate(getLocalMilestones(conversationId));
      }
    );
    return unsub;
  } catch (err) {
    console.warn('Error setting up milestones listener:', err);
    onUpdate(getLocalMilestones(conversationId));
    return () => {};
  }
}

/**
 * Add or update a couple memory
 */
export async function saveCoupleMemory(memory: CoupleMemory): Promise<void> {
  const current = getLocalMemories(memory.conversationId);
  const existingIdx = current.findIndex((m) => m.id === memory.id);
  let updated: CoupleMemory[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = memory;
  } else {
    updated = [memory, ...current];
  }
  setLocalMemories(memory.conversationId, updated);

  if (db) {
    try {
      const docRef = doc(db, 'conversations', memory.conversationId, 'memories', memory.id);
      await setDoc(docRef, memory, { merge: true });
    } catch (err) {
      console.warn('Firestore write memory fallback:', err);
    }
  }
}

/**
 * Delete a couple memory
 */
export async function deleteCoupleMemory(conversationId: string, memoryId: string): Promise<void> {
  const current = getLocalMemories(conversationId);
  const updated = current.filter((m) => m.id !== memoryId);
  setLocalMemories(conversationId, updated);

  if (db) {
    try {
      const docRef = doc(db, 'conversations', conversationId, 'memories', memoryId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore delete memory fallback:', err);
    }
  }
}

/**
 * Toggle favorite on a couple memory
 */
export async function toggleMemoryFavorite(conversationId: string, memoryId: string): Promise<void> {
  const current = getLocalMemories(conversationId);
  const updated = current.map((m) => (m.id === memoryId ? { ...m, favorite: !m.favorite } : m));
  setLocalMemories(conversationId, updated);

  if (db) {
    try {
      const mem = updated.find((m) => m.id === memoryId);
      if (mem) {
        const docRef = doc(db, 'conversations', conversationId, 'memories', memoryId);
        await setDoc(docRef, { favorite: mem.favorite }, { merge: true });
      }
    } catch (err) {
      console.warn('Firestore toggle favorite fallback:', err);
    }
  }
}

/**
 * Add or update a couple milestone
 */
export async function saveCoupleMilestone(conversationId: string, milestone: CoupleMilestone): Promise<void> {
  const current = getLocalMilestones(conversationId);
  const existingIdx = current.findIndex((m) => m.id === milestone.id);
  let updated: CoupleMilestone[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = milestone;
  } else {
    updated = [...current, milestone];
  }
  setLocalMilestones(conversationId, updated);

  if (db) {
    try {
      const docRef = doc(db, 'conversations', conversationId, 'milestones', milestone.id);
      await setDoc(docRef, milestone, { merge: true });
    } catch (err) {
      console.warn('Firestore write milestone fallback:', err);
    }
  }
}

/**
 * Toggle completion of a milestone
 */
export async function toggleMilestoneCompleted(conversationId: string, milestoneId: string): Promise<void> {
  const current = getLocalMilestones(conversationId);
  const updated = current.map((m) => {
    if (m.id === milestoneId) {
      const nextCompleted = !m.completed;
      return {
        ...m,
        completed: nextCompleted,
        completedAt: nextCompleted ? new Date().toISOString().split('T')[0] : undefined
      };
    }
    return m;
  });
  setLocalMilestones(conversationId, updated);

  if (db) {
    try {
      const mil = updated.find((m) => m.id === milestoneId);
      if (mil) {
        const docRef = doc(db, 'conversations', conversationId, 'milestones', milestoneId);
        await setDoc(docRef, mil, { merge: true });
      }
    } catch (err) {
      console.warn('Firestore toggle milestone fallback:', err);
    }
  }
}
