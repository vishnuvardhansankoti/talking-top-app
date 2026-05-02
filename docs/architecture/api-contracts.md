# API Contracts
## Talking Tom PWA — Web API Usage Patterns

**Document Status:** Final  
**Author:** Architect  
**Created:** May 1, 2026  
**Phase:** Design  
**References:** ADR-003 (Web Audio API), ADR-005 (Service Worker), schema.md, docs/requirements/requirements-breakdown.md

---

## Overview

This document specifies the exact usage patterns for all Web APIs consumed by the app. No server APIs are used — all processing is client-side. Five Web API categories are covered:

1. [Web Speech API](#1-web-speech-api)
2. [Web Audio API Pipeline](#2-web-audio-api-pipeline)
3. [MediaRecorder API](#3-mediarecorder-api)
4. [Service Worker Lifecycle](#4-service-worker-lifecycle)
5. [IndexedDB / Storage APIs](#5-storage-apis)

---

## 1. Web Speech API

**Status:** Optional enhancement (degrades gracefully)  
**Implementation:** `src/lib/services/audioService.ts`  
**User Stories:** US-V01, US-V05

### 1.1 Availability Detection

```typescript
// src/lib/utils/browser.ts
export function isSpeechRecognitionSupported(): boolean {
  return (
    'SpeechRecognition' in window ||
    'webkitSpeechRecognition' in window
  );
}
```

### 1.2 Initialization

```typescript
// src/lib/services/audioService.ts
const SpeechRecognitionAPI =
  (window as any).SpeechRecognition ||
  (window as any).webkitSpeechRecognition;

let recognition: SpeechRecognition | null = null;

if (SpeechRecognitionAPI) {
  recognition = new SpeechRecognitionAPI();
  recognition.continuous = false;      // Single utterance per session
  recognition.interimResults = false;  // Final results only
  recognition.lang = 'en-US';          // Language hint
  recognition.maxAlternatives = 1;     // Top result only
}
```

### 1.3 Session Lifecycle

```typescript
function startSpeechRecognition(): void {
  if (!recognition) return; // Degrade gracefully — Web Speech not supported

  recognition.onstart = () => {
    // Recognition session started (internal event, no UI update needed here)
    // UI is already updated from MediaRecorder startListening()
  };

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const transcript = event.results[0][0].transcript;
    const confidence = event.results[0][0].confidence;
    // Optional: display transcript in VisualStateIndicators
    // Not required for core voice mimicry feature
    console.debug('[SpeechRecognition] Transcript:', transcript, 'confidence:', confidence);
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    // Web Speech error does NOT block audio mimicry
    // MediaRecorder capture continues independently
    console.warn('[SpeechRecognition] Error (non-fatal):', event.error);
  };

  recognition.onend = () => {
    // Session ended — no action required
    // Audio recording managed separately by MediaRecorder
  };

  recognition.start();
}

function stopSpeechRecognition(): void {
  recognition?.stop();
}
```

### 1.4 Browser Support Matrix

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 90+ | ✅ Full | `SpeechRecognition` (native) |
| Edge 90+ | ✅ Full | `SpeechRecognition` (native) |
| Safari 14.5+ | ⚠️ Partial | `webkitSpeechRecognition`, requires user gesture per session |
| Firefox 88+ | ❌ None | No support — degrade to mimicry only |
| Samsung Internet 14+ | ✅ Full | Via Chrome engine |

**Degradation:** If `SpeechRecognition` is unavailable, `recognition` remains `null` and no transcript is displayed. Voice mimicry continues via MediaRecorder + Web Audio API (primary pipeline, always available).

---

## 2. Web Audio API Pipeline

**Status:** Required — core feature  
**Implementation:** `src/lib/services/audioService.ts`  
**User Stories:** US-V01, US-V03, US-V04, US-V06

### 2.1 AudioContext Initialization

```typescript
let audioContext: AudioContext | null = null;

/**
 * Lazy initialization — AudioContext must be created in user gesture handler
 * (iOS Safari requirement: AudioContext suspended until user interaction)
 */
async function getAudioContext(): Promise<AudioContext> {
  if (!audioContext) {
    audioContext = new AudioContext({ sampleRate: 44100 });
  }
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  return audioContext;
}
```

### 2.2 Input Pipeline (Capture)

```typescript
let sourceNode: MediaStreamAudioSourceNode | null = null;
let analyserNode: AnalyserNode | null = null;

async function setupInputPipeline(stream: MediaStream): Promise<void> {
  const ctx = await getAudioContext();

  // 1. Create source from microphone stream
  sourceNode = ctx.createMediaStreamSource(stream);

  // 2. Create analyser for VAD + lip-sync
  analyserNode = ctx.createAnalyser();
  analyserNode.fftSize = 256;           // Small FFT → fast amplitude updates
  analyserNode.smoothingTimeConstant = 0.3; // Moderate smoothing

  // 3. Connect: source → analyser (analyser reads amplitude, does not affect output)
  sourceNode.connect(analyserNode);
  // Note: do NOT connect analyser to destination — prevents audio feedback
}
```

### 2.3 Voice Activity Detection (VAD)

```typescript
const dataArray = new Uint8Array(256 / 2); // frequencyBinCount = fftSize / 2

function getAmplitude(): number {
  if (!analyserNode) return 0;
  analyserNode.getByteTimeDomainData(dataArray);
  // Compute RMS (Root Mean Square) amplitude
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const normalized = (dataArray[i] - 128) / 128; // -1 to 1
    sum += normalized * normalized;
  }
  return Math.sqrt(sum / dataArray.length); // 0–1
}

// Called in animation frame loop while listening
function updateVolumeStore(): void {
  const amplitude = getAmplitude();
  audioState.update(s => ({ ...s, volume: amplitude }));
  
  if (isListening && amplitude > VAD_THRESHOLD / 128) {
    // Voice detected — continue recording
    lastVoiceActivityTime = performance.now();
  } else if (isListening && performance.now() - lastVoiceActivityTime > 1500) {
    // 1.5 seconds of silence — auto-stop recording
    stopListening();
  }
}
```

### 2.4 Output Pipeline (Playback)

```typescript
async function playbackWithPitch(buffer: AudioBuffer, pitchShift: number): Promise<void> {
  const ctx = await getAudioContext();

  // 1. Create source from decoded audio buffer
  const sourceNode = ctx.createBufferSource();
  sourceNode.buffer = buffer;
  sourceNode.playbackRate.value = pitchShift; // 1.2x–1.8x

  // 2. Create gain node for volume control
  const gainNode = ctx.createGain();
  gainNode.gain.value = 1.0; // Full volume (adjustable in future)

  // 3. Connect: bufferSource → gain → destination (speakers)
  sourceNode.connect(gainNode);
  gainNode.connect(ctx.destination);

  // 4. Track playback state
  audioState.update(s => ({ ...s, isSpeaking: true }));
  animationService.play('SPEAKING');

  // 5. On playback end
  sourceNode.onended = () => {
    audioState.update(s => ({ ...s, isSpeaking: false, currentAudio: null }));
    animationService.play('IDLE');
    // Disconnect nodes (manual cleanup — no auto-disposal in Web Audio API)
    sourceNode.disconnect();
    gainNode.disconnect();
  };

  sourceNode.start(0);
}
```

### 2.5 Pitch Shift Mechanism

Pitch shifting uses `AudioBufferSourceNode.playbackRate`:

| Pitch Shift | playbackRate | Perceived Effect |
|------------|-------------|-----------------|
| 1.2x | 1.2 | Slightly higher, chipmunk-lite |
| 1.5x (default) | 1.5 | Tom's characteristic voice |
| 1.8x | 1.8 | Very high-pitched, cartoon |

**Note:** `playbackRate` also increases playback speed proportionally. At 1.5x, a 2-second recording plays back in ~1.33 seconds. This is the expected behavior for classic "helium voice" effects.

### 2.6 AudioContext Lifecycle

```typescript
function destroy(): void {
  // Stop all active sources
  currentBufferSource?.stop();
  currentBufferSource?.disconnect();

  // Stop microphone stream tracks
  activeStream?.getTracks().forEach(track => track.stop());

  // Disconnect nodes
  sourceNode?.disconnect();
  analyserNode?.disconnect();

  // Close context (releases hardware resources)
  audioContext?.close();
  audioContext = null;
}
```

---

## 3. MediaRecorder API

**Status:** Required — core feature  
**Implementation:** `src/lib/services/audioService.ts`  
**User Stories:** US-V01, US-V02, US-V06

### 3.1 MIME Type Detection

```typescript
// src/lib/utils/browser.ts
export function getPreferredAudioMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',  // Chrome 90+, Edge 90+, Firefox 88+
    'audio/webm',              // Chrome (no codec specification)
    'audio/mp4',               // Safari 14.5+
    'audio/ogg;codecs=opus',   // Firefox fallback
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  // Should not reach here on supported browsers — throw for early detection
  throw new Error('No supported audio MIME type found for MediaRecorder');
}
```

### 3.2 MediaRecorder Initialization

```typescript
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
const mimeType = getPreferredAudioMimeType();

async function startListening(): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 44100,
    },
    video: false,
  });

  await setupInputPipeline(stream); // Connect AnalyserNode

  audioChunks = [];
  mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    audioBitsPerSecond: 128000, // 128 kbps — good quality, reasonable size
  });

  mediaRecorder.ondataavailable = (event: BlobEvent) => {
    if (event.data.size > 0) {
      audioChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: mimeType });
    const arrayBuffer = await audioBlob.arrayBuffer();
    const ctx = await getAudioContext();
    
    try {
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      audioState.update(s => ({ ...s, currentAudio: audioBuffer }));
      await playbackWithPitch(audioBuffer, get(audioState).pitchShift);
    } catch (err) {
      console.error('[AudioService] decodeAudioData failed:', err);
      appState.update(s => ({ ...s, errorMessage: 'Could not process audio' }));
      animationService.play('IDLE');
    } finally {
      audioChunks = [];
      // Stop all stream tracks (release microphone)
      stream.getTracks().forEach(track => track.stop());
    }
  };

  mediaRecorder.onerror = (event: Event) => {
    console.error('[AudioService] MediaRecorder error:', event);
    stopListening();
  };

  // Collect data every 250ms (reduces memory peak vs collecting all at end)
  mediaRecorder.start(250);

  audioState.update(s => ({ ...s, isListening: true }));
  animationService.play('LISTENING');
}
```

### 3.3 Recording Stop

```typescript
function stopListening(): void {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

  mediaRecorder.stop(); // Triggers onstop → playback pipeline
  audioState.update(s => ({ ...s, isListening: false }));
}
```

### 3.4 Permission Request

```typescript
async function requestPermission(): Promise<MicPermission> {
  try {
    // Use permissions API first (non-blocking probe)
    if ('permissions' in navigator) {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (result.state === 'denied') {
        appState.update(s => ({ ...s, micPermission: 'denied' }));
        return 'denied';
      }
    }

    // Request actual permission via getUserMedia (shows browser prompt)
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    // Immediately stop test stream (permission probe only)
    stream.getTracks().forEach(track => track.stop());

    appState.update(s => ({ ...s, micPermission: 'granted' }));
    return 'granted';
  } catch (err) {
    const permission: MicPermission =
      (err as Error).name === 'NotAllowedError' ? 'denied' : 'prompt';
    appState.update(s => ({ ...s, micPermission: permission }));
    return permission;
  }
}
```

### 3.5 Browser Compatibility

| Browser | MediaRecorder | Supported MIME Type | Notes |
|---------|--------------|--------------------|-|
| Chrome 90+ | ✅ | `audio/webm;codecs=opus` | Preferred |
| Edge 90+ | ✅ | `audio/webm;codecs=opus` | Same engine as Chrome |
| Firefox 88+ | ✅ | `audio/ogg;codecs=opus` | Web Speech API unavailable |
| Safari 14.5+ | ✅ | `audio/mp4` | iOS 14.5+ only; iOS 14.0–14.4 — no MediaRecorder |
| Samsung Internet 14+ | ✅ | `audio/webm;codecs=opus` | Via Chrome engine |

---

## 4. Service Worker Lifecycle

**Status:** Required — PWA offline support  
**Implementation:** Auto-generated by Vite PWA Plugin + Workbox  
**User Stories:** US-PWA01, US-PWA02, US-PWA03, US-PWA04, US-PWA05

### 4.1 Install Handler

```typescript
// src/service-worker.ts (Workbox-injected via VitePWA)
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Injected by VitePWA plugin with hashed asset manifest
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
```

### 4.2 Activate Handler

```typescript
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    Promise.all([
      // 1. Claim all open clients immediately
      self.clients.claim(),
      // 2. Delete obsolete caches (managed by cleanupOutdatedCaches)
    ])
  );
});
```

### 4.3 Fetch Handler — Large Assets

```typescript
// Runtime caching for .glb 3D model (not precached due to size)
registerRoute(
  ({ url }) => url.pathname.endsWith('.glb'),
  new CacheFirst({
    cacheName: 'static-3d-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 5,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Runtime caching for audio assets
registerRoute(
  ({ url }) => /\.(mp3|wav|ogg|m4a)$/.test(url.pathname),
  new CacheFirst({
    cacheName: 'static-audio-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20 }),
    ],
  })
);
```

### 4.4 Message Handler (Update Notification)

```typescript
// Service worker sends update notification to all clients
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// In install event: notify clients of pending update
self.addEventListener('install', () => {
  // After install completes, notify all controlled clients
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(client =>
      client.postMessage({ type: 'UPDATE_AVAILABLE' })
    );
  });
});
```

### 4.5 Page-Side Update Handler

```typescript
// src/routes/+page.svelte
import { onMount } from 'svelte';

onMount(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');

    navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
      if (event.data?.type === 'UPDATE_AVAILABLE') {
        // Show UpdateBanner.svelte
        appState.update(s => ({ ...s, updateAvailable: true }));
      }
    });

    // Listen for online/offline changes
    window.addEventListener('online', () =>
      appState.update(s => ({ ...s, isOnline: true }))
    );
    window.addEventListener('offline', () =>
      appState.update(s => ({ ...s, isOnline: false }))
    );
  }
});
```

### 4.6 Vite PWA Plugin Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    sveltekit(),
    VitePWA({
      registerType: 'prompt',  // 'prompt' = show UpdateBanner before updating
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,webp,svg,wasm}'],
        // Exclude .glb from precache (handled via runtime caching above)
        globIgnores: ['**/*.glb', '**/*.mp3'],
        runtimeCaching: [], // Defined inline in service-worker.ts
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB precache limit per file
      },
      manifest: {
        name: 'Talking Tom',
        short_name: 'Tom',
        description: 'Interactive talking cat — speak and Tom repeats you!',
        theme_color: '#4a90d9',
        background_color: '#1a1a2e',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      devOptions: {
        enabled: false, // Service worker disabled in development
      },
    }),
  ],
});
```

### 4.7 Service Worker Scope

| Cache Name | Strategy | Contents | Max Age |
|-----------|----------|---------|---------|
| `workbox-precache` | Cache First | App shell (JS, CSS, HTML, icons) | SW version |
| `static-3d-assets` | Cache First | `*.glb` 3D models | 30 days |
| `static-audio-assets` | Cache First | `*.mp3`, `*.wav` | 30 days |

---

## 5. Storage APIs

### 5.1 localStorage (Settings Persistence)

**Status:** Required  
**Implementation:** `src/lib/services/storageService.ts`  
**User Stories:** US-UI05, US-A11Y04, US-A11Y05

```typescript
// src/lib/services/storageService.ts
import type { Settings } from '$lib/types';
import { SETTINGS_DEFAULT, SETTINGS_STORAGE_KEY } from '$lib/types';

export const storageService = {
  saveSettings(settings: Partial<Settings>): void {
    try {
      const existing = this.loadSettings();
      const merged = { ...existing, ...settings };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
    } catch (err) {
      // localStorage may be unavailable in private browsing on some browsers
      console.warn('[StorageService] Could not save settings:', err);
    }
  },

  loadSettings(): Settings {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return { ...SETTINGS_DEFAULT };
      const parsed = JSON.parse(raw) as Partial<Settings>;
      // Merge with defaults to handle missing fields after updates
      return { ...SETTINGS_DEFAULT, ...parsed };
    } catch (err) {
      console.warn('[StorageService] Could not load settings:', err);
      return { ...SETTINGS_DEFAULT };
    }
  },

  clearSettings(): void {
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch (err) {
      console.warn('[StorageService] Could not clear settings:', err);
    }
  },
};
```

**Privacy:** Only settings are stored (pitch preference, UI toggles). No audio, no user data.

### 5.2 IndexedDB (Reserved for v1.1)

Not used in v1.0. Reserved for future recording replay feature:

```typescript
// Reserved schema — NOT IMPLEMENTED in v1.0
// Database: 'talking-tom-pwa'  Version: 1
// ObjectStore: 'settings' (keyPath: 'key')
// ObjectStore: 'recordings' (autoIncrement: true)

