# Automated Mobile Add-to-Home-Screen Install Banner & Chrome Mobile Guide

Deliver an automated, thumb-friendly bottom install banner that intercepts the browser's native install trigger, provides a one-tap "Add to Home Screen" experience for mobile Chrome, auto-hides after 8 seconds with an easy reopen trigger, and includes an illustrated Chrome mobile walkthrough.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following choices were confirmed based on your preferences:

- **Prompt Placement**: Positioned as a floating bottom banner anchored within the natural thumb zone on mobile devices, ensuring it never obstructs critical top navigation or input fields.
- **Auto-Dismissal & Retention**: The banner will display automatically for 8 seconds with an animated countdown line, then smoothly glide away into a subtle floating reopen badge (and top bar trigger) so you can summon it back with a single tap.
- **Chrome Mobile Guidance**: In addition to triggering the native browser install dialog via `beforeinstallprompt`, the banner includes an instant "How to Install in Chrome" quick visual guide explaining how modern Chrome handles "Install app" vs. "Add to Home screen".

---

### 1. Overview & Core Concept

- **What It Does**: When visiting Cuddles on Android or mobile browsers, a dedicated bottom banner appears asking to add Cuddles to your Home Screen. Tapping "Install" immediately fires the browser's native prompt so you can install the standalone app directly. If Chrome restricts automatic triggering or delays the prompt event, a one-tap visual walkthrough guides you through Chrome's 3-dot menu options.
- **Target Audience / Persona**: Mobile users (specifically on Android using Google Chrome) who want a native-app-like icon on their phone's home screen without dealing with hidden or missing browser menu items.
- **Key Value**: Guarantees anyone on mobile can install Cuddles with zero friction, even when Google Chrome modernizes or renames the traditional "Add to Home Screen" menu entry to "Install App".

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **First Arrival & Auto-Trigger**:
   - The user opens Cuddles on their mobile phone.
   - After a gentle 1.2-second entry delay, the floating bottom banner slides up gracefully from the bottom edge.
   - A subtle progress track indicates the 8-second view window.
2. **One-Tap Direct Install**:
   - The user taps the primary "Add to Home Screen" / "Install" button.
   - Cuddles immediately calls the captured `beforeinstallprompt` event.
   - The official native Chrome prompt appears directly on the phone screen: *"Install app? Cuddles"*.
   - Confirming adds Cuddles to the home screen and app launcher.
3. **Auto-Hide & Gentle Reopen**:
   - If untouched for 8 seconds, the banner quietly glides down, leaving a floating, compact install badge in the bottom corner (plus an install icon in the top header).
   - Tapping either trigger instantly restores the prompt or launches the install dialog.
4. **Interactive Chrome Walkthrough Fallback**:
   - If the browser does not expose the prompt event, tapping the guide opens a focused 3-step visual bottom sheet explaining Chrome's menu steps (3-dots ⋮ &rarr; "Install app" or "Add to Home screen").

#### Visual Identity & Ergonomics
- **Positioning**: Bottom floating card with safe-area padding (`pb-safe bottom-4 mx-3 md:mx-auto max-w-md`), adhering to mobile thumb-zone principles ($375\text{px}$–$430\text{px}$).
- **Surface Elevation**: Dark slate container (`bg-slate-900/95 backdrop-blur-xl border border-rose-500/30 shadow-2xl shadow-rose-950/40 rounded-2xl`).
- **Interactive Controls**: Touch target hitboxes $\ge 44\text{px}$ height with vibrant rose-to-pink gradient action button (`bg-gradient-to-r from-rose-600 to-pink-600`), clear dismiss `✕` target, and high-contrast text.
- **Height Discipline**: Less than 12% of the mobile viewport height to maintain content visibility and strictly obey overlay rules.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Native Event Interception (`beforeinstallprompt`) with Stored Prompt**
  - *Chosen Approach*: Cache the `beforeinstallprompt` event at the window level so even if Chrome fires it prior to full UI mount, the event is retained and callable upon the user's tap.
  - *Why*: Browsers strictly prohibit invoking `prompt()` without user interaction; caching the event allows a single user tap on the floating banner to launch the native browser install dialog.
  - *Alternatives Considered*: Showing generic text instructions only. Discarded because modern Chrome can install the app natively in one tap when given the prompt call.

- **Decision 2: 8-Second Progress-Aware Auto-Dismiss with Persistent Recovery**
  - *Chosen Approach*: Display an animated 8-second indicator that pauses on touch/hover, auto-collapsing to a floating mini-pill or header icon rather than vanishing permanently.
  - *Why*: Fulfills the user's explicit request for a temporary pop-up that doesn't permanently obstruct the screen while ensuring the option remains accessible if missed.

- **Decision 3: Standalone Display Mode Detection**
  - *Chosen Approach*: Automatically suppress both the floating banner and reopen badge whenever the app is already running in standalone display mode (`display-mode: standalone` or `navigator.standalone`).
  - *Why*: Once installed and launched from the home screen, users should never see installation prompts inside the native-feel window.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

#### System Architecture & Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 Mobile Web Browser (Chrome)                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
               (fires 'beforeinstallprompt')
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   usePWAInstall Engine                      │
│   • Captures & caches BeforeInstallPromptEvent              │
│   • Detects platform (Android, iOS, Desktop)                │
│   • Checks standalone display mode state                    │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
        Prompt Ready                     Auto-Timer
               │                          (8 seconds)
               ▼                              ▼
┌──────────────────────────────┐ ┌───────────────────────────┐
│     PWAInstallBanner         │ │   Floating Reopen Pill    │
│  • Floating bottom card      │ │ • Displays on auto-hide   │
│  • "Add to Home Screen" CTA  │ │ • 1-tap reopens banner    │
│  • "Need help?" guide link   │ └───────────────────────────┘
└──────────────┬───────────────┘
               │
      [User Taps Install]
               │
        Is Event Ready?
        ├── YES ──► event.prompt() ──► Native Chrome Dialog
        └── NO  ──► Step-by-Step Chrome Visual Bottom Sheet
```

#### State & Interaction Mapping

| State / Trigger | Behavior | UI Transition |
| :--- | :--- | :--- |
| **Initial Visit** (Non-standalone) | Starts 1.2s delay, then sets `isOpen: true` | Banner slides up from bottom with spring animation |
| **8-Second Timer** | Countdown runs; user hover/touch pauses timer | Progress bar smoothly decrements to 0% |
| **Timer Expiry** | Closes banner, sets `minimized: true` | Slides down; small floating install badge appears |
| **Tap Install (Prompt available)** | Calls `deferredPrompt.prompt()`, awaits outcome | Native Android Chrome install bottom sheet appears |
| **Tap Install (Prompt unavailable)** | Opens step-by-step Chrome guide modal | Detailed visual sheet highlights 3-dot Chrome menu |
| **Tap Dismiss (✕)** | Sets `dismissed: true` for the session | Banner glides away cleanly |
| **App Installed Event** | Listens for `appinstalled` | Hides all banners and persists installed state |
