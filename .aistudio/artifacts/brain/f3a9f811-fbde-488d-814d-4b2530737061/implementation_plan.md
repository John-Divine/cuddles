# Implementation Plan: Fix Phone-Recorded Video Note Playback Across Devices

## Problem Diagnosis
When recording video notes on a mobile device (specifically Android using Google Chrome), the video notes play during the in-modal review step, but after being sent, tapping on them in the chat bubble produces no response ("it just looks as if I didn't tap on it") and they do not play on either sender or receiver devices. In contrast, video notes recorded from laptops work properly.

### Root Causes
1. **Container & MIME Type Mislabeling**:
   - On Android Chrome, `MediaRecorder` records using `video/webm;codecs=vp8,opus`.
   - However, the recording logic prioritized `video/mp4` or defaulted the MIME type to `video/mp4`.
   - When converting the base64 data URL to a `Blob` URL via `dataUrlToBlobUrl()`, it prioritized the external `mimeType` parameter (`video/mp4`) over the actual header in the data URL (`video/webm`). When Chrome or other browsers are handed a Blob URL with `type: video/mp4` that actually contains WebM data, the media demuxer throws `DEMUXER_ERROR_COULD_NOT_PARSE` / `MEDIA_ERR_SRC_NOT_SUPPORTED`.
2. **`canvas.captureStream` Timestamp Skew on Mobile Hardware**:
   - The recorder was routing video through a 2D canvas stream (`canvas.captureStream(24)`) and re-attaching microphone audio tracks.
   - On mobile Android GPUs, `canvas.captureStream` frequently generates desynchronized timestamps between canvas frames and microphone audio, causing `MediaRecorder` to produce corrupted WebM cluster headers that Android's hardware `MediaCodec` rejects on subsequent playback.
   - The native camera `MediaStream` from `getUserMedia` produces hardware-synchronized, standard-compliant streams with zero frame corruption. The circular appearance is natively achieved via CSS (`rounded-full overflow-hidden object-cover`), making canvas capture unnecessary.
3. **Silent Playback Rejection in `MessageBubble.tsx`**:
   - In `MessageBubble.tsx`, `setIsPlayingVideoNote(true)` was only called inside `video.play().then()`.
   - When `video.play()` rejected due to demux/decode failure, the error was swallowed silently. The poster image and play overlay remained visible, creating the symptom where tapping did nothing.
   - The `<video>` element lacked `onPlay`, `onPause`, `onEnded`, and `onError` event listeners to sync state with the actual HTML5 video element.

---

## Proposed Changes

### 1. `src/components/chat/VideoNoteRecorder.tsx`
- **Stream Directly from Camera `MediaStream`**: Record directly from the camera `stream` (using mobile-optimized VGA constraints `width: { ideal: 480, max: 720 }, height: { ideal: 480, max: 720 }, frameRate: { ideal: 24, max: 30 }`). Remove intermediate canvas capture stream to eliminate timestamp desynchronization.
- **Accurate Browser-Native MIME Type**:
  - Query supported types in order: `video/webm;codecs=vp8,opus`, `video/webm`, `video/mp4;codecs=avc1`, `video/mp4`.
  - Use `recorder.mimeType` as the source of truth for the resulting `Blob` and metadata so the encoded container matches its declared MIME type.
- **Maintain File Size Safety Cap**: Keep the 650 KB safety limit to guarantee every video note fits within Firestore's 1 MiB document limit.

### 2. `src/lib/deviceMediaStorage.ts`
- **Strict Data URL Header Inspection in `dataUrlToBlobUrl()`**:
  - Parse the exact MIME type directly from the data URL's header (`data:<mimeType>;base64`).
  - Only fall back to external `mimeType` if the data URL lacks one.
  - Never allow an external `'video/mp4'` parameter to override a `'video/webm'` data URL payload.

### 3. `src/components/chat/MessageBubble.tsx`
- **Synchronize Video Lifecycle via Native Event Listeners**:
  - Attach `onPlay={() => setIsPlayingVideoNote(true)}`, `onPause={() => setIsPlayingVideoNote(false)}`, and `onEnded={() => { setIsPlayingVideoNote(false); setVideoProgress(0); }}` directly to `<video>`.
  - Attach `onError={(e) => handleVideoError(e)}` to detect unplayable streams and provide clear user feedback or automatic fallback.
- **Resilient Playback Handlers**:
  - In `toggleVideoNote()`, ensure that if unmuted autoplay is blocked by mobile Chrome, it falls back to muted playback and prompts the user to unmute.
  - If direct inline playback fails, provide an immediate option to open the video in the fullscreen `VideoNotePlayerModal`.

### 4. `src/components/chat/VideoNotePlayerModal.tsx`
- Ensure fullscreen popup modal loads the verified blob URL and correctly handles WebM and MP4 formats across all mobile browsers.

---

## Verification Plan

### Automated Verification
1. Run `lint_applet` (`tsc --noEmit`) to verify zero TypeScript errors.
2. Run `compile_applet` (`npm run build`) to ensure production build succeeds.

### Manual Verification Flow
1. **Record Video Note on Android Chrome**:
   - Tap the video note camera button.
   - Record a 5–10 second video note.
   - Verify it plays in the review step.
   - Tap Send.
2. **Sender Device Playback**:
   - Tap the sent video note in the chat bubble.
   - Verify the play overlay disappears, the circular progress indicator animates, and the video note plays with audio.
3. **Recipient Device Playback**:
   - Open the conversation on another device or tab.
   - Tap the received video note.
   - Verify it plays immediately without being blocked or stuck on the poster frame.
4. **Fullscreen Modal**:
   - Tap the maximize button on the circular video note.
   - Verify playback continues seamlessly in the fullscreen player.
