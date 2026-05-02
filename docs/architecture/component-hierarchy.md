# Component Hierarchy
## Talking Tom PWA

**Document Status:** Final  
**Author:** Architect  
**Created:** May 1, 2026  
**Phase:** Design  
**References:** ADR-006 (Component Architecture), docs/requirements/user-stories.md

---

## 1. Top-Level Component Tree

```
App (+page.svelte)
├── LoadingScreen.svelte           [US-UI01]
│     └── ProgressBar.svelte       (inline)
│
├── PermissionPrompt.svelte        [US-UI03, US-SEC01]
│
├── ErrorMessage.svelte            [US-UI04]
│
├── UpdateBanner.svelte            [US-PWA03, US-PWA04]
│
├── Stage3D.svelte                 [US-3D01]          ← Threlte <Canvas>
│   ├── Camera.svelte              [US-3D01]
│   ├── Lighting.svelte            [US-3D04]
│   └── TomCharacter.svelte        [US-3D02, US-3D05, US-3D06, US-3D07, US-3D08]
│         ├── (GLTF model nodes — internal)
│         └── (AnimationMixer — internal)
│
├── GestureLayer.svelte            [US-T04, US-T05, US-T01, US-T02, US-T03]
│     └── (Invisible overlay — captures pointer events)
│
└── Controls.svelte
      ├── MicrophoneButton.svelte  [US-UI02, US-V01, US-V02]
      ├── SettingsButton.svelte    [US-UI05]
      ├── SettingsPanel.svelte     [US-UI05, US-V03, US-A11Y04, US-A11Y05]
      │     ├── PitchSlider.svelte (inline)
      │     ├── SoundToggle.svelte (inline)
      │     └── AccessibilityOptions.svelte (inline)
      ├── OfflineIndicator.svelte  [US-PWA04]
      └── VisualStateIndicators.svelte [US-UI06, US-V04]
```

---

## 2. Component Specifications

### 2.1 App (`+page.svelte`)

**Purpose:** Root component. Orchestrates mounting order, global state subscription, and conditional rendering.

**Responsibilities:**
- Subscribe to `$appState` for conditional rendering
- Mount `Stage3D` once assets are loaded
- Show `LoadingScreen` while `assetsLoaded === false`
- Show `PermissionPrompt` when `micPermission === 'prompt'`
- Handle `isOnline` changes for `OfflineIndicator`

**Props:** None (root route)

**Stores Used:** `appState`, `animationState`, `audioState`

**User Stories Implemented:** Orchestrates all

---

### 2.2 LoadingScreen (`ui/LoadingScreen.svelte`)

**Purpose:** Full-screen overlay shown during initial asset loading.

**Responsibilities:**
- Display loading progress percentage (0–100%)
- Show app name/logo
- Animate loading indicator (CSS animation, not Three.js)
- Hide when `$appState.assetsLoaded === true`

**Props:**
```typescript
// None — reads from $appState
```

**Stores Used:** `appState` (read: `isLoading`, `assetsLoaded`)

**Accessibility:**
- `role="status"` with `aria-label="Loading Talking Tom"`
- `aria-live="polite"` for progress announcements
- Loading animation respects `prefers-reduced-motion`

**User Stories:** US-UI01

---

### 2.3 Stage3D (`components/3d/Stage3D.svelte`)

**Purpose:** Threlte `<Canvas>` root. Manages WebGL context lifecycle.

**Responsibilities:**
- Create and own the Threlte `<Canvas>` element
- Set renderer pixel ratio and antialiasing
- Handle WebGL context loss/restore events
- Dispatch `assetsLoaded` once GLTF model is ready

**Props:**
```typescript
interface Stage3DProps {
  width: number;
  height: number;
}
```

**Stores Used:** `appState` (write: `assetsLoaded`, `errorMessage`)

**Events Emitted:** `contextlost`, `contextrestored`

**WebGL Initialization:**
```svelte
<Canvas
  rendererParameters={{ antialias: true, alpha: true }}
  on:contextlost={() => appState.update(s => ({ ...s, errorMessage: 'WebGL context lost' }))}
>
  <Camera />
  <Lighting />
  <TomCharacter />
</Canvas>
```

**User Stories:** US-3D01, US-PERF01

---

### 2.4 TomCharacter (`components/3d/TomCharacter.svelte`)

**Purpose:** Loads and renders the Tom GLTF model. Owns animation playback.

