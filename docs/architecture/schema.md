# Data Schema Definition
## Talking Tom PWA

**Document Status:** Final  
**Author:** Architect  
**Created:** May 1, 2026  
**Phase:** Design  
**References:** ADR-007 (State Management), ADR-004 (Animation State Machine), docs/requirements/requirements-breakdown.md

---

## 1. Core TypeScript Interfaces

All interfaces are defined in `src/lib/types/index.ts` and exported as named exports.

### 1.1 AppState

Global application lifecycle and permission state.

```typescript
/**
 * Global application state — managed in src/lib/stores/appState.ts
 */
export type MicPermission = 'granted' | 'denied' | 'prompt';

export interface AppState {
  /** Whether initial asset loading is in progress */
  isLoading: boolean;

  /** Whether the GLTF model and audio assets have finished loading */
  assetsLoaded: boolean;

  /** Current browser microphone permission state */
  micPermission: MicPermission;

  /** Whether the device has network connectivity (from navigator.onLine) */
  isOnline: boolean;

  /** Human-readable error message to display in ErrorMessage.svelte, or null */
  errorMessage: string | null;
}

export const APP_STATE_INITIAL: AppState = {
  isLoading: true,
  assetsLoaded: false,
  micPermission: 'prompt',
  isOnline: true, // initialized in store from navigator.onLine
  errorMessage: null,
};
```

**Transitions:**

| Field | Set By | Trigger |
|-------|--------|---------|
| `isLoading` | `TomCharacter` | GLTF load start/complete |
| `assetsLoaded` | `TomCharacter` | GLTF + animations ready |
| `micPermission` | `audioService` | `getUserMedia` result |
| `isOnline` | `+page.svelte` | `online`/`offline` window events |
| `errorMessage` | Any service | On error, cleared on dismiss |

---

### 1.2 AnimationState

Current animation state machine state. Managed by `animationService` and reflected into `animationState` store.

```typescript
/**
 * All valid animation clip names — must match names in tom.glb
 */
export type AnimationName =
  | 'IDLE'           // Default resting state; loops
  | 'LISTENING'      // Ears wiggle, alert posture; loops
  | 'SPEAKING'       // Mouth moves, body bobs; loops until audio ends
  | 'REACTING_POKE'  // Ow reaction; plays once then returns to queue
  | 'REACTING_PET'   // Happy reaction; plays once then returns to queue
  | 'REACTING_HOLD'; // Uncomfortable reaction; plays once then returns to queue

/**
 * Priority weights — higher value overrides lower
 */
export const ANIMATION_PRIORITY: Record<AnimationName, number> = {
  IDLE: 1,
  REACTING_POKE: 2,
  REACTING_PET: 2,
  REACTING_HOLD: 2,
  LISTENING: 3,
  SPEAKING: 4,
} as const;

/**
 * Animation state — managed in src/lib/stores/animationState.ts
 */
export interface AnimationState {
  /** Currently playing animation */
  current: AnimationName;

  /** Previously played animation (used for blend-out reference) */
  previous: AnimationName | null;

  /**
   * Pending animation queue — FIFO, max 2 entries
   * Entries are dequeued when current animation finishes (for non-looping clips)
   * or when explicitly requested
   */
  queue: AnimationName[];

  /** Whether a crossfade transition is currently in progress */
  isTransitioning: boolean;
}

export const ANIMATION_STATE_INITIAL: AnimationState = {
  current: 'IDLE',
  previous: null,
  queue: [],
  isTransitioning: false,
};
```

**State Transition Rules:**

```
Request incoming animation R, current animation C:

1. If PRIORITY[R] > PRIORITY[C]:
   → Immediate crossfade to R (interrupt C)

2. If PRIORITY[R] <= PRIORITY[C] AND queue.length < 2:
   → Enqueue R (play after C finishes)

3. If PRIORITY[R] <= PRIORITY[C] AND queue.length >= 2:
   → Drop R (queue full, discard)

4. On animation 'finished' event (non-looping clips only):
   → Dequeue head of queue → crossfade to it
   → If queue empty → crossfade to IDLE

5. Emergency fallback:
   → If any error → reset to IDLE, clear queue
```

