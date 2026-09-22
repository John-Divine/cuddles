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
 */
export function getDirectConversationId(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
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
    const sanitized = sanitizeForFirestore({
      id: conv.id,
      title: conv.title || '',
      avatar: conv.avatar || '',
      participantIds: conv.participantIds || [],
      partnerIds: conv.partnerIds || [],
      isGroup: !!conv.isGroup,
      isE2EESecure: !!conv.isE2EESecure,
      sharedKeyFingerprint: conv.sharedKeyFingerprint || '',
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
export async function syncMessageToFirestore(message: Message): Promise<void> {
  const path = `conversations/${message.conversationId}/messages/${message.id}`;
  try {
    const msgRef = doc(db, 'conversations', message.conversationId, 'messages', message.id);
    const sanitized = sanitizeForFirestore({
      ...message,
      createdAtISO: message.createdAtISO || new Date().toISOString()
    });
    await setDoc(msgRef, sanitized);
  } catch (err) {
    console.warn('Could not sync message to Firestore:', err);
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
        // Sort messages chronologically by timestamp or createdAtISO
        msgs.sort((a, b) => (a.createdAtISO || a.timestamp).localeCompare(b.createdAtISO || b.timestamp));
        onUpdate(msgs);
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
 * Real-time listener for user's conversations
 */
export function subscribeToUserConversations(
  userId: string,
  onUpdate: (conversations: Conversation[]) => void
): Unsubscribe {
  try {
    const convsCol = collection(db, 'conversations');
    return onSnapshot(
      convsCol,
      (snapshot) => {
        const list: Conversation[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as Conversation;
          if (data && data.participantIds && data.participantIds.includes(userId)) {
            list.push(data);
          }
        });
        if (list.length > 0) {
          onUpdate(list);
        }
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
  const cutoffTime = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const snapshot = await getDocs(messagesRef);
    let deletedCount = 0;
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const time = data.createdAtISO || data.timestamp;
      if (time && time < cutoffTime) {
        await deleteDoc(doc(db, 'conversations', conversationId, 'messages', docSnap.id));
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      console.log(`[Online Retention] Purged ${deletedCount} messages older than 15 days from Firestore: ${conversationId}`);
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

