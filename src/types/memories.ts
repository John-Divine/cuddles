export type MemoryCategory = 'first_date' | 'milestone' | 'travel' | 'romantic' | 'celebration' | 'spontaneous';

export interface CoupleMemory {
  id: string;
  conversationId: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  category: MemoryCategory;
  imageUrl?: string;
  location?: string;
  partnerReflection?: string;
  addedByUserId: string;
  addedByUserName: string;
  addedByUserAvatar?: string;
  createdAt: string;
  favorite?: boolean;
}

export type MilestoneCategory = 'anniversary' | 'first_date' | 'first_kiss' | 'first_trip' | 'wedding' | 'custom';

export interface CoupleMilestone {
  id: string;
  title: string;
  targetDate: string; // YYYY-MM-DD
  category: MilestoneCategory;
  ritualIdea?: string;
  giftRecommendation?: string;
  completed?: boolean;
  completedAt?: string;
}

export interface RelationshipJourneyStats {
  startDate: string; // YYYY-MM-DD
  daysTogether: number;
  totalMemories: number;
  nextMilestoneTitle: string;
  daysToNextMilestone: number;
  nextMilestoneDate: string;
}