// Migration path: storageService will grow a useIndexedDB() variant
// when localStorage quota becomes a concern (unlikely for settings-only)
```

### 5.3 Cache API (via Service Worker Only)

The Cache API is used exclusively by the Workbox-generated service worker. Application code does not access `caches` directly.

### 5.4 Storage Quota Estimation

```typescript
// src/lib/utils/browser.ts
export async function estimateStorageQuota(): Promise<{ quota: number; usage: number } | null> {
  if (!('storage' in navigator && 'estimate' in navigator.storage)) {
    return null;
  }
  const estimate = await navigator.storage.estimate();
  return {
    quota: estimate.quota ?? 0,
    usage: estimate.usage ?? 0,
  };
}

// Called during loading to warn if < 50MB available
// (3D model is ~5MB, app shell ~2MB, audio ~1MB = ~8MB minimum)
```

---

## 6. Additional Web APIs

### 6.1 Pointer Events (Touch + Mouse Unified)

```typescript
// GestureLayer.svelte — unified pointer event handling
<div
  on:pointerdown={handlePointerDown}
  on:pointerup={handlePointerUp}
  on:pointermove={handlePointerMove}
  on:pointercancel={handlePointerCancel}
  style="touch-action: none"  /* Prevent default scroll — gesture layer owns all touch */
