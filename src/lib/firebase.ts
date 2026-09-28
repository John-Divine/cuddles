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
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import firebaseConfigData from '../../firebase-applet-config.json';
import { UserAccount, UserProfile, Message, Conversation, ScheduleEvent, MessageType, ContactRequest, CallSignal } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

/**
 * Remove undefined values recursively so Firestore setDoc / updateDoc never throws:
 * "Unsupported field value: undefined"
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return null as unknown as T;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)).filter((item) => item !== undefined) as unknown as T;
  }
  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean as unknown as T;
  }
  return obj;
}

/**
 * Deterministic conversation ID for two users so both User A and User B
 * always connect to the exact same conversation document and messages subcollection.
 * Normalizes usernames/IDs by stripping 'user_' and '@' prefixes and lowercasing.
 */
export function getDirectConversationId(userId1: string, userId2: string): string {
  const clean = (val: string) =>
    (val || '')
      .toLowerCase()
      .trim()
      .replace(/^user_/, '')
      .replace(/^@/, '');
  const c1 = clean(userId1);
  const c2 = clean(userId2);
  const sorted = [c1, c2].sort();
  return `conv_${sorted[0]}_${sorted[1]}`;
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
    const sanitized = sanitizeForFirestore({
      ...user,
      updatedAt: new Date().toISOString()
    });
    await setDoc(userDocRef, sanitized, { merge: true });
    console.log(`User synced to Firestore: ${user.id} (@${user.username})`);
  } catch (err) {
    console.warn('Could not sync user to Firestore:', err);
  }
}

/**
 * Permanently delete a user from Firestore
 */
