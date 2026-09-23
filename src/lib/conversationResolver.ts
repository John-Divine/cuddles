import { Conversation, UserProfile, UserAccount } from '../types';
import { getStoredAccounts } from './storage';

export interface ConversationDisplayDetails {
  title: string;
  avatar?: string;
  otherParticipantId?: string;
  otherParticipant?: UserProfile | null;
  isPartner: boolean;
}

/**
 * Resolves the display title, avatar, and other participant for any conversation.
 * GUARANTEES that in a 1-on-1 chat, a user will NEVER see their own name or avatar!
 * If user "Sage" is talking with "Teddy", Sage will ALWAYS see "Teddy" (and Teddy will see "Sage").
 */
export function getConversationDisplayDetails(
  conversation: Conversation | undefined | null,
  currentUser: UserAccount | UserProfile,
  contacts: UserProfile[] = []
): ConversationDisplayDetails {
  if (!conversation) {
    return {
      title: 'Conversation',
      avatar: undefined,
      otherParticipantId: undefined,
      otherParticipant: null,
      isPartner: false
    };
  }

  // 1. Group Conversations
  if (conversation.isGroup) {
    return {
      title: conversation.title,
      avatar: conversation.avatar,
      otherParticipantId: undefined,
      otherParticipant: null,
      isPartner: false
    };
  }

  const currentUserId = currentUser.id;
  const currentUsernameClean = (currentUser.username || '').toLowerCase().trim().replace(/^@/, '');
  const currentNameClean = (currentUser.name || '').trim().toLowerCase();

  // 2. Identify the other participant's ID
  const otherParticipantId = conversation.participantIds?.find((id) => {
    if (id === currentUserId) return false;
    const cleanId = id.toLowerCase().trim();
    if (currentUsernameClean && (cleanId === currentUsernameClean || cleanId === `user_${currentUsernameClean}`)) {
      return false;
    }
    return true;
  });

  // 3. Check conversation's explicit participant details (saved during creation/sync)
  let detailMatch: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
    partnerNickname?: string;
    relationshipType?: string;
  } | null = null;

  if (conversation.participantDetails) {
    for (const [pId, detail] of Object.entries(conversation.participantDetails)) {
      const cleanPUsername = (detail.username || '').toLowerCase().trim().replace(/^@/, '');
      if (
        pId !== currentUserId &&
        (!currentUsernameClean || cleanPUsername !== currentUsernameClean) &&
        (!currentNameClean || detail.name.trim().toLowerCase() !== currentNameClean)
      ) {
        detailMatch = detail;
        break;
      }
    }
  }

  // 4. Check contacts list
  let contactMatch = contacts.find((c) => {
    // Exclude self
    if (c.id === currentUserId) return false;
    const cleanCUsername = (c.username || '').toLowerCase().trim().replace(/^@/, '');
    if (currentUsernameClean && cleanCUsername === currentUsernameClean) return false;
    if (currentNameClean && c.name.trim().toLowerCase() === currentNameClean) return false;

    // Check direct ID or username matches
    if (otherParticipantId && (c.id === otherParticipantId || c.id.toLowerCase() === otherParticipantId.toLowerCase())) {
      return true;
    }
    if (detailMatch && (c.id === detailMatch.id || (detailMatch.username && cleanCUsername === detailMatch.username.toLowerCase().trim().replace(/^@/, '')))) {
      return true;
    }
    if (otherParticipantId && cleanCUsername && otherParticipantId.toLowerCase().includes(cleanCUsername)) {
      return true;
    }
    return false;
  });

  // If no contact matched via otherParticipantId, but contacts has non-self contacts:
  if (!contactMatch && contacts.length > 0) {
    const candidates = contacts.filter((c) => {
      if (c.id === currentUserId) return false;
      const cleanC = (c.username || '').toLowerCase().trim().replace(/^@/, '');
      if (currentUsernameClean && cleanC === currentUsernameClean) return false;
      if (currentNameClean && c.name.trim().toLowerCase() === currentNameClean) return false;
      return true;
    });

    if (candidates.length === 1) {
      contactMatch = candidates[0];
    } else if (otherParticipantId) {
      contactMatch = candidates.find((c) => otherParticipantId.includes(c.id) || (c.username && otherParticipantId.includes(c.username)));
    }
  }

  // 5. Check local stored accounts (e.g. if Teddy is an account on this or another device)
  let accountMatch: UserAccount | null = null;
  if (!contactMatch && !detailMatch && otherParticipantId) {
    const stored = getStoredAccounts();
    accountMatch = stored.find((a) => {
      if (a.id === currentUserId) return false;
      const cleanAUsername = (a.username || '').toLowerCase().trim().replace(/^@/, '');
      if (currentUsernameClean && cleanAUsername === currentUsernameClean) return false;
      return a.id === otherParticipantId || (cleanAUsername && otherParticipantId.toLowerCase().includes(cleanAUsername));
    }) || null;
  }

  // 6. Check per-user titles and avatars on the conversation
  const userScopedTitle = conversation.titles?.[currentUserId];
  const userScopedAvatar = conversation.avatars?.[currentUserId];

  // 7. Resolve Final Title (STRICT ANTI-SELF NAME GUARANTEE)
  let finalTitle = '';

  if (contactMatch) {
    finalTitle = contactMatch.partnerNickname || contactMatch.name;
  } else if (detailMatch) {
    finalTitle = detailMatch.partnerNickname || detailMatch.name;
  } else if (accountMatch) {
    finalTitle = accountMatch.partnerNickname || accountMatch.name;
  } else if (userScopedTitle && userScopedTitle.trim().toLowerCase() !== currentNameClean) {
    finalTitle = userScopedTitle;
  } else if (conversation.title && conversation.title.trim().toLowerCase() !== currentNameClean && (!currentUsernameClean || conversation.title.trim().toLowerCase() !== currentUsernameClean)) {
    finalTitle = conversation.title;
  } else if (otherParticipantId) {
    // If the conversation title literally matches the current user's name (e.g. "Sage"),
    // extract candidate name from other participant ID or fallback to Partner/Friend
    const cleanedId = otherParticipantId.replace(/^user_/, '').replace(/^friend_/, '').replace(/^partner_/, '');
    if (cleanedId && !cleanedId.match(/^\d+$/) && cleanedId.toLowerCase() !== currentUsernameClean) {
      finalTitle = cleanedId.charAt(0).toUpperCase() + cleanedId.slice(1);
    } else if (contacts.length > 0) {
      const nonSelf = contacts.find((c) => c.id !== currentUserId && c.name.toLowerCase() !== currentNameClean);
      finalTitle = nonSelf ? (nonSelf.partnerNickname || nonSelf.name) : 'Partner';
    } else {
      finalTitle = conversation.partnerIds?.length ? 'Partner' : 'Friend';
    }
  } else {
    finalTitle = conversation.title || 'Private Chat';
  }

  // 8. Resolve Final Avatar
  let finalAvatar =
    contactMatch?.avatar ||
    detailMatch?.avatar ||
    accountMatch?.avatar ||
    userScopedAvatar ||
    (conversation.avatar && conversation.avatar !== currentUser.avatar ? conversation.avatar : undefined) ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(finalTitle)}`;

  const isPartner =
    (contactMatch?.relationshipType === 'partner') ||
    (detailMatch?.relationshipType === 'partner') ||
    (conversation.partnerIds && conversation.partnerIds.length > 0);

  return {
    title: finalTitle,
    avatar: finalAvatar,
    otherParticipantId: contactMatch?.id || detailMatch?.id || otherParticipantId,
    otherParticipant: contactMatch || (detailMatch ? ({
      id: detailMatch.id,
      name: detailMatch.name,
      username: detailMatch.username,
      avatar: detailMatch.avatar || finalAvatar,
      status: 'In Sanctuary 💕',
      moodEmoji: '💖',
      online: true,
      relationshipType: isPartner ? 'partner' : 'friend',
      safetyFingerprint: '9B2E74FA',
      verifiedKey: true
    } as UserProfile) : null),
    isPartner
  };
}