---

### 1.3 AudioState

Voice capture and playback state. Managed by `audioService` and reflected into `audioState` store.

```typescript
/**
 * Audio pipeline state — managed in src/lib/stores/audioState.ts
 */
export interface AudioState {
  /** Whether MediaRecorder is currently capturing voice input */
  isListening: boolean;

  /** Whether AudioBufferSourceNode is currently playing back pitch-shifted audio */
  isSpeaking: boolean;

  /**
   * Current audio amplitude (0–1) sampled from AnalyserNode at ~60fps
   * Used for:
   *   - Visual state indicators (waveform bars)
   *   - Voice activity detection (VAD)
   *   - Lip-sync intensity (US-3D08)
   */
  volume: number;

  /**
   * Pitch shift multiplier applied to AudioBufferSourceNode.playbackRate
   * Range: 1.2–1.8 (default 1.5 = Tom's characteristic voice)
   * Persisted in Settings.pitchShift via localStorage
   */
  pitchShift: number;

  /**
   * Current decoded audio buffer ready for playback, or null if idle
   * Cleared immediately after playback completes (privacy: ephemeral only)
   */
  currentAudio: AudioBuffer | null;
}

export const AUDIO_STATE_INITIAL: AudioState = {
  isListening: false,
  isSpeaking: false,
  volume: 0,
  pitchShift: 1.5,
  currentAudio: null,
};
```

**Field Lifecycle:**

| Field | Set `true`/high | Set `false`/zero |
|-------|----------------|-----------------|
| `isListening` | `audioService.startListening()` | `audioService.stopListening()` |
| `isSpeaking` | `audioService.playbackWithPitch()` start | Playback `ended` event |
| `volume` | AnalyserNode tick (60fps) | Listening stopped / playback ended |
| `currentAudio` | `decodeAudioData()` complete | After `AudioBufferSourceNode.start()` returns |

---

### 1.4 GestureEvent

Classified touch/pointer interaction from `gestureService`.

```typescript
/**
 * Named zones on the Tom character, determined by Three.js raycast against mesh names
 * Mesh naming convention in tom.glb must match these values exactly
 */
export type TouchZone = 'head' | 'body' | 'limbs' | 'none';

/**
 * Classified gesture type from pointer event analysis
 */
export type GestureType = 'tap' | 'hold' | 'pet';

/**
 * Gesture event produced by gestureService after classifying a pointer interaction
 */
export interface GestureEvent {
  /** Type of gesture detected */
  type: GestureType;

  /**
   * 3D world-space position of the raycast intersection point
   * Used for future particle effects or impact indicators
   */
  position: { x: number; y: number; z: number };

  /** Which zone of Tom's body was touched */
  touchZone: TouchZone;

  /**
   * Duration of the gesture in milliseconds
   * Meaningful for 'hold' type (> 500ms threshold)
   */
  duration: number;

  /** Original DOM event for event propagation control */
  originalEvent: PointerEvent;
}

/**
 * Mapping from GestureEvent to animation state
 * Owned by gestureService
 */
export const GESTURE_ANIMATION_MAP: Record<GestureType, AnimationName> = {
  tap: 'REACTING_POKE',
  pet: 'REACTING_PET',
  hold: 'REACTING_HOLD',
} as const;
```

**Touch Zone to Gesture Resolution:**

| Touch Zone | Gesture Type | Animation |
|-----------|-------------|-----------|
| `head` | `tap` | `REACTING_POKE` |
| `body` | `tap` | `REACTING_POKE` |
| `limbs` | `tap` | `REACTING_POKE` |
| `head` | `pet` | `REACTING_PET` |
| `body` | `pet` | `REACTING_PET` |
| Any | `hold` | `REACTING_HOLD` |
| `none` | Any | (ignored) |

---

### 1.5 Settings

User preferences persisted to `localStorage` via `storageService`.