**Responsibilities:**
- Load `tom.glb` via Threlte's `useGltf` hook
- Initialize `animationService` with loaded `actions` and `mixer`
- React to `$animationState.current` changes to trigger animation crossfades
- Expose bone positions for future lip-sync support
- Handle Draco decoder initialization

**Props:** None

**Stores Used:**
- `appState` (write: `assetsLoaded = true` on load complete)
- `animationState` (read: `current` → triggers crossfade)

**Initialization Sequence:**
```typescript
// 1. useGltf loads model + animations
// 2. useAnimations creates actions from gltf.animations
// 3. animationService.init(actions, mixer)
// 4. appState.update(s => ({...s, assetsLoaded: true}))
// 5. animationService.play('IDLE')
```

**Error Handling:**
- If load fails → `appState.update(s => ({...s, errorMessage: 'Failed to load character'}))`
- Missing animation clips → log warning, continue with available clips

**User Stories:** US-3D02, US-3D03, US-3D05, US-3D06, US-3D07, US-3D08

---

### 2.5 Camera (`components/3d/Camera.svelte`)

**Purpose:** Perspective camera positioned to frame Tom character.

**Responsibilities:**
- Set `fov: 45`, `near: 0.1`, `far: 100`
- Position: `[0, 1.4, 3.5]` (eye level, slightly above ground)
- LookAt: `[0, 0.8, 0]` (Tom's torso center)
- No orbital controls (static camera — prevents motion sickness)

**Props:** None

**User Stories:** US-3D01

---

### 2.6 Lighting (`components/3d/Lighting.svelte`)

**Purpose:** Scene lighting setup for character visibility.

**Responsibilities:**
- Ambient light: intensity `0.6`, color `#ffffff`
- Directional key light: `[2, 4, 3]`, intensity `0.8`
- Fill light: `[-2, 2, -1]`, intensity `0.3`
- No real-time shadows on mobile (performance budget)

**Props:** None

**User Stories:** US-3D04

---

### 2.7 GestureLayer (`components/interaction/GestureLayer.svelte`)

**Purpose:** Invisible full-screen overlay that captures all pointer events and translates them to `GestureEvent` objects via `gestureService`.

**Responsibilities:**
- Cover the entire 3D canvas (absolute positioned, z-index above canvas)
- Forward pointer events to `gestureService.classify(event)`
- `gestureService` returns `GestureEvent | null`
- If gesture is not null → `gestureService.dispatchToAnimation(gestureEvent)`

**Why separate from TomCharacter:**  
Raycast-based 3D click detection requires knowing which mesh was hit. `GestureLayer` handles the DOM event capture, passes the screen coordinates to `gestureService`, which performs the Three.js raycast internally.

**Accessibility:**
- `role="application"` with `aria-label="Tom character interactive area"`
- Keyboard events forwarded: `Enter` → tap center, `Space` → pet, long `Space` → hold

**User Stories:** US-T01, US-T02, US-T03, US-T04, US-T05, US-A11Y02

---

### 2.8 Controls (`Controls.svelte`)

**Purpose:** Container for all UI control elements positioned below the 3D stage.

**Props:** None

**Stores Used:** `appState`, `audioState`

**Layout:** Fixed bottom panel, responsive horizontal layout

**User Stories:** Container only

---

### 2.9 MicrophoneButton (`ui/MicrophoneButton.svelte`)

**Purpose:** Primary interactive control for voice input. Manages microphone permission UX.

**Responsibilities:**
- Show microphone icon with visual state (idle/recording/playing)
- On tap: check `micPermission` state
  - `'prompt'` → trigger `PermissionPrompt`
  - `'denied'` → show error message
  - `'granted'` → call `audioService.startListening()`
- Show pulsing animation while `$audioState.isListening === true`
- Show spinner/waveform while `$audioState.isSpeaking === true`
- Resume `AudioContext` on first tap (iOS requirement)

**Props:** None

**Stores Used:**
- `appState` (read: `micPermission`)
- `audioState` (read: `isListening`, `isSpeaking`)

**Touch Target:** 60×60px minimum (accessibility requirement)

**Accessibility:**
- `aria-label` changes: "Start listening" / "Listening…" / "Playing back"
- `aria-pressed` when recording active
- Keyboard: `Enter` or `Space` to activate

**User Stories:** US-UI02, US-V01, US-V02, US-SEC01, US-A11Y02

---

### 2.10 PermissionPrompt (`ui/PermissionPrompt.svelte`)

**Purpose:** Modal explaining why microphone permission is needed before requesting.

**Responsibilities:**
- Show on first microphone button tap if `micPermission === 'prompt'`
- Explain: "Talking Tom needs your microphone to hear and repeat what you say. Your voice never leaves your device."
- "Allow" button → call `audioService.requestPermission()` → updates `micPermission`
- "No thanks" button → dismiss, show touch-only mode info
- Dismissable with Esc key

**Props:** None

**Stores Used:** `appState` (read/write: `micPermission`)

**Accessibility:**
- `role="dialog"` with `aria-labelledby` and `aria-describedby`
- Focus trapped within modal while open
- `aria-modal="true"`

**User Stories:** US-UI03, US-SEC01, US-V02, US-A11Y02

---

### 2.11 SettingsPanel (`ui/SettingsPanel.svelte`)

**Purpose:** Slide-in panel for user preferences.

**Responsibilities:**
- Toggle visibility on SettingsButton tap
- Pitch slider (1.2x–1.8x range, step 0.1, default 1.5x)
- Sound effects toggle
- Reduced motion toggle (also reads `prefers-reduced-motion` media query)
- High contrast toggle
- Persist settings via `storageService.saveSettings()`
- Load settings via `storageService.loadSettings()` on mount

**Props:** None

**Stores Used:** `audioState` (write: `pitchShift`)

**Accessibility:**
- All controls keyboard accessible
- `aria-label` on each control
- Focus trapped while open

**User Stories:** US-UI05, US-V03, US-A11Y04, US-A11Y05

---

### 2.12 ErrorMessage (`ui/ErrorMessage.svelte`)

**Purpose:** Non-blocking error notification for recoverable errors.

**Responsibilities:**
- Show when `$appState.errorMessage !== null`
- Auto-dismiss after 5 seconds or on user tap
- Position: top banner or bottom toast (below controls)
- Different icons for different error categories

**Props:** None

**Stores Used:** `appState` (read: `errorMessage`; write: clear after dismiss)

**Accessibility:**
- `role="alert"` for immediate announcement
- `aria-live="assertive"` for screen readers

**User Stories:** US-UI04

---

### 2.13 UpdateBanner (`ui/UpdateBanner.svelte`)

**Purpose:** Notification when a new app version is available.

**Responsibilities:**
- Show when service worker sends `UPDATE_AVAILABLE` message
- "Refresh to update" action
- Dismissable (will update on next launch)

**User Stories:** US-PWA03, US-PWA04

---

### 2.14 OfflineIndicator (`ui/OfflineIndicator.svelte`)

**Purpose:** Visual indicator of offline status.

**Responsibilities:**
- Show small banner when `$appState.isOnline === false`
- Subscribe to `window.online` / `window.offline` events via `appState`
- Reassure user: "You're offline. Tom still works!"

**User Stories:** US-PWA04, US-PWA02

---

### 2.15 VisualStateIndicators (`ui/VisualStateIndicators.svelte`)

**Purpose:** Visual feedback for VAD and animation states.

**Responsibilities:**
- Volume meter: animated bars reflecting `$audioState.volume` amplitude
- Listening pulse: red glow when `$audioState.isListening`
- Speaking indicator: green pulse when `$audioState.isSpeaking`

**User Stories:** US-UI06, US-V04

---

## 3. Service Layer

### 3.1 audioService (`services/audioService.ts`)

**Purpose:** Complete Web Audio API pipeline. Singleton module.

**Public API:**
```typescript
interface AudioService {
  requestPermission(): Promise<'granted' | 'denied'>;
  startListening(): Promise<void>;
  stopListening(): void;
  playbackWithPitch(buffer: AudioBuffer, pitchShift: number): Promise<void>;
  getVolumeLevel(): number;          // 0–1, for VAD/lip-sync
  destroy(): void;
}
```

**Internal Pipeline:** MediaStream → MediaStreamSource → AnalyserNode → MediaRecorder → AudioBuffer → AudioBufferSourceNode (playbackRate) → Destination

**Stores Written:** `audioState.isListening`, `audioState.isSpeaking`, `audioState.volume`

**User Stories:** US-V01, US-V02, US-V03, US-V04, US-V05, US-V06, US-SEC02

---

### 3.2 animationService (`services/animationService.ts`)

**Purpose:** Custom animation state machine. Singleton module.

**Public API:**
```typescript
interface AnimationService {
  init(actions: Record<AnimationName, AnimationAction>, mixer: AnimationMixer): void;
  play(name: AnimationName): void;     // Respects priority queue
  interrupt(name: AnimationName): void; // Immediate override
  reset(): void;                       // Emergency fallback to IDLE
  getCurrentState(): AnimationName;
  destroy(): void;
}
```

**State Machine:** 6 states, priority-based queue (max 2), 250ms blend transitions

**Stores Written:** `animationState.current`, `animationState.previous`, `animationState.queue`, `animationState.isTransitioning`

**User Stories:** US-3D05, US-3D06, US-3D08

---

### 3.3 gestureService (`services/gestureService.ts`)

**Purpose:** Classify pointer events into `GestureEvent` objects with 3D raycast touch zone detection.

**Public API:**
```typescript
interface GestureService {
  init(camera: Camera, scene: Scene): void;
  classify(event: PointerEvent): GestureEvent | null;
  getTouchZone(raycasterResult: Intersection[]): TouchZone | null;
  destroy(): void;
}
```

**Touch Zone Detection:**
1. Convert `PointerEvent` screen coordinates to normalized device coordinates (NDC)
2. Cast ray with Three.js `Raycaster`
3. Check intersected mesh name against touch zone registry
4. Return `GestureEvent` with classified zone

**Gesture Classification:**
- `tap` → `pointerdown` + `pointerup` within 200ms
- `hold` → `pointerdown` held > 500ms
- `swipe` / `pet` → `pointermove` distance > 50px within 300ms

**Stores Written:** Dispatches directly to `animationService.play()`

**User Stories:** US-T01, US-T02, US-T03, US-T04, US-T05, US-3D07

---

### 3.4 storageService (`services/storageService.ts`)

**Purpose:** Persist and load user settings. localStorage for settings, IndexedDB interface for future use.

**Public API:**
```typescript
interface StorageService {
  saveSettings(settings: Partial<Settings>): void;
  loadSettings(): Settings;
  clearSettings(): void;
}
```

**Storage Key:** `'talking-tom-settings'` in `localStorage`

**Default Settings:**
```typescript
const DEFAULT_SETTINGS: Settings = {
  pitchShift: 1.5,
  soundEffectsEnabled: true,
  reducedMotion: false,
  highContrast: false,
};
```

**User Stories:** US-UI05, US-A11Y04, US-A11Y05

---

## 4. Store Layer

### 4.1 appState (`stores/appState.ts`)

```typescript
type MicPermission = 'granted' | 'denied' | 'prompt';

interface AppState {
  isLoading: boolean;
  assetsLoaded: boolean;
  micPermission: MicPermission;
  isOnline: boolean;
  errorMessage: string | null;
}
```

**Initial Value:**
```typescript
{
  isLoading: true,
  assetsLoaded: false,
  micPermission: 'prompt',
  isOnline: navigator.onLine,
  errorMessage: null,
}
```

---

### 4.2 animationState (`stores/animationState.ts`)

```typescript
interface AnimationState {
  current: AnimationName;
  previous: AnimationName | null;
  queue: AnimationName[];
  isTransitioning: boolean;
}
```

**Initial Value:**
```typescript
{
  current: 'IDLE',
  previous: null,
  queue: [],
  isTransitioning: false,
}
```

---

### 4.3 audioState (`stores/audioState.ts`)

```typescript
interface AudioState {
  isListening: boolean;
  isSpeaking: boolean;
  volume: number;       // 0–1 amplitude, updated at 60fps
  pitchShift: number;   // 1.2–1.8, default 1.5
  currentAudio: AudioBuffer | null;
}
```

**Initial Value:**
```typescript
{
  isListening: false,
  isSpeaking: false,
  volume: 0,
  pitchShift: 1.5,
  currentAudio: null,
}
```

---

## 5. User Story → Component Mapping

| User Story | Component / Service | Priority |
|-----------|--------------------|---------:|
| US-V01 Listen and Repeat | `audioService`, `MicrophoneButton`, `TomCharacter` | High |
| US-V02 Voice Privacy Control | `audioService`, `PermissionPrompt`, `MicrophoneButton` | High |
| US-V03 Pitch Modulation | `audioService`, `SettingsPanel` | High |
| US-V04 Voice Activity Detection | `audioService`, `VisualStateIndicators` | High |
| US-V05 Browser Compatibility Fallback | `audioService`, `ErrorMessage` | Medium |
| US-V06 Audio Processing Pipeline | `audioService` | High |
| US-T01 Poke Reaction | `GestureLayer`, `gestureService`, `animationService` | High |
| US-T02 Pet Character | `GestureLayer`, `gestureService`, `animationService` | High |
| US-T03 Long Press | `GestureLayer`, `gestureService`, `animationService` | Medium |
| US-T04 Touch Zone Definition | `gestureService` | High |
| US-T05 Gesture Detection System | `gestureService` | High |
| US-3D01 3D Scene Rendering | `Stage3D`, `Camera` | High |
| US-3D02 Character Model Loading | `TomCharacter` | High |
| US-3D03 Optimized Character Model | Asset pipeline (build time) | High |
| US-3D04 Scene Lighting | `Lighting` | Medium |
| US-3D05 Idle Animation | `TomCharacter`, `animationService` | High |
| US-3D06 Animation State Machine | `animationService`, `TomCharacter` | High |
| US-3D07 Raycast Touch Detection | `gestureService`, `TomCharacter` | High |
| US-3D08 Lip Sync Animation | `audioService` (volume) → `TomCharacter` | Medium |
| US-PWA01 Install to Home Screen | `manifest.webmanifest`, service worker | High |
| US-PWA02 Offline Functionality | Service worker, `OfflineIndicator` | High |
| US-PWA03 Service Worker Implementation | `vite.config.ts`, Workbox config | High |
| US-PWA04 Offline Indicator | `OfflineIndicator`, `UpdateBanner` | Medium |
| US-PWA05 PWA Manifest Configuration | `manifest.webmanifest` | High |
| US-UI01 Loading Screen | `LoadingScreen` | High |
| US-UI02 Microphone Button | `MicrophoneButton` | High |
| US-UI03 Permission Prompt | `PermissionPrompt` | High |
| US-UI04 Error Messages | `ErrorMessage` | Medium |
| US-UI05 Settings Panel | `SettingsPanel`, `storageService` | Medium |
| US-UI06 Visual State Indicators | `VisualStateIndicators` | High |
| US-UI07 Responsive Layout | `+page.svelte`, CSS (`Controls`) | High |
| US-PERF01 WebGL Detection | `utils/webgl.ts` → `Stage3D` | High |
| US-PERF02 Frame Rate Monitoring | `utils/performance.ts` | Medium |
| US-PERF03 Target 60 FPS | `TomCharacter`, renderer config | High |
| US-PERF04 Asset Optimization | Build pipeline, Draco, Workbox | High |
| US-PERF05 Fast Initial Load | Service worker, code splitting | High |
| US-A11Y01 WCAG 2.1 AA Compliance | All components | High |
| US-A11Y02 Keyboard Navigation | `GestureLayer`, all interactive UI | High |
| US-A11Y03 Screen Reader Support | All components (ARIA) | High |
| US-A11Y04 Reduced Motion Support | `SettingsPanel`, CSS, `animationService` | High |
| US-A11Y05 High Contrast Mode | `SettingsPanel`, CSS custom properties | Medium |
| US-SEC01 Permission Management | `PermissionPrompt`, `MicrophoneButton` | High |
| US-SEC02 Local Audio Processing | `audioService` | High |
| US-SEC03 Content Security Policy | `vercel.json` / server config | High |

---

## 6. Data Flow Diagram

```
User Action
    │
    ▼
DOM Event (PointerEvent / KeyboardEvent)
    │
    ├──► GestureLayer.svelte
    │         │
    │         ▼
    │    gestureService.classify(event)
    │         │
    │         ▼
    │    animationService.play(state)
    │         │
    │         ├──► animationState store (current, queue)
    │         │
    │         └──► Three.js AnimationMixer.crossFadeTo()
    │                   │
    │                   ▼
    │              TomCharacter renders animation
    │
    └──► MicrophoneButton.svelte
              │
              ▼
         audioService.startListening()
              │
              ├──► audioState store (isListening = true)
              │         │
              │         └──► MicrophoneButton visual state updates
              │
              ├──► animationService.play('LISTENING')
              │
              └──► On recording complete:
                        │
                        ├──► audioService.playbackWithPitch(buffer, pitchShift)
                        │         │
                        │         ├──► audioState (isSpeaking = true)
                        │         │
                        │         └──► animationService.play('SPEAKING')
                        │
                        └──► On playback complete:
                                  animationService.play('IDLE')
                                  audioState (isSpeaking = false)
```

---

**Document Status:** ✅ Complete  
**Next Document:** schema.md  
**Last Updated:** May 1, 2026
