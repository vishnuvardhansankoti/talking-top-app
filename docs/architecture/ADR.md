# Architecture Decision Record (ADR)
## Talking Tom PWA

**Document Status:** Final  
**Author:** Architect  
**Created:** May 1, 2026  
**Phase:** Design  
**Reviewed By:** Orchestrator (pending)

---

## Table of Contents

1. [ADR-001: Meta-Framework — SvelteKit v2 in SSG Mode](#adr-001)
2. [ADR-002: 3D Rendering Library — Threlte v7 + Three.js v0.160+](#adr-002)
3. [ADR-003: Audio Processing — Web Audio API (Native)](#adr-003)
4. [ADR-004: Animation State Machine — Custom Implementation](#adr-004)
5. [ADR-005: Service Worker Caching Strategy](#adr-005)
6. [ADR-006: Component Architecture Pattern](#adr-006)
7. [ADR-007: State Management — Svelte Stores](#adr-007)
8. [ADR-008: Testing Strategy](#adr-008)
9. [ADR-009: Deployment Target — Static Hosting](#adr-009)

---

## ADR-001: Meta-Framework — SvelteKit v2 in SSG Mode {#adr-001}

**Status:** Accepted  
**Date:** May 1, 2026  
**Deciders:** Architect, PRD (Section 9 — Technical Architecture)

### Context

We need a frontend meta-framework that supports:
- Static Progressive Web App output (no server required)
- TypeScript-first development
- Component-based architecture with reactive state
- Build tooling optimized for performance (code-splitting, tree-shaking)
- PWA integration via Vite plugin ecosystem

### Decision

Use **SvelteKit v2.x** with **`@sveltejs/adapter-static`** to output a fully static PWA.

### Rationale

| Criterion | SvelteKit v2 SSG | Next.js (Static) | Vite + Svelte |
|-----------|-----------------|-----------------|---------------|
| Bundle size overhead | Minimal | Medium | Minimal |
| TypeScript support | Native | Native | Native |
| Reactivity model | Compiler-based (fast) | Virtual DOM | Compiler-based |
| PWA integration | vite-plugin-pwa | next-pwa | vite-plugin-pwa |
| SSG mode | ✅ adapter-static | ✅ `next export` | ✅ Native |
| File-based routing | ✅ | ✅ | ❌ Manual |
| Community/ecosystem | Growing | Large | Growing |

SvelteKit's compiler-based reactivity produces smaller bundles than React (no virtual DOM diffing). `adapter-static` outputs pure HTML/CSS/JS with no Node.js server dependency, which is required for service worker correctness and offline-first PWA architecture.

### Constraints

- **No SSR or server routes** — `adapter-static` only. All data must be client-side.
- **No dynamic catch-all routes** that require server-side rendering.
- **Prerendering** enabled for all routes via `prerender = true` in `+layout.ts`.

### Consequences

- ✅ Zero backend infrastructure cost
- ✅ Can deploy to any static CDN (Vercel, Netlify, Azure Static Web Apps, GitHub Pages)
- ✅ Offline functionality is straightforward with service worker
- ⚠️ No server-side rendering for SEO (acceptable — app is a PWA, not a content site)
- ⚠️ All API calls (if any future features require them) must be client-side

### Files Affected

- `svelte.config.js` — adapter-static configuration
- `src/routes/+layout.ts` — `export const prerender = true`
- `vite.config.ts` — Vite PWA plugin

---

## ADR-002: 3D Rendering Library — Threlte v7 + Three.js v0.160+ {#adr-002}

**Status:** Accepted  
**Date:** May 1, 2026  
**Deciders:** Architect, PRD (Section 9 — Technical Architecture)

### Context

We need to render an animated 3D character in a browser with:
- 60 FPS target on flagship mobile devices
- GLTF/GLB model loading with Draco compression
- Skeletal animation with multiple states and blending
- Raycast-based touch zone detection
- WebGL2 with WebGL1 fallback

### Decision

Use **Threlte v7.x** (declarative Three.js wrapper for Svelte) over **Three.js v0.160+** as the core WebGL engine.

### Rationale

**Why Three.js over alternatives:**

| Engine | Bundle Size | WebGL2 | GLTF | Animation | Mobile FPS |
|--------|------------|--------|------|-----------|-----------|
| Three.js | ~600KB raw | ✅ | ✅ Native | ✅ AnimationMixer | ✅ Proven |
| Babylon.js | ~900KB raw | ✅ | ✅ | ✅ | ✅ Proven |
| PlayCanvas | ~1.2MB | ✅ | ✅ | ✅ | ✅ |
| PixiJS | ~500KB | ✅ 2D only | ❌ | ❌ 3D | ✅ |

Three.js is the industry standard for web 3D with the largest community, most complete GLTF implementation, and proven mobile performance track record.

**Why Threlte over raw Three.js:**

Threlte provides Svelte-native declarative component syntax, reactive prop bindings, and auto-disposal lifecycle management. This eliminates verbose imperative setup code and prevents common Three.js memory leaks (geometries, materials, textures not disposed).

```svelte
<!-- Threlte declarative (preferred) -->
<Canvas>
  <T.PerspectiveCamera position={[0, 1.5, 4]} />
  <T.AmbientLight intensity={0.6} />
  <TomCharacter />
</Canvas>

<!-- vs Raw Three.js (imperative) -->
<script>
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  // ... 50+ lines of setup
</script>
```

### Animation System

Threlte provides `useAnimations` composable which wraps Three.js `AnimationMixer` with reactive state. This directly supports our 6-state animation machine requirement.

### Constraints

- Threlte v7 requires **Svelte 4+** — compatible with SvelteKit v2.
- WebGL context must be acquired in `onMount` (client-side only) — Threlte handles this.
- Maximum **1 WebGL canvas** per page to avoid context limit exhaustion on mobile.

### Consequences

- ✅ Declarative 3D scenes reduce boilerplate by ~60%
- ✅ Reactive Three.js properties (auto-update on Svelte store changes)
- ✅ Auto-disposal prevents memory leaks
- ✅ Tree-shakable — only import Three.js modules used
- ⚠️ Threlte v7 API is newer — community examples mostly use raw Three.js
- ⚠️ Some advanced Three.js features require dropping to raw `T.*` components

### Files Affected

- `src/lib/components/3d/Stage3D.svelte` — Threlte `<Canvas>` root
- `src/lib/components/3d/TomCharacter.svelte` — GLTF model + animations
- `src/lib/components/3d/Lighting.svelte` — scene lighting
- `src/lib/components/3d/Camera.svelte` — perspective camera

---

## ADR-003: Audio Processing — Web Audio API (Native) {#adr-003}

**Status:** Accepted  
**Date:** May 1, 2026  
**Deciders:** Architect, PRD (Section 9 — Technical Architecture)

### Context

We need to:
1. Capture microphone input
2. Detect voice activity (VAD) to trigger recording
3. Apply pitch shifting (1.2x–1.8x) to recorded audio
4. Play back the pitch-shifted audio
5. All processing must be 100% local — no data transmission ever

### Decision

Use the **Web Audio API** (native browser API) directly, without third-party audio libraries.

### Rationale

**Why native over libraries:**

| Approach | Bundle Cost | Offline | Privacy | Flexibility |
|----------|------------|---------|---------|------------|
| Web Audio API (native) | 0 KB | ✅ Always | ✅ Local only | ✅ Full control |
| Tone.js | ~300KB | ✅ | ✅ | ✅ Higher-level |
| Howler.js | ~30KB | ✅ | ✅ | ⚠️ Playback only |
| Pizzicato.js | ~50KB | ✅ | ✅ | ⚠️ Limited |

The Web Audio API provides all required capabilities natively:
- `AnalyserNode` — amplitude extraction for VAD and lip-sync
- `AudioBufferSourceNode.playbackRate` — pitch shift without quality loss
- `GainNode` — volume control
- `MediaStreamSource` — microphone input

Adding a library layer would increase bundle size and add a maintenance dependency without providing capabilities beyond what the browser natively offers.

### Audio Pipeline Design

```
Microphone Input
       │
       ▼
MediaStream (getUserMedia)
       │
       ▼
MediaStreamAudioSourceNode
       │
       ├──► AnalyserNode (VAD — amplitude threshold detection)
       │           │
       │           └──► volumeStore (drives visual indicators + lip sync)
       │
       ▼
MediaRecorder API (capture audio chunks → WebM/Opus)
       │
       ▼
Collected AudioChunks (Blob)
       │
       ▼
AudioContext.decodeAudioData (WebM → AudioBuffer)
       │
       ▼
AudioBufferSourceNode (playbackRate = pitchShift setting)
       │
       ▼
GainNode (volume control)
       │
       ▼
AudioContext.destination (speakers)
```

### VAD Implementation

Voice Activity Detection uses amplitude threshold on `AnalyserNode`:
```typescript
const dataArray = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteTimeDomainData(dataArray);
const amplitude = Math.max(...dataArray.map(v => Math.abs(v - 128)));
const isVoiceActive = amplitude > VAD_THRESHOLD; // ~20 out of 128
```

### Browser Compatibility

| Browser | Web Audio API | MediaRecorder | Web Speech API |
|---------|--------------|--------------|---------------|
| Chrome 90+ | ✅ | ✅ audio/webm | ✅ |
| Safari 14+ | ✅ | ✅ audio/mp4 | ⚠️ Requires user gesture per session |
| Firefox 88+ | ✅ | ✅ audio/ogg | ❌ Not supported |
| Edge 90+ | ✅ | ✅ audio/webm | ✅ |
| Samsung Internet 14+ | ✅ | ✅ | ✅ |

**MediaRecorder MIME type detection:**
```typescript
const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
  ? 'audio/webm;codecs=opus'
  : 'audio/mp4';
```

### Web Speech API Usage

Web Speech API (`SpeechRecognition`) is used as an **optional enhancement** for voice-to-text capability (display what Tom "heard"). It is NOT required for the core voice mimicry feature. Firefox and some Safari versions gracefully degrade to mimicry-only mode.

### Privacy Guarantees

- `MediaStream` tracks stopped immediately after recording: `track.stop()`
- `AudioBuffer` objects cleared after playback by setting `currentAudio = null`
- No audio data written to `IndexedDB`, `localStorage`, or any network endpoint
- Microphone permission status stored in session memory only (not persisted)

### Consequences

- ✅ Zero bundle cost for audio processing
- ✅ Complete offline capability (no CDN dependencies)
- ✅ Maximum privacy (all processing client-side)
- ✅ Full control over pitch algorithm and VAD sensitivity
- ⚠️ Safari requires user gesture before `AudioContext.resume()` — must handle in UI
- ⚠️ Firefox does not support Web Speech API — degrade gracefully
- ⚠️ iOS has 3-second audio context auto-suspend behavior — must check state before playback

### Files Affected

- `src/lib/services/audioService.ts` — complete audio pipeline
- `src/lib/stores/audioState.ts` — reactive audio state
- `src/lib/components/ui/MicrophoneButton.svelte` — trigger audio context resume
- `src/lib/constants/audio.ts` — VAD_THRESHOLD, PITCH_SHIFT_DEFAULT, SAMPLE_RATE

---

## ADR-004: Animation State Machine — Custom Implementation {#adr-004}

**Status:** Accepted  
**Date:** May 1, 2026  
**Deciders:** Architect  
**Related User Story:** US-3D06 (Critical bottleneck — blocks 15+ stories)

### Context

We need an animation state machine that manages 6 animation states with:
- Priority-based state override (SPEAKING always interrupts)
- FIFO queue (max 2 pending states)
- Smooth blend transitions (200–300ms crossfade)
- Emergency fallback to IDLE on error
- Integration with Three.js `AnimationMixer`

### Decision

Implement a **custom lightweight state machine** in TypeScript, backed by Threlte's `useAnimations` hook. Do NOT use XState or other state machine libraries.

### Rationale

**XState vs Custom:**

| Criterion | XState v5 | Custom Implementation |
|-----------|------------|----------------------|
| Bundle size | ~50KB | ~2KB |
| Learning curve | High (actors, guards, effects) | Low |
| Three.js integration | Requires adapter code | Direct |
| 6-state machine complexity | Overkill | Appropriate |
| Debuggability | DevTools available | `console.log` + Svelte DevTools |

Our state machine has only 6 states and 15 transitions. XState's expressiveness is unnecessary at this complexity level. A custom implementation with a priority queue and crossfade logic is simpler, smaller, and fully under our control.

### State Machine Specification

#### States

```typescript
type AnimationName =
  | 'IDLE'
  | 'LISTENING'
  | 'SPEAKING'
  | 'REACTING_POKE'
  | 'REACTING_PET'
  | 'REACTING_HOLD';
```

#### Priority Hierarchy

```
SPEAKING (4 — highest)
  └─► overrides LISTENING, all REACTING_*, IDLE

LISTENING (3)
  └─► overrides all REACTING_*, IDLE

REACTING_POKE (2)
REACTING_PET  (2)
REACTING_HOLD (2)
  └─► overrides IDLE

IDLE (1 — lowest, always safe fallback)
```

#### Transition Table

| Current State | Incoming Request | Action |
|--------------|-----------------|--------|
| IDLE | Any | Immediate transition |
| LISTENING | SPEAKING | Immediate crossfade |
| LISTENING | REACTING_* | Queue (max 2) |
| SPEAKING | LISTENING | Ignore (lower priority) |
| SPEAKING | REACTING_* | Queue (max 2) |
| REACTING_* | SPEAKING | Interrupt immediately |
| REACTING_* | LISTENING | Queue |
| Any | IDLE | Queue (always accepted) |

#### Queue Management

- Queue holds max **2 pending states** (FIFO)
- On animation `finished` event → dequeue and play next
- If queue full → drop oldest entry (tail drop)

#### Blend Transition

```typescript
const BLEND_DURATION_MS = 250; // 200-300ms range, tunable

function crossfadeTo(name: AnimationName): void {
  const outgoing = actions[current];
  const incoming = actions[name];
  incoming.reset().fadeIn(BLEND_DURATION_MS / 1000);
  outgoing?.fadeOut(BLEND_DURATION_MS / 1000);
  incoming.play();
  current = name;
}
```

#### Emergency Fallback

If Three.js `AnimationMixer` throws or `actions[name]` is undefined:
```typescript
try {
  crossfadeTo(name);
} catch (e) {
  console.error('[AnimationService] State transition failed, falling back to IDLE', e);
  actions['IDLE']?.reset().play();
  current = 'IDLE';
  queue = [];
}
```

### Integration with Threlte

Threlte's `useAnimations` composable returns `{ actions, mixer }`. The animation service wraps this:

```typescript
// In TomCharacter.svelte onMount
const { actions, mixer } = useAnimations(gltf.animations, ref);
animationService.init(actions, mixer);
```

### Consequences

- ✅ 2KB implementation vs 50KB for XState
- ✅ Direct Three.js AnimationMixer integration
- ✅ Explicit state machine logic (easy to audit and test)
- ✅ Priority queue prevents animation chaos
- ⚠️ No visual state machine editor (acceptable for 6-state machine)
- ⚠️ Edge cases in concurrent transitions must be carefully unit-tested

### Files Affected

- `src/lib/services/animationService.ts` — state machine implementation
- `src/lib/stores/animationState.ts` — reactive Svelte store
- `src/lib/components/3d/TomCharacter.svelte` — calls `animationService.init()`
- `src/lib/constants/animation.ts` — BLEND_DURATION_MS, PRIORITY, animation names

---

## ADR-005: Service Worker Caching Strategy {#adr-005}

**Status:** Accepted  
**Date:** May 1, 2026  
**Deciders:** Architect, PRD (Section 7 — Offline Strategy)

### Context

We need offline-first PWA behavior with:
- Fast subsequent loads (cached app shell)
- Offline access to 3D model and audio assets (up to 10MB)
- Cache invalidation on app updates
- Storage quota awareness (50MB–500MB varies by device)
- iOS Safari compatibility (limited service worker support)

### Decision

Use **Vite PWA Plugin v0.19+ with Workbox** for service worker generation, implementing a **3-tier caching strategy**.

### Caching Tiers

#### Tier 1: App Shell (Cache First)

Precached at install time. Served from cache without network. Updated only on new service worker activation.

```
Cached assets:
- /index.html
- /app.js (main bundle)
- /app.css
- /manifest.webmanifest
- /icons/icon-192x192.png
- /icons/icon-512x512.png
```

```typescript
// workbox strategy
new workbox.strategies.CacheFirst({
  cacheName: 'app-shell-v{{version}}',
})
```

#### Tier 2: Static Assets (Cache First with Network Fallback)

Large assets that rarely change. Cached on first request. Network fallback if cache miss.

```
Cached assets:
- /assets/tom.glb (3D model, up to 5MB Draco compressed)
- /assets/sounds/*.mp3 (sound effects, 500KB total)
- /assets/images/*.webp (UI images)
```

```typescript
new workbox.strategies.CacheFirst({
  cacheName: 'static-assets-v{{version}}',
  plugins: [
    new workbox.expiration.ExpirationPlugin({
      maxEntries: 20,
      maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
    }),
    new workbox.cacheableResponse.CacheableResponsePlugin({
      statuses: [0, 200],
    }),
  ],
})
```

#### Tier 3: Runtime Data (Network First with Cache Fallback)

For any future API calls or dynamic content.

```typescript
new workbox.strategies.NetworkFirst({
  cacheName: 'runtime-v{{version}}',
  networkTimeoutSeconds: 3,
})
```

### Cache Invalidation

- Service worker versioned via `workbox.revision` hash in precache manifest
- New app deploy → new service worker → `activate` event → delete old caches
- User notified of available update via `postMessage` to page

```typescript
// sw.ts
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => !key.includes(CACHE_VERSION))
          .map(key => caches.delete(key))
      )
    )
  );
});
```

### Large Asset Handling

The 3D model (up to 5MB) needs range request support for progressive loading:
```typescript
// vite-plugin-pwa config
{
  globPatterns: ['**/*.{js,css,html,ico,png,webp,svg}'],
  // .glb files handled via runtime caching to avoid precache quota issues
}
```

`.glb` files are runtime-cached (not precached) to prevent install-time failures on slow connections.

### Update Notification Flow

1. Service worker detects new version
2. `postMessage({ type: 'UPDATE_AVAILABLE' })` sent to page
3. `UpdateBanner.svelte` displays "New version available — tap to refresh"
4. User taps → `skipWaiting()` → page reloads with new assets

### Consequences

- ✅ Full offline functionality after first load
- ✅ Fast subsequent loads (app shell always from cache)
- ✅ Automatic cache invalidation on deploy
- ✅ Storage quota managed via ExpirationPlugin
- ⚠️ First load requires network connection (unavoidable)
- ⚠️ iOS 16.4+ required for full PWA install support
- ⚠️ Service worker bugs can break the app — extensive offline testing required

### Files Affected

- `vite.config.ts` — VitePWA plugin configuration
- `src/service-worker.ts` (or Workbox-generated) — service worker logic
- `static/manifest.webmanifest` — PWA manifest
- `src/lib/components/ui/UpdateBanner.svelte` — update notification

---

## ADR-006: Component Architecture Pattern {#adr-006}

**Status:** Accepted  
**Date:** May 1, 2026  
**Deciders:** Architect

### Context

We need a scalable component architecture that:
- Separates 3D rendering from UI concerns
- Keeps audio processing logic outside components
- Allows components to react to shared state
- Maps clearly to user stories for developer guidance

### Decision

**Layered architecture** with strict separation of concerns across 5 layers:

```
┌─────────────────────────────────────┐
│           UI Layer                  │  Svelte components (src/lib/components/)
│   (3d/ + ui/ + interaction/)       │
├─────────────────────────────────────┤
│          Store Layer                │  Svelte stores (src/lib/stores/)
│   (appState + animationState +      │  Reactive bridges between UI ↔ Services
│    audioState)                      │
├─────────────────────────────────────┤
│         Service Layer               │  TypeScript classes (src/lib/services/)
│   (audio + animation + gesture +   │  Business logic, no Svelte dependency
│    storage)                         │
├─────────────────────────────────────┤
│        Constants / Types            │  src/lib/constants/ + src/lib/types/
├─────────────────────────────────────┤
│         Build / Config              │  vite.config.ts, svelte.config.js
└─────────────────────────────────────┘
```

### Folder Structure

```
src/
├── routes/
│   └── +page.svelte          # Single route — full app
│
└── lib/
    ├── components/
    │   ├── 3d/
    │   │   ├── Stage3D.svelte        # Threlte <Canvas> root
    │   │   ├── TomCharacter.svelte   # GLTF model + animations
    │   │   ├── Lighting.svelte       # Scene lighting
    │   │   └── Camera.svelte         # Perspective camera
    │   │
    │   ├── ui/
    │   │   ├── LoadingScreen.svelte
    │   │   ├── MicrophoneButton.svelte
    │   │   ├── PermissionPrompt.svelte
    │   │   ├── SettingsPanel.svelte
    │   │   ├── ErrorMessage.svelte
    │   │   ├── UpdateBanner.svelte
    │   │   ├── OfflineIndicator.svelte
    │   │   └── VisualStateIndicators.svelte
    │   │
    │   └── interaction/
    │       └── GestureLayer.svelte   # Invisible overlay for touch detection
    │
    ├── stores/
    │   ├── appState.ts         # isLoading, assetsLoaded, micPermission, isOnline
    │   ├── animationState.ts   # current, previous, queue, isTransitioning
    │   └── audioState.ts       # isListening, isSpeaking, volume, pitchShift
    │
    ├── services/
    │   ├── audioService.ts     # Web Audio API pipeline, MediaRecorder, Web Speech
    │   ├── animationService.ts # State machine, Three.js AnimationMixer wrapper
    │   ├── gestureService.ts   # Touch/pointer event → GestureEvent classification
    │   └── storageService.ts   # localStorage settings, IndexedDB interface
    │
    ├── types/
    │   └── index.ts            # All TypeScript interfaces (AppState, AnimationState, etc.)
    │
    ├── constants/
    │   ├── animation.ts        # BLEND_DURATION_MS, ANIMATION_PRIORITY, state names
    │   ├── audio.ts            # VAD_THRESHOLD, PITCH_SHIFT_DEFAULT, SAMPLE_RATE
    │   └── app.ts              # CACHE_VERSION, FPS_TARGET, TOUCH_ZONE definitions
    │
    └── utils/
        ├── webgl.ts            # WebGL detection + capability checks
        ├── browser.ts          # Feature detection (Web Speech, MediaRecorder)
        └── performance.ts      # FPS monitoring, memory usage sampling
```

### Component Communication Rules

1. **Components → Stores:** Write to stores (e.g., `appState.update(s => ({...s, isLoading: false}))`)
2. **Stores → Components:** Reactive subscriptions (`$appState.isLoading`)
3. **Stores → Services:** Services subscribe to relevant stores
4. **Services → Stores:** Services write results back to stores
5. **Components → Services:** Direct calls via imported service module (singleton)
6. **3D ↔ UI:** NEVER direct coupling — always via stores

### Consequences

- ✅ Services are testable in isolation (no Svelte dependency)
- ✅ Clear data flow (one-way reactive streams)
- ✅ 3D and UI layers decoupled via stores
- ✅ Easy to find code for any user story (each story maps to specific component)
- ⚠️ More files than a monolithic approach (worth the maintainability gain)

### Files Affected

All new files per folder structure above. See component-hierarchy.md for complete mapping.

---

## ADR-007: State Management — Svelte Stores {#adr-007}

**Status:** Accepted  
**Date:** May 1, 2026  
**Deciders:** Architect

### Context

We need reactive state shared across the component tree with:
- No prop-drilling through Threlte 3D components
- TypeScript type safety
- Minimal boilerplate

### Decision

Use **Svelte writable stores** with TypeScript-typed initial values. No external state management library (no Zustand, no Redux, no MobX).

### Rationale

SvelteKit's native stores are sufficient for our scope:
- 3 top-level state objects (AppState, AnimationState, AudioState)
- No complex derived state requiring memoization
- No time-travel debugging requirement

```typescript
// src/lib/stores/appState.ts
import { writable } from 'svelte/store';
import type { AppState } from '$lib/types';

const initial: AppState = {
  isLoading: true,
  assetsLoaded: false,
  micPermission: 'prompt',
  isOnline: navigator.onLine,
  errorMessage: null,
};

export const appState = writable<AppState>(initial);
```

### Store Update Pattern

```typescript
// Immutable partial update helper
import { appState } from '$lib/stores/appState';
appState.update(s => ({ ...s, isLoading: false }));

// In components (reactive)
<script>
  import { appState } from '$lib/stores/appState';
</script>
{#if $appState.isLoading}
  <LoadingScreen />
{/if}
```

### Consequences

- ✅ Zero bundle cost
- ✅ Native Svelte reactive bindings (`$store`)
- ✅ TypeScript generics enforce type safety
- ✅ Testable with `get(store)` from `svelte/store`
- ⚠️ No DevTools integration (use Svelte DevTools browser extension)

---

## ADR-008: Testing Strategy {#adr-008}

**Status:** Accepted  
**Date:** May 1, 2026  
**Deciders:** Architect, PRD (Section 14 — Testing Strategy)

### Context

We need a testing strategy covering:
- Unit tests for services and utilities (70% coverage minimum)
- Integration tests for multi-component flows
- E2E tests for 5 critical user journeys
- Performance audits (Lighthouse CI ≥90)
- Accessibility validation (WCAG 2.1 AA)

### Decision

**Three-layer testing pyramid:**

```
                    E2E Tests
                  (Playwright)
                5 critical journeys
               ─────────────────────
              Integration Tests (Vitest)
            5 scenarios, component mount
           ─────────────────────────────
          Unit Tests (Vitest + Testing Library)
        70% coverage, services + utilities
```

### Tool Selection

| Layer | Tool | Rationale |
|-------|------|-----------|
| Unit | Vitest | Vite-native, ESM, fast HMR, compatible with SvelteKit |
| Integration | Vitest + @testing-library/svelte | Component mounting with JSDOM |
| E2E | Playwright | Cross-browser, mobile viewport emulation, WebGL capable |
| Performance | Lighthouse CI | Automated Core Web Vitals + PWA audit in CI |
| Accessibility | axe-core (via @axe-core/playwright) | Integrated with E2E tests |

### Coverage Requirements

```typescript
// vitest.config.ts
{
  coverage: {
    thresholds: {
      lines: 70,
      functions: 70,
      branches: 60,
    },
    exclude: [
      'src/routes/**',          // Route wrappers — covered by E2E
      'src/lib/components/**',  // UI — covered by integration/E2E
    ]
  }
}
```

### E2E Test Journeys

1. **Voice Mimicry:** Grant mic → press mic button → speak → hear pitched playback
2. **Touch Poke:** Load app → tap Tom's head → see REACTING_POKE animation
3. **Offline Access:** Load online → go offline → reload → app works from cache
4. **PWA Install:** Navigate to app → install prompt appears → install → opens standalone
5. **Settings:** Open settings → change pitch → record voice → verify pitch applied

### CI Integration

```yaml
# .github/workflows/ci.yml
- name: Run unit tests
  run: npm run test:unit -- --coverage

- name: Run E2E tests
  run: npx playwright test

- name: Lighthouse CI
  run: npx lhci autorun
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_TOKEN }}
```

### Consequences

- ✅ 70% coverage enforced in CI — no regression without tests
- ✅ Playwright supports Chrome, Firefox, Safari (WebKit) in CI
- ✅ Lighthouse CI blocks merges if score drops below 90
- ⚠️ WebGL in headless environments requires `--enable-webgl` Playwright flag
- ⚠️ Microphone access in E2E requires mocked MediaDevices

### Files Affected

- `vitest.config.ts` — unit test configuration
- `playwright.config.ts` — E2E configuration
- `lighthouserc.cjs` — Lighthouse CI thresholds
- `tests/unit/**` — service and utility unit tests
- `tests/integration/**` — component integration tests
- `tests/e2e/**` — Playwright E2E tests

---

## ADR-009: Deployment Target — Static Hosting {#adr-009}

**Status:** Accepted  
**Date:** May 1, 2026  
**Deciders:** Architect, PRD (Section 15 — Deployment)

### Context

The app is a static PWA with no backend. We need:
- HTTPS (required for Service Worker and getUserMedia)
- Global CDN for low latency asset delivery
- HTTP/2 for multiplexed asset loading
- Automatic asset compression (Brotli/gzip)
- Custom headers for CSP and cache-control

### Decision

**Primary:** Vercel (static deployment)  
**Alternative:** Netlify, Azure Static Web Apps, GitHub Pages

### Vercel Configuration

```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'"
        },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

### Content Security Policy

```
default-src 'self'
script-src 'self' 'wasm-unsafe-eval'   ← Required for Draco WASM decoder
style-src 'self' 'unsafe-inline'       ← Svelte scoped styles inject inline
img-src 'self' data: blob:             ← Three.js texture blobs
media-src 'self' blob:                 ← Web Audio blob URLs
connect-src 'self'                     ← No external API calls
frame-ancestors 'none'                 ← Prevent clickjacking
```

### Consequences

- ✅ HTTPS automatic on Vercel/Netlify
- ✅ Global CDN with edge caching
- ✅ Brotli compression enabled by default
- ✅ HTTP/2 multiplexing for fast asset loading
- ✅ Custom headers supported (CSP enforcement)
- ✅ Free tier sufficient for prototype/MVP
- ⚠️ Vendor lock-in mitigated by static output (trivially portable)

### Files Affected

- `vercel.json` — Vercel configuration with security headers
- `svelte.config.js` — `adapter-static` output settings
- `static/manifest.webmanifest` — PWA manifest

---

## Design Review Checklist

- [x] ADR-001: SvelteKit SSG — **Accepted**
- [x] ADR-002: Threlte + Three.js — **Accepted**
- [x] ADR-003: Web Audio API — **Accepted**
- [x] ADR-004: Custom Animation State Machine — **Accepted**
- [x] ADR-005: Service Worker Caching — **Accepted**
- [x] ADR-006: Component Architecture — **Accepted**
- [x] ADR-007: Svelte Stores — **Accepted**
- [x] ADR-008: Testing Strategy — **Accepted**
- [x] ADR-009: Static Hosting — **Accepted**

**All 9 decisions documented. ADR ready for Architect → Developer handoff.**

---

**Document Status:** ✅ Complete  
**Next Document:** component-hierarchy.md  
**Last Updated:** May 1, 2026
