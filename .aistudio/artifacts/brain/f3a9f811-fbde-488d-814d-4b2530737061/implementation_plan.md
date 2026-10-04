# Couple & Friend Intimacy Tools Suite & Responsive Chat Layout Enhancements

Transform the Cuddles sanctuary into a deeply engaging connection space by introducing four interactive intimacy tools (Daily Deep Connection Prompt, Shared Bucket List & Date Planner, Mood & Heartbeat Radar, and Redeemable Love Vouchers), while refining responsive navigation so plus menus appear strictly on small screens, pop-ups anchor within the chat viewport without covering the sidebar on laptop view, and header gallery actions are streamlined.

## User Review & Critical Decisions

> [!IMPORTANT]
> The user confirmed the prioritized category and selected tools: **"Couple and friend intimacy tools"** and **"All 1 to 4 is good"**. In addition, the layout rules for mobile/laptop view and pop-ups from the preceding brief have been synthesized directly into this blueprint.

- **Confirmed Intimacy Suite (Tools 1 to 4)**:
  1. *Daily Deep Connection Prompt*: Shared daily question with double-blind frosted answers revealed once both respond.
  2. *Shared Bucket List & Date Planner*: Interactive shared experiences with vibe filters, completion tracking, and spontaneous date spinner.
  3. *Mood & Heartbeat Radar*: Emotional battery check-in, current relationship need, and a live tactile pulsing heartbeat transmission.
  4. *Redeemable Love Vouchers & Scratch Coupons*: Romantic and thoughtful coupons with instant redemption cards sent into chat.
- **Confirmed Layout & Pop-up Refinements**:
  - *Plus (+) Menu Scope*: Appears exclusively on mobile/tablet viewports where screen width cannot fit inline action icons. On laptop/desktop views with ample space, action icons display directly in the input bar and the plus menu is hidden.
  - *Plus Menu Grid Geometry*: Replaces any horizontal row with a clean 3x2 rectangular grid palette.
  - *Top Nav Gallery De-Duplication*: Only one gallery affordance in the chat header, removing duplicate entries between nav bar and menus.
  - *Chat-Contained Pop-ups (Laptop View)*: Pop-ups (gallery, intimacy suite, settings, modals) anchor directly within the chat viewport area (`absolute inset-0`), keeping the sidebar fully visible, interactive, and unblocked.

---

## 1. Overview & Core Concept

- **What It Does**: Enhances the 1-on-1 private messaging experience with a dedicated **Intimacy & Connection Hub** accessible from the chat header and input bar. Partners and close friends can synchronously bond through meaningful daily questions, plan shared bucket list adventures, communicate emotional energy and tactile heartbeats, and exchange sweet, redeemable vouchers.
- **Target Audience / Persona**: Couples, best friends, and intimate confidants seeking deeper emotional closeness, fun rituals, and spontaneous affection beyond plain text chat.
- **Key Value**: Bridges distance and daily routine by turning passive messaging into active emotional bonding, while providing a flawless responsive desktop and mobile layout.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Opening Intimacy Tools in Chat**:
   - In any active chat header, a gentle rose-pink sparkle heart icon labeled **"Connection & Intimacy Hub"** is available.
   - On laptop view, clicking it seamlessly opens the Intimacy Hub panel directly within the chat viewport container (sidebar remains completely visible and unaffected).
   - On mobile, it slides up as a smooth touch-friendly bottom drawer with $44\text{px}+$ tap hitboxes.

2. **Flow 1: Daily Deep Connection Prompt**:
   - Users view today's curated romantic/deep question (e.g., *"What was the exact moment you felt closest to me this week?"*).
   - The partner's response is locked behind a romantic frosted glass blur with a padlock: *"Unlocks when you both answer"*.
   - Once the user types and submits their answer, both answers smoothly dissolve into view side-by-side with heart reactions and celebration particles.

3. **Flow 2: Shared Bucket List & Date Planner**:
   - Browse categorized cards (Cozy, Romantic, Adventure, Foodie, Spontaneous).
   - Filter by status: *Upcoming*, *Completed*, or *All*.
   - Quick "Surprise Us" date spinner picks an idea at random.
   - Check off an adventure to record date completed and attach a memory note.

4. **Flow 3: Mood & Heartbeat Radar**:
   - Set current emotional battery percentage ($20\%$ to $100\%$) and express current intimacy need (*"Need quiet cuddles"*, *"Ready to talk"*, *"Feeling extra loving"*).
   - **Tactile Live Heartbeat**: Hold down the glowing central heart button for 2–5 seconds; it sends a synchronized pulsing haptic heart animation straight to the partner's chat.

5. **Flow 4: Redeemable Love Vouchers**:
   - Flip through romantic voucher cards (*"20-Min Backrub"*, *"Breakfast in Bed"*, *"Movie Night Choice"*, *"Wildcard Favor"*).
   - Tap "Redeem Voucher": An animated stamp locks the coupon as redeemed and sends an celebratory message into the chat.
   - Partners can create custom vouchers with customized love tokens.

