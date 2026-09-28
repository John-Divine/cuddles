export type RelationshipType = 'partner' | 'friend';

export interface UserAccount {
  id: string;
  username: string; // unique username e.g. "alex" or "sarah"
  email: string;
  password: string;
  name: string;
  avatar: string;
  createdAt: string;
  contactIds?: string[]; // IDs of users this user has added & accepted
  partnerNickname?: string;
  partnerAnniversary?: string;
  status?: string;
  moodEmoji?: string;
  safetyFingerprint: string;
  bio?: string;
  location?: string;
  currentSchedule?: DayScheduleStatus;
}

export interface DayScheduleStatus {
  isBusy: boolean;
  activityTitle: string;
  untilTime: string;
  category?: string;
}

export interface UserProfile {
  id: string;
  username?: string;
  email?: string;
  name: string;
  avatar: string;
  status: string; // e.g., 'Thinking of you 💕' or 'Available'
  moodEmoji?: string;
  online: boolean;
  lastSeen?: string;
  relationshipType: RelationshipType;
  partnerAnniversary?: string; // Only for partners
  partnerNickname?: string;
  safetyFingerprint: string;
  verifiedKey?: boolean;
  currentSchedule?: DayScheduleStatus;
  bio?: string;
  location?: string;
}

export interface ContactRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderAvatar: string;
  receiverId: string;
  receiverUsername: string;
  receiverName?: string;
  receiverAvatar?: string;
  relationshipType: RelationshipType;
  partnerNickname?: string;
  partnerAnniversary?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  respondedAt?: string;
}

export type MessageType = 'text' | 'image' | 'voice' | 'video_note' | 'gif' | 'system' | 'document' | 'video';
export type MessagePriority = 'normal' | 'urgent' | 'emergency';

export interface MediaAttachment {
  type: MessageType;
  url: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  fileName?: string;
  fileSizeBytes?: number;
  fileSize?: string;
  mimeType?: string;
  isStoredLocally?: boolean; // Media stored on device
  isDownloadedToDevice?: boolean;
  isPurgedFromOnlineDatabase?: boolean;
  downloadedAt?: string;
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  salt: string;
  isEncrypted: boolean;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  timestamp: string;
  createdAtISO?: string; // For 14-day auto purge calculations
  type: MessageType;
  text?: string;
  encryptedPayload?: EncryptedPayload;
  decryptedContent?: string;
  attachment?: MediaAttachment;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  priority?: MessagePriority;
  deliveredSilently?: boolean;
  reactions?: MessageReaction[];
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  expiresAt?: string; // Ephemeral messages
  isDeletedForEveryone?: boolean;
  deletedForUsers?: string[];
  deletedAt?: string;
}

export interface Conversation {
  id: string;
  title: string;
  avatar?: string;
  isGroup: boolean;
  participantIds: string[];
  partnerIds: string[]; // Track which participants are partners
  createdAt: string;
  lastMessage?: {
    text: string;
    timestamp: string;
    senderName: string;
    unreadCount: number;
  };
  isE2EESecure: boolean;
  disappearingTimerMinutes?: number; // 0 = off, 5, 1440, etc.
  sharedKeyFingerprint: string;
  pinned?: boolean;
  titles?: Record<string, string>; // Per-user display title
  avatars?: Record<string, string>; // Per-user display avatar
  participantDetails?: Record<
    string,
    {
      id: string;
      name: string;
      username: string;
      avatar?: string;
      relationshipType?: RelationshipType;
      partnerNickname?: string;
    }
  >;
}

export interface CallParticipant {
  id: string;
  name: string;
  avatar: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking: boolean;
  isLocal: boolean;
  stream?: MediaStream | null;
  relationshipType?: RelationshipType;
}

export interface ActiveCall {
  id: string;
  conversationId: string;
  conversationTitle: string;
  isGroup: boolean;
  callType: 'audio' | 'video';
  status: 'ringing' | 'connected' | 'ended';
  startedAt: string;
  participants: CallParticipant[];
  isScreenSharing?: boolean;
}

export interface CallSignal {
  id: string;
  conversationId: string;
  conversationTitle: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  callType: 'audio' | 'video';
  targetParticipantIds: string[];
  status: 'ringing' | 'connected' | 'ended' | 'declined';
  createdAt: string;
  endedAt?: string;
  answeredBy?: string;
  offer?: { type: string; sdp: string };
  answer?: { type: string; sdp: string };
  callerCandidates?: any[];
  calleeCandidates?: any[];
}

export interface ScheduleEvent {
  id: string;
  title: string;
  description?: string;
  dateTime: string;
  endTime?: string;
  isBusySlot?: boolean;
  category: 'day_routine' | 'work_focus' | 'sleep' | 'partner_date' | 'anniversary' | 'group_call' | 'hangout' | 'reminder';
  targetGroup: 'partners' | 'friends' | 'all';
  attendeeIds: string[];
  color: string;
  remindMinutesBefore: number;
  ownerId?: string;
}
