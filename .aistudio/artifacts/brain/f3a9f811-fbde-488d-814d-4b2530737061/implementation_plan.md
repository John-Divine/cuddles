# Message Deletion, Chat Media Gallery, Camera Video Recorder & Gallery Picker Fix

Comprehensive plan to implement multi-message deletion (with "Delete for Everyone" and "Delete for Me"), chat-isolated media gallery, full-screen camera video recorder with playback preview, and reliable mobile gallery image picking.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Key design and architectural decisions confirmed from user answers:

- **Message Deletion Scope**: Long-pressing or tapping and holding a message opens message selection mode. Deleting provides a choice: **"Delete for everyone"** (purges from Firestore cloud database and both users' chats) or **"Delete for me"** (hides/removes message on current device only).
- **Chat Media Gallery**: When opened from the chat header icon, it strictly scopes to that individual chat. All collection dropdowns and cross-chat switchers are removed from the chat header view, presenting a clean full-screen media explorer with filter tabs (All, Photos & GIFs, Videos, Voice Notes, Docs).
- **Sidebar Media Gallery**: Retains global multi-chat view for browsing all sanctuary media across conversations and local vault.
- **Camera Video Recorder**: Replaces the circular video note button in the mobile `+` attachments menu with a full camera video recorder matching the `CameraCaptureModal` design. Records standard rectangular video, offers camera switching (front/back), timer, and transitions to a playback review screen with **Send** and **Retake** buttons.
- **Gallery Image Picker Fix**: Fixes the issue where picking an image from Android's gallery doesn't send or show anything. Enhances file reading with immediate preview modal and reliable compression/fallback.

---

## 1. Overview & Core Concept

1. **Message Management**: Users can delete individual or multiple selected messages and media. If the message was sent by the user, they can choose to delete for everyone or just for themselves.
2. **Context-Aware Media Explorer**: Opening the gallery from a chat header displays only media exchanged within that specific conversation.
3. **Mobile Video Camera**: A native-feeling in-app video recorder that captures videos using the device camera, lets the user preview the recorded video, and send with an optional caption.
4. **Resilient Photo Picker**: Mobile image picking immediately opens an interactive preview modal with Send/Cancel, eliminating silent drops or stalled uploads on Android Chrome.

---

## 2. User Experience & Visual Design

### Key User Flows

```
[Chat Messages] ──(Long Press / Tap & Hold)──> [Multi-Select Mode Active]
                                                        │
                                                        ├── Tap messages to toggle selection
                                                        ├── Top Bar: "N Selected" | [Select All] | [Cancel] | [Trash]
                                                        │
                                                        ▼
                                                [Delete Dialog]
                                              ┌────────────────────────┐
                                              │  Delete 2 messages?    │
                                              │                        │
                                              │  [Delete for Everyone] │ (if sender)
                                              │  [Delete for Me]       │
                                              │  [Cancel]              │
                                              └────────────────────────┘

[Chat Header Gallery Icon] ──> [Chat Media Explorer (Current Chat Only)]
                               ├── Header: "[Contact Name] Media"
                               ├── No dropdowns or other chat collections
                               └── Tabs: All | Photos | Videos | Voice | Docs

[Mobile + Menu] ──(Video Icon)──> [Camera Video Recorder Modal]
                                       ├── Live Viewfinder (Front/Back Camera flip)
                                       ├── Shutter: Red Record / Stop with Live Timer
                                       └── [Review Screen] ──> Play/Pause + Retake + Send

[Mobile + Menu] ──(Gallery Icon)──> [Native Android Picker] ──> [Image Send Preview Modal]
                                                                     ├── Large Image Preview
                                                                     ├── Caption Input
                                                                     └── [Send Now] / [Cancel]
```

### Visual Styling & Interactions
- **Selection Highlights**: Selected message bubbles receive a soft rose-tinted border (`ring-2 ring-rose-500/70 bg-rose-950/20`), with subtle checkmark pills along the edge.
- **Selection Action Bar**: An animated top bar (`bg-slate-900/95 backdrop-blur-md border-b border-rose-950/50`) displaying selection count, quick "Select All", and a red-accented Trash button.
- **Camera Video Recorder**: Dark translucent cinematic interface matching `CameraCaptureModal`, with pulsing red recording indicator, duration timer, flip camera toggle, and immediate video playback preview with a glowing Send button.

---

## 3. Key Technical Decisions & Trade-Offs

### 1. Message Deletion Architecture ("Delete for Everyone" vs "Delete for Me")
- **Delete for Everyone**:
  - Checks that the user is the author of the message(s).
  - Deletes the document from Firestore (`conversations/{convId}/messages/{msgId}`).
  - Emits real-time removal or updates message to `{ isDeleted: true, text: 'This message was deleted' }` or complete removal from both participants' state. Complete document removal with synchronized local state ensures zero trace left behind.
  - Purges any corresponding media file from the device IndexedDB vault if requested.
- **Delete for Me**:
  - Adds the message ID to a local `hiddenMessageIds` set stored in `localStorage` / `IndexedDB` under the user account.
  - Filters out hidden messages from the active view and chat history so the recipient's view remains untouched.

### 2. Chat-Specific Media Gallery Isolation
- Pass a locked `isChatSpecific={true}` prop to `MediaGalleryModal` when opened from `ChatWindow.tsx`.
- When `isChatSpecific` is true:
  - Omit collection dropdowns, chip selectors, and the "Show All Collections" button.
  - Set the title directly to `${conversation.title} Media`.
  - Filter `allMediaItems` strictly to `item.conversationId === activeConversation.id`.

### 3. Dedicated Camera Video Recorder Component
- Build `VideoCameraModal.tsx` utilizing `navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: true })`.
- Record standard MP4/WebM video stream via `MediaRecorder`.
- On stop: Provide an in-modal `<video controls>` review state with Retake (`RotateCcw`) and Send (`Send`), passing the video to `onSendMedia('video', url, duration, ...)`.

### 4. Direct Photo Picker Preview & Send Fix
- Upgrade `handleImageChange` in `MessageInput.tsx` to handle Android file picker results reliably:
  - Generate immediate blob preview using `URL.createObjectURL(file)` in addition to base64 compression.
  - Show a prominent `MediaSendPreviewModal` whenever an image is chosen, with full-size preview, caption bar, and primary "Send" button so the user has immediate visual feedback and clear one-tap delivery.

---

## 4. Technical Architecture & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                               App.tsx                                  │
│  - messagesMap, activeConversationId                                   │
│  - handleDeleteMessages(messageIds, deleteForEveryone)                 │
│  - showMediaGalleryModal (with scope: 'all' | 'conversation')          │
└───────────────────┬────────────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────────────────────────┐
        ▼                                           ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│       ChatWindow.tsx         │        │    MediaGalleryModal.tsx     │
│  - Selection Mode State      │        │  - When isChatSpecific:      │
│  - Selection Top Action Bar  │        │    * Hide collection chips   │
│  - Delete Confirmation Modal │        │    * Lock to single chat     │
│  - Header Gallery Icon (Only)│        │    * Filter tabs (All/Media/ │
└──────────────┬───────────────┘        │      Audio/Docs)             │
               │                        └──────────────────────────────┘
               ▼
┌──────────────────────────────────────────────────────────────┐
│                      MessageInput.tsx                        │
│  - Mobile Plus Menu (+)                                      │
│  - Camera Photo Modal (CameraCaptureModal)                   │
│  - NEW: Camera Video Modal (VideoCameraModal)                │
│  - NEW: Image Send Preview Modal (MediaSendPreviewModal)     │
│  - Resilient File Picker Fallbacks                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Verification Plan

1. **Message Deletion**:
   - Long press a message on mobile (or right-click / hold on desktop) -> verify selection mode activates.
   - Select multiple messages -> check that count updates accurately.
   - Tap Delete -> verify options for "Delete for everyone" and "Delete for me".
   - Test "Delete for everyone" -> verify message disappears from chat and Firestore.
   - Test "Delete for me" -> verify message vanishes from user's screen while remaining intact for peer.
2. **Chat-Specific Gallery**:
   - Open a chat and tap the gallery icon in the chat header -> verify only media from this chat is displayed and no collection switcher exists.
   - Open the sidebar gallery -> verify all media across all conversations remains accessible.
3. **Camera Video Recorder**:
   - Tap `+` on mobile -> tap Video camera icon -> verify live camera opens with front/back toggle.
   - Record video -> tap stop -> verify playback preview plays the recorded video.
   - Tap Send -> verify video sends as standard video attachment with working playback.
   - Tap Retake -> verify it returns to recording viewfinder.
4. **Gallery Image Picker**:
   - Tap `+` -> tap Photo Gallery -> select image from Android -> verify preview modal immediately opens and tapping Send sends the image to chat without stalls.
