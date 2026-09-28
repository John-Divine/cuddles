# Implementation Plan: WhatsApp-Style Landing, Double-Tick Read Receipts, Real-Time Activity Status, Menu Visibility Fix, and Message/Media Persistence

## 1. User Intent & Product Strategy

### The User Requirements
1. **No Auto-Opening of Chats on Load**:
   - When the user opens the web app on desktop/laptop or mobile, do not auto-select or auto-open a conversation.
   - **Desktop/Laptop**: Display a WhatsApp Web-style sanctuary landing splash screen (brand icon, encryption badge, "Select a chat to begin" prompt).
   - **Mobile**: Show the conversation list (sidebar). Clicking a chat opens it, and a mobile Back button (`<ArrowLeft />`) allows returning to the list.
2. **Double-Tick Read Receipts**:
   - Sent: 1 check (grey `✓`).
   - Delivered: 2 checks (grey `✓✓`).
   - Seen / Read: 2 romantic rose-pink checks (`✓✓`) with subtle glow, matching WhatsApp's behavior.
   - When the recipient opens the conversation, unread messages are marked as `read` in Firestore and synced to the sender in real-time.
3. **Live Active & Schedule Status (Free vs Busy & Quiet Delivery)**:
   - Display real-time active/online status in the chat header ("Active now" / "Last seen").
   - Display schedule state:
     - If Free/Available: Green badge (`● Available & Free`).
     - If Busy: Amber badge (`🌙 Busy: [Activity] until [Time]`).
   - If busy, messages arrive in Quiet Mode (silent delivery) unless marked as Urgent via the lightning toggle.
4. **Fix Plus (+) and 3-Dots Menu Display**:
   - Root cause: In the previous turn, `overflow-hidden` was added to `MessageInput` and `ChatWindow` `<header>`, clipping the absolute menus (`bottom-14 left-0` and `top-12 right-0`).
   - Fix: Remove `overflow-hidden` from the header and input bar while keeping horizontal boundary clipping safe with `overflow-x-clip` and elevated `z-50`.
5. **Fix Message & Media Disappearance (Full Persistence)**:
   - Root cause:
     - `getUserMessages`, `getUserConversations`, and `getUserContacts` fell back to empty sets when `getActiveAccountId()` returned null (guest/default user mode), causing state to initialize as `{}` and wipe or de-sync local history on reload.
     - `subscribeToConversationMessages` had an async race condition where empty cloud attachments wiped local `attachment.url` before `getMediaFromDeviceVault` resolved.
   - Fix:
     - Guarantee initialization fallback to `'user_me'` / `STORAGE_KEYS.MESSAGES`.
     - In real-time message merge, protect local attachment URLs so purged cloud media never overwrites local offline vault media.

---

## 2. UX, Layout & Visual Design System

### A. WhatsApp Web-Style Landing Splash Screen (Desktop/Laptop)
- Displayed in the main window when `!activeConversation`:
  - Centered brand iconography: Romantic gradient heart/chat icon with pulsing ring.
  - Heading: "Cuddles Private Sanctuary".
  - Subheading: "End-to-end encrypted personal sanctuary. Connect deeply with your favorite people."
  - Encryption Assurance: Green lock badge ("🔒 256-bit AES-GCM Encrypted • Zero Data Lingering").
  - Clear prompt: "Select a conversation from the sidebar to start chatting."

```
+-------------------------------------------------------------+
|                                                             |
|                       [ (💖) Icon ]                         |
|                 Cuddles Private Sanctuary                   |
|     End-to-end encrypted personal sanctuary. Select a      |
|           conversation to start communicating.              |
|                                                             |
|          [ 🔒 256-bit AES-GCM Encrypted & Private ]         |
|                                                             |
+-------------------------------------------------------------+
```

### B. Mobile Navigation (WhatsApp App Pattern)
- When no chat is selected on mobile: The sidebar conversation list fills the viewport (`lg:hidden w-full`).
- When a chat is selected on mobile: `ChatWindow` fills the screen with an `<ArrowLeft />` back button in the header.
- Tapping Back returns to the conversation list (`setActiveConversationId('')`).

### C. Romantic Rose-Pink Read Receipts
- `status === 'sent'`: `<Check className="w-3.5 h-3.5 text-slate-400" />`
- `status === 'delivered'`: `<CheckCheck className="w-3.5 h-3.5 text-slate-400" />`
- `status === 'read'`: `<CheckCheck className="w-3.5 h-3.5 text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]" />`