### Visual Identity & Theme
- **Color Palette**: Dark romantic sanctuary palette with 60% dominant obsidian/slate canvas (`#0b0f19`), 30% structural surfaces (`#111827`, `#1e293b`), and 10% high-intent romantic accents (rose `#f43f5e`, pink `#ec4899`, amber `#f59e0b`).
- **Typography & Hierarchy**: Refined sans display typography with `text-wrap: balance` for question prompts; tabular figures (`tabular-nums`) for timers, percentages, and counters; zero static pill wrappers.
- **Pop-up Scoping**: Modals and galleries render with absolute positioning relative to the chat section container, ensuring the laptop sidebar is never occluded or pushed.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Chat-Area Contained Modals vs. Global Fullscreen Fixed Modals**:
  - *Chosen Approach*: Anchor pop-ups and full-feature panels inside the chat area container (`absolute inset-0 z-40 overflow-y-auto`) on screens $\ge 1024\text{px}$ (laptop/desktop), falling back to full-screen overlays on small mobile screens.
  - *Why*: Directly solves the user's issue where modals centered over the whole screen covered the sidebar or misaligned when the sidebar remained stationary.
  - *Alternatives Considered*: Shifting the sidebar with CSS transforms (disorienting and shifts chat width unexpectedly).

- **Decision 2: Plus Menu Breakpoint Rules**:
  - *Chosen Approach*: Plus menu trigger button is strictly shown on mobile and tablet views where action buttons cannot fit horizontally (`lg:hidden`). On desktop/laptop views (`hidden lg:flex`), individual camera, video, gallery, document, and priority controls render inline with spacious hitboxes.
  - *Why*: Eliminates unnecessary extra clicks on wide screens while keeping mobile input bars clean and clutter-free.

- **Decision 3: Double-Blind Reveal for Daily Questions**:
  - *Chosen Approach*: Persist answered state in the conversation's Firestore subdocument / local vault. Partner's text is masked client-side until both have non-empty responses.
  - *Why*: Encourages genuine, uninfluenced vulnerability and turns answering into an exciting shared reveal.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│ App.tsx (Root State, Realtime Subscriptions, Layout Controller)         │
├──────────────────────────────┬─────────────────────────────────────────┤
│ Sidebar.tsx                  │ Chat Viewport Container (flex-1)        │
│ • Conversations list         │ ├─────────────────────────────────────┤ │
│ • All Media Gallery trigger  │ │ ChatWindow.tsx                      │ │
│ • Contacts & Calls           │ │ • Header (Status, Single Gallery,   │ │
│ • Width: w-88 (laptop)       │ │   Intimacy Hub Button)              │ │
│                              │ │ • Messages Area (Scrollable)        │ │
│                              │ │ • MessageInput.tsx                  │ │
│                              │ │   - Laptop: Inline action buttons   │ │
│                              │ │   - Mobile: Plus (+) 3x2 grid menu  │ │
│                              │ ├─────────────────────────────────────┤ │
│                              │ │ Chat-Anchored Pop-ups (absolute)    │ │
│                              │ │ • IntimacyHubModal.tsx              │ │
│                              │ │   ├─ DailyPromptView.tsx            │ │
│                              │ │   ├─ BucketListView.tsx             │ │
│                              │ │   ├─ MoodRadarView.tsx              │ │
│                              │ │   └─ LoveVouchersView.tsx           │ │
│                              │ │ • MediaGalleryModal.tsx (Chat Scope)│ │
│                              │ └─────────────────────────────────────┘ │
└──────────────────────────────┴─────────────────────────────────────────┘
```

### Data Models & State Mapping

```typescript
// 1. Daily Prompt
interface DailyPromptData {
  dateKey: string; // "YYYY-MM-DD"
  questionId: string;
  questionText: string;
  responses: {
    [userId: string]: {
      text: string;
      answeredAt: string;
    };
  };
  revealed: boolean;
}

// 2. Bucket List Item
interface BucketListItem {
  id: string;
  title: string;
  category: 'romantic' | 'adventure' | 'cozy' | 'foodie' | 'spontaneous';
  completed: boolean;
  completedAt?: string;
  addedByUserId: string;
  memoryNote?: string;
}

// 3. Mood & Heartbeat Radar
interface IntimacyMoodState {
  batteryPercent: number; // 20 to 100
  currentNeed: 'cuddle' | 'talk' | 'listening' | 'fun' | 'space';
  customNote?: string;
  lastHeartbeatSent?: string;
}

// 4. Love Voucher
interface LoveVoucher {
  id: string;
  title: string;
  description: string;
  icon: string;
  issuerId: string;
  recipientId: string;
  status: 'available' | 'redeemed';
  redeemedAt?: string;
}
```

### Interactive State Transitions
- **Daily Prompt Reveal**: Submitting an answer writes to Firestore subcollection `conversations/{id}/intimacy/daily_prompt`. Real-time listener checks if both participants have answered; if yes, triggers celebratory unlock animation.
- **Heartbeat Broadcast**: Emits a lightweight real-time pulse event via Firestore / state broadcast. Recipient's chat window shows a glowing screen pulse overlay and soft cardiac resonance sound.
- **Voucher Redemption**: Updating a voucher's status to `redeemed` automatically dispatches a system celebration message into the chat conversation.
- **Responsive Geometry**: Modals listen to parent container bounds; when rendered inside the chat area, `absolute inset-0` confines them strictly to the right of the sidebar.