>
```

**Why Pointer Events over Touch Events:** Single API for mouse, touch, and stylus. `pointercancel` handles system gesture interruptions (home button, notification pull). `touch-action: none` required to prevent browser scroll from capturing touch.

### 6.2 Visibility API (Pause on Background)

```typescript
// src/routes/+page.svelte
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Suspend AudioContext when app goes to background (iOS battery)
    audioContext?.suspend();
    // Reduce Three.js render loop to 0 FPS
    renderer?.setAnimationLoop(null);
  } else {
    // Resume when app returns to foreground
    audioContext?.resume();
    renderer?.setAnimationLoop(animate);
  }
});
```

### 6.3 Media Queries (Accessibility)

```typescript
// src/routes/+page.svelte — onMount
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const contrastQuery = window.matchMedia('(prefers-contrast: more)');

// Apply system preferences as initial settings (user can override)
if (motionQuery.matches) {
  storageService.saveSettings({ reducedMotion: true });
}

// Listen for changes
motionQuery.addEventListener('change', (e) => {
  storageService.saveSettings({ reducedMotion: e.matches });
});
```

---

## 7. Security Constraints on Web API Usage

| API | Constraint | Enforcement |
|-----|-----------|-------------|
| MediaDevices.getUserMedia | Requires HTTPS | Vercel enforces HTTPS. Localhost exempted by browsers. |
| AudioContext | Requires user gesture (iOS) | MicrophoneButton tap triggers `audioContext.resume()` |
| Service Worker | Requires HTTPS + same-origin | Vercel CDN satisfies both |
| localStorage | Sandboxed per origin | No cross-origin access possible |
| MediaRecorder | No network output | Code review enforces: no `fetch()` with audio data |

**CSP Enforcement** (from ADR-009):
```
script-src 'self' 'wasm-unsafe-eval'   ← 'wasm-unsafe-eval' for Draco WASM decoder
connect-src 'self'                      ← No external API calls ever
media-src 'self' blob:                  ← blob: URLs for AudioBuffer playback
```

---

**Document Status:** ✅ Complete  
**Design Phase:** 4/4 architecture documents complete  
**Next Phase:** Development (Developer Agent)  
**Last Updated:** May 1, 2026