```typescript
/**
 * User settings — persisted in localStorage under key 'talking-tom-settings'
 * Partial<Settings> written on each change; merged with defaults on load
 */
export interface Settings {
  /**
   * Pitch shift for Tom's voice
   * Range: 1.2–1.8 (default 1.5)
   * Corresponds to AudioState.pitchShift
   */
  pitchShift: number;

  /** Whether to play cartoon sound effects on touch interactions */
  soundEffectsEnabled: boolean;

  /**
   * Whether to disable all CSS/Three.js animations beyond idle breathing
   * Also set automatically when prefers-reduced-motion media query matches
   */
  reducedMotion: boolean;

  /**
   * Whether to apply high-contrast color scheme
   * Activates [data-high-contrast] CSS attribute on <html>
   */
  highContrast: boolean;
}

export const SETTINGS_DEFAULT: Settings = {
  pitchShift: 1.5,
  soundEffectsEnabled: true,
  reducedMotion: false,
  highContrast: false,
};

/** localStorage key for settings persistence */
export const SETTINGS_STORAGE_KEY = 'talking-tom-settings' as const;
```

---

## 2. Service Interface Types

### 2.1 AudioService Interface

```typescript
/**
 * Public API contract for audioService singleton
 * Implementation: src/lib/services/audioService.ts
 */
export interface IAudioService {
  /**
   * Request microphone permission via getUserMedia
   * Updates appState.micPermission on resolution
   * @returns resolved permission state
   */
  requestPermission(): Promise<MicPermission>;

  /**
   * Begin voice capture session
   * Sets audioState.isListening = true
   * Triggers LISTENING animation via animationService
   * @throws if micPermission !== 'granted'
   */
  startListening(): Promise<void>;

  /**
   * Stop active recording session and trigger playback
   * Stops MediaRecorder, decodes audio, calls playbackWithPitch()
   */
  stopListening(): void;

  /**
   * Play back decoded audio with pitch shift applied
   * Sets audioState.isSpeaking = true
   * Triggers SPEAKING animation via animationService
   * Clears audioState.currentAudio after playback (privacy)
   */
  playbackWithPitch(buffer: AudioBuffer, pitchShift: number): Promise<void>;

  /**
   * Get current amplitude level (0–1) for VAD/lip-sync
   * Called at animation frame rate (~60fps)
   */
  getVolumeLevel(): number;

  /** Release all audio resources */
  destroy(): void;
}
```

---

### 2.2 AnimationService Interface

```typescript
/**
 * Public API contract for animationService singleton
 * Implementation: src/lib/services/animationService.ts
 */
export interface IAnimationService {
  /**
   * Initialize with Three.js animation actions and mixer from Threlte useAnimations()
   * Must be called before any play() calls
   */
  init(
    actions: Record<AnimationName, THREE.AnimationAction>,
    mixer: THREE.AnimationMixer
  ): void;

  /**
   * Request animation playback, respecting priority queue
   * May be queued or dropped if current state has higher priority
   */
  play(name: AnimationName): void;

  /**
   * Force immediate crossfade regardless of priority
   * Use only for emergency states
   */
  interrupt(name: AnimationName): void;

  /**
   * Emergency fallback — immediately reset to IDLE and clear queue
   */
  reset(): void;

  getCurrentState(): AnimationName;

  /** Release mixer event listeners */
  destroy(): void;
}
```

---

### 2.3 GestureService Interface

```typescript
/**
 * Public API contract for gestureService singleton
 * Implementation: src/lib/services/gestureService.ts
 */
export interface IGestureService {
  /**
   * Initialize with Three.js camera and scene for raycasting
   * Must be called after Stage3D mounts
   */
  init(camera: THREE.Camera, scene: THREE.Scene): void;

  /**
   * Classify a DOM pointer event into a GestureEvent
   * @returns GestureEvent if valid touch on Tom, null if miss or invalid
   */
  classify(event: PointerEvent): GestureEvent | null;

  /**
   * Determine which touch zone was hit from raycast intersection results
   */
  getTouchZone(intersections: THREE.Intersection[]): TouchZone;

  /** Remove event listeners */
  destroy(): void;
}
```

