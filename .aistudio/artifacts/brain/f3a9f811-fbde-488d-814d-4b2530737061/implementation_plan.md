# Implementation Plan: Strict Mobile Viewport Containment & Camera Video Playback with Scrub Controls

## 1. User Intent & Product Strategy

### The Problem
1. **Unwanted Mobile Horizontal Scrolling**: When viewing the chat interface on mobile devices, the viewport is prone to horizontal shifts and side-scrolling, breaking the native app-like experience. This is caused by overflowing header action docks, absolute hover action buttons positioned outside message boundaries (`-left-16` / `-right-16`), and lack of strict `overflow-x: hidden` constraints across mobile containers.
2. **Camera Video Playback Failure**: In the camera video recorder, recorded videos fail to play upon stopping, appearing blank or missing. Mobile browser decoders (specifically Android Chrome and iOS Safari) reject multi-megabyte `data:video/*;base64` strings as video `src` attributes, requiring real `blob:` URLs created via `URL.createObjectURL(blob)` for hardware-accelerated playback, alongside proper video duration metadata and scrub controls.

### Confirmed User Preferences
- **Video Playback**: Custom overlay video player with intuitive scrub controls, elapsed/total time readout, play/pause toggle, and sound toggle.
- **Horizontal Scroll Fix**: Strict viewport lock with automatic text wrap, media containment, and responsive mobile flex layout.

---

## 2. UX, Layout & Visual Design System

### A. Mobile Viewport & Chat Layout Integrity
- **Zero Horizontal Overflow**:
  - `html, body, #root`: Hard-locked with `overflow-x: hidden !important; width: 100%; max-width: 100vw;`.
  - Chat messages feed: Container constrained with `w-full max-w-full overflow-x-hidden overflow-y-auto overscroll-contain`.
  - Message bubbles: Text wrapping enforced with `break-words [overflow-wrap:anywhere] max-w-[85%] sm:max-w-md`.
  - Hover Action Docks: Restricted to desktop view (`hidden sm:flex`) so `-left-16` / `-right-16` buttons never bleed beyond mobile screen bounds.
  - Header & Status Banners: Fluid flex layouts with text truncation and compact responsive hitboxes on narrow screens (<380px).

### B. Custom Video Playback Review Player
- **Visual Symmetry**: Continues the dark romantic sanctuary design (`bg-slate-950` with rose/amber highlights).
- **Controls & Ergonomics**:
  - **Center Play/Pause Toggle**: Floating circular touch trigger (`w-14 h-14 bg-rose-600/90 text-white backdrop-blur-md shadow-xl`) that fades smoothly during active playback and reappears on tap or pause.
  - **Scrubber Bar**: Custom draggable timeline scrubber with rose progress fill, allowing instantaneous seeking through recorded footage.
  - **Time Counters**: Clear monospace timestamps showing current elapsed time and total recorded duration (e.g. `00:04 / 00:15`).
  - **Audio Toggle**: One-tap mute/unmute control for the review video.
  - **Action Footers**: Clean, accessible "Retake" button and prominent "Send Video" CTA with optional caption input.

```
+-------------------------------------------------------+
|  [Video Icon] Preview Video               [Flip]  [X] |
+-------------------------------------------------------+
|                                                       |
|                                                       |
|                     [ ( > ) Play ]                    |
|                                                       |
|                                                       |
|  [Play/Pause]  ===●==================  00:04 / 00:12  |
|               Scrubber Timeline Bar         [Mute]    |
+-------------------------------------------------------+
| [ Add a caption... (optional)                       ] |
| [ RotateCcw Retake ]             [ Send Send Video  ] |
+-------------------------------------------------------+
```

---

## 3. Technical Architecture & Real Integration Strategy

### Architecture Flow

```
+-----------------------------------------------------------------------------------+
| MediaRecorder (WebM/MP4)                                                          |
|   |                                                                               |
|   v (chunksRef -> Blob)                                                           |
| 1. URL.createObjectURL(blob)                                                      |
|   |---> Review Video Player (<video src={blobUrl} playsInline />)                |
|   |---> Custom Overlay Controls (Play/Pause, Scrubber seeking, Mute toggle)       |
|                                                                                   |
| 2. User confirms "Send Video"                                                     |
|   |---> Read Blob via FileReader into persistent Base64 Data URL                  |
|   |---> Save to IndexedDB Vault (DeviceMediaStorage)                              |
|   |---> Sync to Firestore collection 'conversations/{id}/messages'                |
|   |---> Cleanup ObjectURL via URL.revokeObjectURL(blobUrl)                        |
+-----------------------------------------------------------------------------------+
```

### Key Technical Details
1. **Blob-First Media Playback**:
   - `MediaRecorder.onstop` immediately creates a `blobUrl = URL.createObjectURL(blob)` and saves the raw `Blob` reference in state.
   - The `<video>` element loads `blobUrl`, enabling smooth, hardware-accelerated playback on all mobile devices.
   - When the user presses "Retake" or unmounts the modal, `URL.revokeObjectURL(blobUrl)` cleanly frees memory.
2. **Recorded Duration Capture**:
   - Accurately tracks recorded seconds using a ref counter (`recordingDurationRef.current`) during the recording interval to avoid stale closures.
3. **Viewport CSS Hardening**:
   - Eliminate any rogue negative margins (`-ml-1`, `-left-16`, `-right-16`) on mobile touch viewports.
   - Apply `overflow-x-hidden` on the message scroll container and main chat window.

---

## 4. Work Breakdown & Implementation Phases

### Phase 1: Fix Video Recorder Playback & Custom Scrubber
- Update `src/components/chat/CameraVideoModal.tsx`:
  - Store recorded `Blob` and generate `blobUrl` with `URL.createObjectURL(blob)`.
  - Fix duration calculation via `recordingDurationRef`.
  - Implement custom overlay scrubber controls:
    - Scrubber input / timeline with seek handler (`videoRef.current.currentTime = ...`).
    - Play / Pause overlay and toggle button.
    - Monospace time indicator (`currentTime` / `duration`).
    - Audio mute / unmute button.
  - In `handleSend`, serialize the `blob` to Data URL only upon clicking "Send Video", with a brief encoding loader if needed.

### Phase 2: Eliminate Mobile Horizontal Scrolling
- Update `src/components/chat/MessageBubble.tsx`:
  - Guard the hover action dock with `hidden sm:flex` so absolute positioned buttons do not push mobile canvas width.
  - Enforce `max-w-[85%] sm:max-w-md break-words [overflow-wrap:anywhere]`.
- Update `src/components/chat/ChatWindow.tsx`:
  - Add `w-full max-w-full overflow-x-hidden` to the messages container and header wrappers.
  - Adjust the busy status notification banner to wrap or truncate text on small mobile screens.
- Update `src/App.tsx` and `src/index.css`:
  - Ensure strict containment on outer viewports (`max-w-[100vw] overflow-x-hidden`).

### Phase 3: Verification & Compilation
- Run `compile_applet` and `lint_applet` to verify clean build and type safety.
- Test video recording, playback controls, retake flow, and send flow.
- Verify that mobile chat interface only scrolls vertically with zero horizontal sway.
