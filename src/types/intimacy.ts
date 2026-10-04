export interface DailyPromptResponse {
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  answeredAt: string;
  heartReaction?: boolean;
}

export interface DailyPromptData {
  dateKey: string; // YYYY-MM-DD
  questionId: string;
  questionText: string;
  category: 'deep' | 'romantic' | 'playful' | 'gratitude';
  responses: Record<string, DailyPromptResponse>;
}

export type BucketCategory = 'romantic' | 'adventure' | 'cozy' | 'foodie' | 'spontaneous';

export interface BucketListItem {
  id: string;
  conversationId: string;
  title: string;
  description?: string;
  category: BucketCategory;
  completed: boolean;
  completedAt?: string;
  completedByUserId?: string;
  addedByUserId: string;
  addedByName: string;
  memoryNote?: string;
}

export type IntimacyNeed = 'cuddle' | 'talk' | 'listening' | 'fun' | 'space';

export interface IntimacyMoodState {
  userId: string;
  conversationId: string;
  batteryPercent: number; // 20 to 100
  currentNeed: IntimacyNeed;
  customNote?: string;
  updatedAt: string;
}

export interface HeartbeatPulseEvent {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  intensity: number; // 1 to 5
  timestamp: string;
}

export type VoucherCategory = 'massage' | 'date' | 'treat' | 'cuddle' | 'favor' | 'custom';

export interface LoveVoucher {
  id: string;
  conversationId: string;
  title: string;
  description: string;
  category: VoucherCategory;
  issuerId: string;
  issuerName: string;
  recipientId: string;
  status: 'available' | 'redeemed';
  redeemedAt?: string;
  redeemedNote?: string;
}
