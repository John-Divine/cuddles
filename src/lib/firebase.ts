import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  getDocFromServer,
  Unsubscribe,
  serverTimestamp
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import firebaseConfigData from '../../firebase-applet-config.json';
import { UserAccount, UserProfile, Message, Conversation, ScheduleEvent, MessageType } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// 1. Initialize Firebase App & Services
const firebaseConfig = {
  projectId: firebaseConfigData.projectId,
  appId: firebaseConfigData.appId,
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  firestoreDatabaseId: firebaseConfigData.firestoreDatabaseId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Connect with specific database ID if provisioned, or default
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email
        })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Warning/Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 2. Connectivity validation mandated by Firebase skill
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore connection verified.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline, using offline cache/local storage.');
    } else {
      console.warn('Firebase connection test notification:', error);
    }
    return false;
  }
}

// Ensure anonymous auth for security rules if not already logged in
export async function ensureFirebaseAuth(): Promise<string | null> {
  try {
    if (auth.currentUser) return auth.currentUser.uid;
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  } catch (err) {
    console.warn('Anonymous auth note (proceeding in hybrid mode):', err);
    return null;
  }
}

// --- Firestore Data Operations ---

/**
 * Save / update user in Firestore
 */
export async function syncUserToFirestore(user: UserAccount | UserProfile): Promise<void> {
  const path = `users/${user.id}`;
  try {
    const userDocRef = doc(db, 'users', user.id);
    await setDoc(userDocRef, {
      ...user,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Could not sync user to Firestore (fallback to local):', err);
  }
}

/**
 * Fetch all users from Firestore
 */
export async function fetchUsersFromFirestore(): Promise<UserAccount[]> {
  const path = 'users';
  try {
    const snapshot = await getDocs(collection(db, path));
    const list: UserAccount[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as UserAccount;
      if (data && data.id) list.push(data);
    });
    return list;
  } catch (err) {
    console.warn('Fetch users from Firestore fallback:', err);
    return [];
  }
}

/**
 * Save / update conversation in Firestore
 */
export async function syncConversationToFirestore(conv: Conversation): Promise<void> {
  const path = `conversations/${conv.id}`;
  try {
    const convRef = doc(db, 'conversations', conv.id);
    await setDoc(convRef, {
      id: conv.id,
      title: conv.title || '',
      participantIds: conv.participantIds || [],
      isGroup: !!conv.isGroup,
      lastMessageText: conv.lastMessage?.text || '',
      lastMessageTime: conv.lastMessage?.timestamp || '',
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Could not sync conversation to Firestore:', err);
  }
}

/**
 * Sync message to Firestore under /conversations/{conversationId}/messages/{messageId}
 */
export async function syncMessageToFirestore(message: Message): Promise<void> {
  const path = `conversations/${message.conversationId}/messages/${message.id}`;
  try {
    const msgRef = doc(db, 'conversations', message.conversationId, 'messages', message.id);
    await setDoc(msgRef, {
      ...message,
      createdAtISO: message.createdAtISO || new Date().toISOString()
    });
  } catch (err) {
    console.warn('Could not sync message to Firestore:', err);
  }
}

/**
 * Real-time listener for messages in an active conversation
 */
export function subscribeToConversationMessages(
  conversationId: string,
  onUpdate: (messages: Message[]) => void
): Unsubscribe {
  const path = `conversations/${conversationId}/messages`;
  try {
    const messagesCollection = collection(db, 'conversations', conversationId, 'messages');

    return onSnapshot(
      messagesCollection,
      (snapshot) => {
        const msgs: Message[] = [];
        snapshot.forEach((docSnap) => {
          msgs.push(docSnap.data() as Message);
        });
        if (msgs.length > 0) {
          // Sort messages by timestamp or createdAtISO locally
          msgs.sort((a, b) => (a.createdAtISO || a.timestamp).localeCompare(b.createdAtISO || b.timestamp));
          onUpdate(msgs);
        }
      },
      (error) => {
        console.warn('Real-time listener notice on path:', path, error);
      }
    );
  } catch (err) {
    console.warn('Could not establish real-time listener:', err);
    return () => {};
  }
}

/**
 * Sync schedule to Firestore
 */
export async function syncScheduleToFirestore(schedule: ScheduleEvent): Promise<void> {
  const path = `schedules/${schedule.id}`;
  try {
    const schedRef = doc(db, 'schedules', schedule.id);
    await setDoc(schedRef, {
      ...schedule,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Could not sync schedule to Firestore:', err);
  }
}