export async function deleteUserFromFirestore(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', userId));
    console.log(`User deleted from Firestore: ${userId}`);
  } catch (err) {
    console.warn('Could not delete user from Firestore:', err);
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
 * Find an existing 1-on-1 conversation in Firestore between two users
 * by checking if both users' IDs or usernames are in participantIds.
 */
export async function findExistingConversationInFirestore(
  user1Identifiers: string[],
  user2Identifiers: string[]
): Promise<Conversation | null> {
  try {
    const convsCol = collection(db, 'conversations');
    const snapshot = await getDocs(convsCol);
    const cleanSet1 = new Set(
      user1Identifiers
        .filter(Boolean)
        .map((u) => u.toLowerCase().trim().replace(/^user_/, '').replace(/^@/, ''))
    );
    const cleanSet2 = new Set(
      user2Identifiers
        .filter(Boolean)
        .map((u) => u.toLowerCase().trim().replace(/^user_/, '').replace(/^@/, ''))
    );

    for (const d of snapshot.docs) {
      const data = d.data() as Conversation;
      if (!data || data.isGroup || !data.participantIds) continue;
      const cleanParticipants = data.participantIds.map((p) =>
        (p || '').toLowerCase().trim().replace(/^user_/, '').replace(/^@/, '')
      );
      const hasUser1 = cleanParticipants.some((p) => cleanSet1.has(p));
      const hasUser2 = cleanParticipants.some((p) => cleanSet2.has(p));
      if (hasUser1 && hasUser2) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Error finding conversation in Firestore:', err);
  }
  return null;
}

/**
 * Save / update conversation in Firestore
 */
export async function syncConversationToFirestore(conv: Conversation): Promise<void> {
  const path = `conversations/${conv.id}`;
  try {
    const convRef = doc(db, 'conversations', conv.id);

    // Ensure all variants of participant identifiers are present
    const rawParticipants = conv.participantIds || [];
    const normalizedSet = new Set<string>();
    rawParticipants.forEach((p) => {
      if (!p) return;
      normalizedSet.add(p);
      const clean = p.toLowerCase().trim().replace(/^user_/, '').replace(/^@/, '');
      if (clean) {
        normalizedSet.add(clean);
        normalizedSet.add(`user_${clean}`);
      }
    });

    const sanitized = sanitizeForFirestore({
      id: conv.id,
      title: conv.title || '',
      avatar: conv.avatar || '',
      participantIds: Array.from(normalizedSet),
      partnerIds: conv.partnerIds || [],
      isGroup: !!conv.isGroup,
      isE2EESecure: !!conv.isE2EESecure,
      sharedKeyFingerprint: conv.sharedKeyFingerprint || '',
      titles: conv.titles || {},
      avatars: conv.avatars || {},
      participantDetails: conv.participantDetails || {},
      lastMessage: conv.lastMessage || null,
      disappearingTimerMinutes: conv.disappearingTimerMinutes || 0,
      updatedAt: new Date().toISOString()
    });
    await setDoc(convRef, sanitized, { merge: true });
  } catch (err) {
    console.warn('Could not sync conversation to Firestore:', err);
  }
}

/**
 * Sync message to Firestore under /conversations/{conversationId}/messages/{messageId}
 */
export async function syncMessageToFirestore(message: Message): Promise<boolean> {
  const path = `conversations/${message.conversationId}/messages/${message.id}`;
  try {
    const msgRef = doc(db, 'conversations', message.conversationId, 'messages', message.id);
    let messageToSave = {
      ...message,
      createdAtISO: message.createdAtISO || new Date().toISOString()
    };

    // If sender avatar is a massive base64 string (> 15KB), use clean Dicebear avatar URL in cloud to prevent bloat
    if (messageToSave.senderAvatar && messageToSave.senderAvatar.startsWith('data:') && messageToSave.senderAvatar.length > 15000) {
      messageToSave = {
        ...messageToSave,
        senderAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(message.senderName || message.senderId)}`
      };
    }

    // If attachment dataUrl is too large for a Firestore doc (>850KB),
    // save message with thumbnail/metadata in Firestore to avoid 1MiB reject error.
    if (messageToSave.attachment?.url && messageToSave.attachment.url.length > 850000) {
      console.warn(`[Firestore Transfer] Large media payload (${messageToSave.attachment.url.length} chars) preserved locally in IndexedDB; metadata saved to cloud.`);
      messageToSave = {
        ...messageToSave,
        attachment: {
          ...messageToSave.attachment,
          url: '',
          isPurgedFromOnlineDatabase: true,
          isStoredLocally: true,
          isDownloadedToDevice: true
        }
      };
    }

    const sanitized = sanitizeForFirestore(messageToSave);
    await setDoc(msgRef, sanitized, { merge: true });
    return true;
  } catch (err) {
    console.error('Could not sync message to Firestore:', err);
    return false;
  }
}

/**
 * Purge media payload from Firestore message so heavy files don't linger on the server
 */
export async function purgeMessageMediaFromFirestore(
  conversationId: string,
  messageId: string
): Promise<void> {
  const path = `conversations/${conversationId}/messages/${messageId}`;
  try {
    const msgRef = doc(db, 'conversations', messageId.startsWith('conv_') ? conversationId : conversationId, 'messages', messageId);
    await updateDoc(msgRef, {
      'attachment.url': '',
      'attachment.isPurgedFromOnlineDatabase': true,
      'attachment.isDownloadedToDevice': true,
      'attachment.purgedAt': new Date().toISOString()
    });
    console.log(`Media payload purged from cloud database for message: ${messageId}`);
  } catch (err) {
    console.warn('Could not purge message media from Firestore (may already be offline/removed):', err);
  }
}

/**
 * Delete a message from Firestore for everyone
 */
export async function deleteMessageFromFirestore(
  conversationId: string,
  messageId: string
): Promise<boolean> {
  const path = `conversations/${conversationId}/messages/${messageId}`;
  try {
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    // Set isDeletedForEveryone and purge attachment so media is wiped from cloud
    await setDoc(
      msgRef,
      {
        id: messageId,
        conversationId,
        isDeletedForEveryone: true,
        text: 'This message was deleted',
        attachment: null,
        deletedAt: new Date().toISOString()
      },
      { merge: true }
    );
    console.log(`Message deleted from Firestore for everyone: ${messageId}`);
    return true;
  } catch (err) {
    console.warn('Could not delete message from Firestore:', err);
    return false;
  }
}

/**
 * Update message status to 'read' in Firestore when the recipient views it
 */
export async function markMessageAsReadInFirestore(
  conversationId: string,
  messageId: string
): Promise<void> {
  try {
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await updateDoc(msgRef, {
      status: 'read',
      readAt: new Date().toISOString()
    });
  } catch (err) {
    // If updateDoc fails (e.g. document does not exist yet or offline), non-critical warning
    console.warn('Could not mark message as read in Firestore:', err);
  }
}

/**
 * Mark all unread messages from other participants as 'read' in Firestore
 */
export async function markConversationMessagesAsRead(
  conversationId: string,
  currentUserId: string
): Promise<number> {
  if (!conversationId || !currentUserId) return 0;
  try {
    const messagesCollection = collection(db, 'conversations', conversationId, 'messages');
    const snapshot = await getDocs(messagesCollection);
    let count = 0;
    const updatePromises: Promise<any>[] = [];
    const readAt = new Date().toISOString();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Message;
      if (data && data.senderId !== currentUserId && data.status !== 'read') {
        count++;
        updatePromises.push(
          updateDoc(docSnap.ref, {
            status: 'read',
            readAt
          }).catch((e) => console.warn('Could not update msg read status:', e))
        );
      }
    });

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
    return count;
  } catch (err) {
    console.warn('Could not mark conversation messages as read:', err);
    return 0;
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
          const data = docSnap.data() as Message;
          if (data && data.id) {
            msgs.push(data);
          }
        });
        // Sort messages strictly chronologically by milliseconds
        msgs.sort((a, b) => {
          const tA = a.createdAtISO ? Date.parse(a.createdAtISO) : (a.timestamp ? Date.parse(`1970-01-01T${a.timestamp}`) : 0);
          const tB = b.createdAtISO ? Date.parse(b.createdAtISO) : (b.timestamp ? Date.parse(`1970-01-01T${b.timestamp}`) : 0);
          return (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
        });
        onUpdate(msgs);
      },
      (error) => {
        console.warn('Real-time message listener notice on path:', path, error);
      }
    );
  } catch (err) {
    console.warn('Could not establish real-time listener:', err);
    return () => {};
  }
}

/**
 * Real-time listener for user's conversations
 */
export function subscribeToUserConversations(
  userId: string,
  userUsername?: string,
  onUpdate?: (conversations: Conversation[]) => void
): Unsubscribe {
  // Support both (userId, onUpdate) and (userId, userUsername, onUpdate)
  const actualOnUpdate = typeof userUsername === 'function' ? (userUsername as unknown as (conversations: Conversation[]) => void) : onUpdate;
  const usernameClean = typeof userUsername === 'string' ? userUsername.toLowerCase().trim().replace(/^@/, '') : '';

  if (!actualOnUpdate) return () => {};

  try {
    const convsCol = collection(db, 'conversations');
    return onSnapshot(
      convsCol,
      (snapshot) => {
        const list: Conversation[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as Conversation;
          if (!data || !data.participantIds) return;

          const isParticipant = data.participantIds.some((p) => {
            if (!p) return false;
            const cleanP = p.toLowerCase().trim().replace(/^user_/, '').replace(/^@/, '');
            if (p === userId) return true;
            if (usernameClean && cleanP === usernameClean) return true;
            if (usernameClean && p === `user_${usernameClean}`) return true;
            return false;
          });

          if (isParticipant) {
            list.push(data);
          }
        });
        actualOnUpdate(list);
      },
      (err) => console.warn('Conversations listener warning:', err)
    );
  } catch (e) {
    return () => {};
  }
}

/**
 * Purge online messages older than 15 days from Firestore so nothing lingers indefinitely online,
 * while leaving local client messages completely intact on device storage.
 */
export async function purgeExpiredOnlineMessagesFromFirestore(
  conversationId: string,
  olderThanDays: number = 15
): Promise<number> {
  const cutoffMs = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const snapshot = await getDocs(messagesRef);
    let deletedCount = 0;
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (data.createdAtISO) {
        const msgTime = Date.parse(data.createdAtISO);
        // Only delete if it's a valid date and strictly older than 15 days
        if (!isNaN(msgTime) && msgTime < cutoffMs) {
          await deleteDoc(doc(db, 'conversations', conversationId, 'messages', docSnap.id));
          deletedCount++;
        }
      }
    }
    if (deletedCount > 0) {
      console.log(`[Online Retention] Purged ${deletedCount} messages older than ${olderThanDays} days from Firestore: ${conversationId}`);
    }
    return deletedCount;
  } catch (err) {
    console.warn('Online purge error (may be offline):', err);
    return 0;
  }
}

/**
 * Sync schedule to Firestore
 */
export async function syncScheduleToFirestore(schedule: ScheduleEvent): Promise<void> {
  const path = `schedules/${schedule.id}`;
  try {
    const schedRef = doc(db, 'schedules', schedule.id);
    const sanitized = sanitizeForFirestore({
      ...schedule,
      updatedAt: new Date().toISOString()
    });
    await setDoc(schedRef, sanitized, { merge: true });
  } catch (err) {
    console.warn('Could not sync schedule to Firestore:', err);
  }
}

/**
 * Search user by username in Firestore
 */
export async function searchUserByUsernameInFirestore(username: string): Promise<UserAccount | null> {
  const clean = username.trim().replace(/^@/, '').toLowerCase();
  if (!clean) return null;

  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    for (const d of snapshot.docs) {
      const data = d.data() as UserAccount;
      if (!data) continue;
      const cleanDataUser = data.username?.trim().replace(/^@/, '').toLowerCase();
      if (cleanDataUser === clean) {
        return data;
      }
      // Also match email prefix or id
      if (data.email && data.email.toLowerCase().split('@')[0] === clean) {
        return data;
      }
      if (data.id === clean) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Search user by username error:', err);
  }
  return null;
}

/**
 * Authenticate against Firestore users collection for cross-device sign-in.
 */
export async function authenticateWithFirestore(
  identifier: string,
  pass: string
): Promise<UserAccount | null> {
  const clean = identifier.trim().replace(/^@/, '').toLowerCase();
  if (!clean || !pass) return null;
  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    for (const d of snapshot.docs) {
      const data = d.data() as UserAccount;
      if (!data) continue;
      const cleanDataUser = (data.username || '').trim().replace(/^@/, '').toLowerCase();
      const matchIdentifier =
        cleanDataUser === clean ||
        (data.email && data.email.toLowerCase().trim() === clean) ||
        data.id === clean;
      if (matchIdentifier && data.password === pass) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Firestore authentication check notice:', err);
  }
  return null;
}

/**
 * Send contact request to Firestore
 */
export async function sendContactRequestToFirestore(request: ContactRequest): Promise<void> {
  try {
    const reqRef = doc(db, 'contact_requests', request.id);
    const sanitized = sanitizeForFirestore({
      ...request,
      updatedAt: new Date().toISOString()
    });
    await setDoc(reqRef, sanitized);
    console.log(`Contact request ${request.id} dispatched to @${request.receiverUsername}`);
  } catch (err) {
    console.warn('Could not dispatch contact request to Firestore:', err);
  }
}

/**
 * Update contact request status in Firestore
 */
export async function updateContactRequestStatusInFirestore(
  requestId: string,
  status: 'accepted' | 'declined',
  responderData?: {
    receiverId?: string;
    receiverName?: string;
    receiverUsername?: string;
    receiverAvatar?: string;
  }
): Promise<void> {
  try {
    const reqRef = doc(db, 'contact_requests', requestId);
    const updates: Record<string, any> = {
      status,
      respondedAt: new Date().toISOString()
    };
    if (responderData) {
      if (responderData.receiverId) updates.receiverId = responderData.receiverId;
      if (responderData.receiverName) updates.receiverName = responderData.receiverName;
      if (responderData.receiverUsername) updates.receiverUsername = responderData.receiverUsername;
      if (responderData.receiverAvatar) updates.receiverAvatar = responderData.receiverAvatar;
    }
    await updateDoc(reqRef, sanitizeForFirestore(updates));
    console.log(`Contact request ${requestId} updated to ${status}`);
  } catch (err) {
    console.warn('Could not update contact request status:', err);
  }
}

/**
 * Real-time listener for contact requests relevant to the user
 */
export function subscribeToContactRequests(
  userId: string,
  userUsername: string,
  onUpdate: (requests: ContactRequest[]) => void
): Unsubscribe {
  try {
    const requestsCol = collection(db, 'contact_requests');
    return onSnapshot(
      requestsCol,
      (snapshot) => {
        const list: ContactRequest[] = [];
        const cleanUser = userUsername.toLowerCase().trim().replace(/^@/, '');
        snapshot.forEach((d) => {
          const data = d.data() as ContactRequest;
          if (!data) return;
          const cleanReceiver = (data.receiverUsername || '').toLowerCase().trim().replace(/^@/, '');
          if (
            data.receiverId === userId ||
            data.senderId === userId ||
            cleanReceiver === cleanUser
          ) {
            list.push(data);
          }
        });
        onUpdate(list);
      },
      (err) => {
        console.warn('Contact requests listener warning:', err);
      }
    );
  } catch (e) {
    console.warn('Could not subscribe to contact requests:', e);
    return () => {};
  }
}

// --- Real-Time Call Signaling Operations ---

/**
 * Initiate an audio/video call signal in Firestore
 */
export async function initiateCallInFirestore(call: CallSignal): Promise<void> {
  try {
    const callRef = doc(db, 'calls', call.id);
    const sanitized = sanitizeForFirestore({
      ...call,
      updatedAt: new Date().toISOString()
    });
    await setDoc(callRef, sanitized);
    console.log(`Call ${call.id} initiated in Firestore by ${call.callerName}`);
  } catch (err) {
    console.warn('Could not initiate call in Firestore:', err);
  }
}

/**
 * Real-time listener for incoming ringing calls directed at the active user
 */
export function subscribeToIncomingCalls(
  userId: string,
  onIncomingCall: (call: CallSignal) => void
): Unsubscribe {
  try {
    const callsCol = collection(db, 'calls');
    return onSnapshot(
      callsCol,
      (snapshot) => {
        const now = Date.now();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as CallSignal;
          if (
            data &&
            data.status === 'ringing' &&
            data.callerId !== userId &&
            data.targetParticipantIds &&
            data.targetParticipantIds.includes(userId)
          ) {
            const callTime = new Date(data.createdAt).getTime();
            // Ring only if initiated within the last 60 seconds
            if (!isNaN(callTime) && now - callTime < 60000) {
              onIncomingCall(data);
            }
          }
        });
      },
      (err) => console.warn('Incoming calls listener warning:', err)
    );
  } catch (e) {
    console.warn('Could not subscribe to incoming calls:', e);
    return () => {};
  }
}

/**
 * Answer an active call in Firestore
 */
export async function answerCallInFirestore(callId: string, userId: string): Promise<void> {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status: 'connected',
      answeredBy: userId,
      answeredAt: new Date().toISOString()
    });
    console.log(`Call ${callId} answered in Firestore by ${userId}`);
  } catch (err) {
    console.warn('Could not answer call in Firestore:', err);
  }
}

/**
 * End or terminate a call in Firestore
 */
export async function endCallInFirestore(callId: string): Promise<void> {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status: 'ended',
      endedAt: new Date().toISOString()
    });
    console.log(`Call ${callId} marked as ended in Firestore`);
  } catch (err) {
    console.warn('Could not end call in Firestore:', err);
  }
}

/**
 * Decline an incoming call in Firestore
 */
export async function declineCallInFirestore(callId: string): Promise<void> {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status: 'declined',
      endedAt: new Date().toISOString()
    });
    console.log(`Call ${callId} declined in Firestore`);
  } catch (err) {
    console.warn('Could not decline call in Firestore:', err);
  }
}

/**
 * Listen to real-time status changes of an active call (e.g. other party answered or hung up)
 */
export function subscribeToCallStatus(
  callId: string,
  onUpdate: (call: CallSignal) => void
): Unsubscribe {
  try {
    const callRef = doc(db, 'calls', callId);
    return onSnapshot(
      callRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate(snapshot.data() as CallSignal);
        }
      },
      (err) => console.warn('Call status listener notice:', err)
    );
  } catch (e) {
    return () => {};
  }
}

/**
 * Save WebRTC SDP Offer to Firestore
 */
export async function saveCallOffer(callId: string, offer: { type: string; sdp: string }): Promise<void> {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      offer: { type: offer.type, sdp: offer.sdp }
    });
    console.log(`[WebRTC] Saved SDP Offer for call ${callId}`);
  } catch (err) {
    console.warn('Could not save call offer in Firestore:', err);
  }
}

/**
 * Save WebRTC SDP Answer to Firestore
 */
export async function saveCallAnswer(callId: string, answer: { type: string; sdp: string }): Promise<void> {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      answer: { type: answer.type, sdp: answer.sdp },
      status: 'connected'
    });
    console.log(`[WebRTC] Saved SDP Answer for call ${callId}`);
  } catch (err) {
    console.warn('Could not save call answer in Firestore:', err);
  }
}

/**
 * Add ICE candidate to Firestore
 */
export async function addCallIceCandidate(
  callId: string,
  role: 'caller' | 'callee',
  candidate: any
): Promise<void> {
  try {
    const callRef = doc(db, 'calls', callId);
    const field = role === 'caller' ? 'callerCandidates' : 'calleeCandidates';
    await updateDoc(callRef, {
      [field]: arrayUnion(candidate)
    });
  } catch (err) {
    console.warn(`Could not add ${role} ICE candidate:`, err);
  }
}

