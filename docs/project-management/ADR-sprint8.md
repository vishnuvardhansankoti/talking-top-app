# ADR-Sprint8: Layout Separation and Lifestyle Audio Service

**Status:** Approved  
**Date:** 2026-05-02  
**Author:** Architect Agent  
**Sprint:** 8  
**Change Requests:** CR-1 (Layout), CR-2 (Audio)

---

## 1. Context

### CR-1 — Layout Overlap
`+page.svelte` mounts the Threlte `<Canvas>` and `<LifestylePanel>` in a shared container causing lifestyle buttons to render over Tom's 3D viewport. `GestureLayer` (`position: absolute; inset: 0`) is scoped inside the canvas wrapper.

### CR-2 — Audio for Lifestyle Actions
No audio feedback exists for lifestyle actions. `lifestyleService.ts` orchestrates state transitions but emits no sound. Audio files may not exist at development time — Web Audio API oscillator fallback required. App is SSG (`ssr=false`, `prerender=true`) so `AudioContext` must be lazily initialized.

---

## 2. Decision — CR-1: Layout Fix

### Principle
Separate canvas and lifestyle panel into distinct non-overlapping flex rows. Canvas expands to fill; panel has fixed height.

### Changes to `src/routes/+page.svelte`

**Outermost container:**
```css
display: flex;
flex-direction: column;
width: 100%;
height: 100dvh;
overflow: hidden;
```

**Canvas wrapper (wraps `<Canvas>` + `<GestureLayer>`):**
```css
position: relative;   /* keeps GestureLayer inset:0 scoped */
flex: 1 1 0;
min-height: 0;        /* prevents Safari flex overflow */
overflow: hidden;
```

**LifestylePanel host:**
```css
flex: 0 0 auto;
width: 100%;
```

Remove any `position: absolute`/`z-index` that positioned `LifestylePanel` over the canvas.

### Changes to `src/lib/components/LifestylePanel.svelte`

**Remove:** `position: absolute`, `bottom`, `left`, `right`, `z-index`

**Add:**
```css
display: flex;
flex-direction: row;
justify-content: space-around;
align-items: center;
padding: 0.75rem 1rem;
background: rgba(0, 0, 0, 0.55);
width: 100%;
box-sizing: border-box;
```

### GestureLayer — No Changes Required
Already scoped inside canvas wrapper via `position: absolute; inset: 0`.

---

## 3. Decision — CR-2: Lifestyle Audio Service

### New File: `src/lib/services/lifestyleAudioService.ts`

**Oscillator fallback parameters:**
| Sound | Frequency | Wave Type | Duration | Loop |
|-------|-----------|-----------|----------|------|
| bath  | 440 Hz    | sine      | 1.5 s    | no   |
| food  | 660 Hz    | sine      | 0.8 s    | no   |
| pee   | 330 Hz    | triangle  | 2.0 s    | no   |
| sleep | 200 Hz    | sine      | —        | yes  |

**Audio file paths:**
```
static/audio/bath-splash.mp3
static/audio/food-crunch.mp3
static/audio/pee-stream.mp3
static/audio/sleep-snore.mp3
```

**SSG safety rules (mandatory):**
- No `new AudioContext()` at module top level
- No `new Audio()` at module top level
- All audio code gated with `if (typeof window === 'undefined') return null`
- Lazy-init `AudioContext` inside `getAudioContext()` function

**Strategy:** Fetch mp3 file first; if fetch fails/404, fall through to oscillator fallback silently.

### Audio Trigger Location
**In `lifestyleService.ts`**, not in Svelte components. Call `lifestyleAudioService.play()` at each action dispatch; call `stopSleep()` at SLEEPING→IDLE transition.

### Sleep Sound Strategy
- `bath`, `food`, `pee`: one-shot, auto-stop via oscillator `stop()` time
- `sleep`: looping oscillator, stopped by `stopSleep()` at SLEEPING→IDLE

---

## 4. Schema Changes — `src/lib/types/index.ts`

```typescript
export type LifestyleSound = 'bath' | 'food' | 'pee' | 'sleep';
```

---

## 5. Test Strategy

File: `src/lib/services/lifestyleAudioService.test.ts`

Mock `AudioContext` via `vi.stubGlobal`. Required test cases:
1. `play('bath')` → oscillator `type='sine'`, `frequency=440`
2. `play('food')` → oscillator `type='sine'`, `frequency=660`
3. `play('pee')` → oscillator `type='triangle'`, `frequency=330`
4. `play('sleep')` → `osc.start()` called, `osc.stop()` NOT called (looping)
5. `stopSleep()` → calls `osc.stop()` on stored sleep oscillator
6. `stopSleep()` when no sleep active → no throw
7. `dispose()` → calls `ctx.close()`
8. `play()` when `window` undefined → no-op, no throw
9. `play()` when `AudioContext` constructor throws → silent failure
10. Fetch fails (`ok: false`) → oscillator fallback executes
11. Fetch succeeds → `decodeAudioData` called, no oscillator

Coverage target: ≥90% lines on `lifestyleAudioService.ts`.

---

## 6. Implementation Order

1. Add `LifestyleSound` type to `src/lib/types/index.ts`
2. Create `src/lib/services/lifestyleAudioService.ts`
3. Integrate audio calls into `lifestyleService.ts`
4. Fix layout in `src/routes/+page.svelte`
5. Fix layout in `src/lib/components/LifestylePanel.svelte`
6. Write `src/lib/services/lifestyleAudioService.test.ts`
7. Run full test suite (all existing + new tests pass)
8. `npm run build` clean