---

### 2.4 StorageService Interface

```typescript
/**
 * Public API contract for storageService singleton
 * Implementation: src/lib/services/storageService.ts
 */
export interface IStorageService {
  /**
   * Save partial settings to localStorage
   * Merges with existing saved settings
   */
  saveSettings(settings: Partial<Settings>): void;

  /**
   * Load settings from localStorage
   * Returns SETTINGS_DEFAULT if no saved settings found
   */
  loadSettings(): Settings;

  /** Remove all saved settings from localStorage */
  clearSettings(): void;
}
```

---

## 3. Constants

### 3.1 Animation Constants (`src/lib/constants/animation.ts`)

```typescript
export const BLEND_DURATION_MS = 250 as const;        // 200-300ms range
export const BLEND_DURATION_SEC = BLEND_DURATION_MS / 1000;
export const MAX_QUEUE_SIZE = 2 as const;
export const ANIMATION_NAMES: AnimationName[] = [
  'IDLE', 'LISTENING', 'SPEAKING',
  'REACTING_POKE', 'REACTING_PET', 'REACTING_HOLD'
];
```

### 3.2 Audio Constants (`src/lib/constants/audio.ts`)

```typescript
export const VAD_THRESHOLD = 20 as const;             // Amplitude 0-128 scale
export const PITCH_SHIFT_MIN = 1.2 as const;
export const PITCH_SHIFT_MAX = 1.8 as const;
export const PITCH_SHIFT_DEFAULT = 1.5 as const;
export const PITCH_SHIFT_STEP = 0.1 as const;
export const SAMPLE_RATE = 44100 as const;
export const AUDIO_BITS_PER_SECOND = 128000 as const;
export const HOLD_GESTURE_MS = 500 as const;
export const TAP_GESTURE_MS = 200 as const;
export const PET_GESTURE_DISTANCE_PX = 50 as const;
```

### 3.3 App Constants (`src/lib/constants/app.ts`)

```typescript
export const CACHE_VERSION = '1.0.0' as const;
export const FPS_TARGET_DESKTOP = 60 as const;
export const FPS_TARGET_MOBILE = 55 as const;
export const FPS_WARNING_THRESHOLD = 45 as const;
export const TOUCH_TARGET_PRIMARY_PX = 60 as const;  // 60x60px
export const TOUCH_TARGET_MIN_PX = 44 as const;       // 44x44px WCAG minimum
export const ERROR_DISMISS_MS = 5000 as const;
export const SERVICE_WORKER_UPDATE_CHECK_INTERVAL_MS = 60 * 1000 as const;
```

---

## 4. localStorage Schema

```
Key: 'talking-tom-settings'
Type: JSON string
Schema: Partial<Settings>

Example value:
{
  "pitchShift": 1.7,
  "soundEffectsEnabled": true,
  "reducedMotion": false,
  "highContrast": false
}
```

**Read strategy:** `JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}')` merged with `SETTINGS_DEFAULT`.

**Write strategy:** Full object serialized on every settings change (no partial writes to avoid stale merges).

---

## 5. IndexedDB Schema (Reserved)

IndexedDB is **not used in v1.0** — localStorage is sufficient for settings storage.

Reserved for future use (Phase 2 features):

```
Database: 'talking-tom-pwa'
Version: 1
Object Stores:
  - 'settings' (keyPath: 'key')     ← Reserved, currently using localStorage
  - 'recordings' (autoIncrement)    ← Phase 2: replay history
```

---

## 6. manifest.webmanifest Schema

```json
{
  "name": "Talking Tom",
  "short_name": "Tom",
  "description": "Interactive talking cat — speak and Tom repeats you!",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#4a90d9",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["entertainment", "games"],
  "lang": "en"
}
```

---

**Document Status:** ✅ Complete  
**Next Document:** api-contracts.md  
**Last Updated:** May 1, 2026