### D. Active Status & Schedule Header
- In the chat header subtitle:
  - If Online & Free: `● Online · Free & Available` (emerald-400)
  - If Busy: `🌙 Busy · [ActivityTitle] until [Time]` (amber-400)
  - If Offline: `Offline · Last seen recently`

---

## 3. Technical Architecture & Data Operations

### 1. State Initialization & Persistence
- Fix `activeConversationId`:
  - Initialize to `''`. Only set when the user explicitly clicks a conversation row.
- Fix `messagesMap`, `contacts`, `conversations`:
  - Use `const accountId = getActiveAccountId() || 'user_me';`
  - Load stored local messages and contacts so history is never blanked out on page refresh.

### 2. Real-Time Read Receipt Synchronization
- In `src/lib/firebase.ts`:
  - Add `markConversationMessagesAsRead(conversationId: string, currentUserId: string)`:
    - Queries unread messages sent by the other party in `conversations/{convId}/messages`.
    - Updates their `status` to `'read'` in Firestore.
- In `src/App.tsx`:
  - Whenever `activeConversationId` changes or new messages arrive while the chat is actively open, invoke `markConversationMessagesAsRead`.
  - Sender receives the updated message with `status: 'read'` via `subscribeToConversationMessages` and the double checkmarks turn rose-pink immediately.

### 3. Fixing Menu Clipping (Plus & 3-Dots)
- In `ChatWindow.tsx`: Remove `overflow-hidden` from the `<header>` element. The 3-dots dropdown menu (`absolute right-0 top-12 z-50`) will pop out cleanly without clipping.
- In `MessageInput.tsx`: Remove `overflow-hidden` from the root container. The plus menu (`absolute bottom-14 left-0 z-50`) will pop up without clipping.

### 4. Message & Media Retention Safeguard
- In `subscribeToConversationMessages`:
  - If a message in Firestore has `attachment.url === ''` (purged from cloud), but local state already has the media URL in memory or in device IndexedDB vault, **preserve the local URL**.
  - Do not overwrite valid media data with an empty string.

---

## 4. Work Breakdown & Implementation Phases

### Phase 1: Navigation & WhatsApp-Style Landing Screen
- Create `src/components/chat/EmptyChatSplash.tsx` for the desktop/laptop landing view.
- Update `src/App.tsx`:
  - Set initial `activeConversationId` to `''`.
  - If `!activeConversation`:
    - On desktop (`lg:flex`): render `<EmptyChatSplash />`.
    - On mobile: show the sidebar conversations list.
  - Pass `onBack={() => setActiveConversationId('')}` to `ChatWindow`.
- Update `src/components/chat/ChatWindow.tsx`:
  - Add mobile Back button (`<ArrowLeft />`) calling `onBack`.

### Phase 2: Fix Menu Clipping (Plus & 3-Dots)
- Update `src/components/chat/ChatWindow.tsx`: Remove `overflow-hidden` from `<header>`.
- Update `src/components/chat/MessageInput.tsx`: Remove `overflow-hidden` from the root bar container so the plus menu is fully visible and clickable.

### Phase 3: Read Receipts (WhatsApp Rose-Pink Double Checks)
- Update `src/lib/firebase.ts`:
  - Add `markConversationMessagesAsRead` function.
- Update `src/App.tsx`:
  - Trigger `markConversationMessagesAsRead` when opening an active chat or receiving messages.
- Update `src/components/chat/MessageBubble.tsx`:
  - Render romantic rose-pink double ticks for `status === 'read'`.

### Phase 4: Active Online & Schedule Presence
- Update `src/components/chat/ChatWindow.tsx`:
  - In chat header, display presence badge and schedule status (Free vs Busy).
  - Show quiet mode delivery notice when recipient is busy.

### Phase 5: Message & Media Persistence Hardening
- Update `src/App.tsx`:
  - Guarantee `'user_me'` fallback for default storage keys.
  - In Firestore message subscription, merge local attachment URLs so cloud purges never erase offline media.

### Phase 6: Build & Verification
- Compile applet with `compile_applet`.
- Run `lint_applet`.
- Verify desktop landing, mobile back navigation, menus, read receipts, and media loading.
