# Sprint 8 Requirements: Layout Fix & Lifestyle Sound Effects

**Document:** `docs/requirements/sprint8-layout-and-audio.md`
**Sprint Date:** May 2026
**Status:** [Final]

---

## Sprint 8 Goal

Fix the lifestyle button panel layout so Tom and the action buttons are fully visible without overlap, and add contextual sound effects for each lifestyle action (Bath, Food, Pee, Sleep).

---

## Change Requests Addressed

| ID | Title | Source |
|----|-------|--------|
| CR-1 | Lifestyle button panel overlaps Tom character | changerequests-1.md |
| CR-2 | Add sound effects for lifestyle actions | changerequests-1.md |

---

## User Stories

---

### US-8.1 — Layout: Tom character and lifestyle buttons do not overlap

**As a user, I want Tom and the lifestyle action buttons to be clearly visible at the same time, so that I can interact with both without any element hiding the other.**

#### Required Layout Change

Restructure the root page layout to a flex-column split:
- **Top section** (`flex: 1; overflow: hidden`): 3D canvas — Tom renders here, filling available space above the panel.
- **Bottom section** (fixed height ~4–5rem): `LifestylePanel.svelte` — four lifestyle buttons in a dedicated strip.
- No `position: fixed` overlap between these two sections.
- Canvas fills its parent container height, not hardcoded `100vh`.

#### Acceptance Criteria [Final]

- [ ] AC-8.1.1 Tom's 3D model is fully visible without being hidden beneath the lifestyle panel at viewports: 375×667, 390×844, 414×896, 768×1024.
- [ ] AC-8.1.2 The four lifestyle buttons are fully visible and tappable in their dedicated strip at the bottom.
- [ ] AC-8.1.3 No lifestyle button overlaps the 3D canvas area.
- [ ] AC-8.1.4 Canvas resizes correctly on browser window resize — no leftover overlap.
- [ ] AC-8.1.5 On landscape orientation (667×375), Tom and buttons are both visible — panel may shrink via media query.
- [ ] AC-8.1.6 Existing gesture interactions (poke, pet, hold) are unaffected — gesture layer covers only the canvas area.

---

### US-8.2 — Sound: Water splash plays when Bath action is triggered

**As a user, when I tap the Bath button, I want to hear a water splash sound, so that the interaction feels sensory and alive.**

#### Acceptance Criteria [Final]

- [ ] AC-8.2.1 A water splash sound begins playing within 200ms of `BATHING` state entry.
- [ ] AC-8.2.2 Sound stops automatically when state returns to `IDLE`.
- [ ] AC-8.2.3 Silent failure if asset fails to load — no error thrown to user.
- [ ] AC-8.2.4 Routed through `lifestyleAudioService` (or equivalent service layer) — no inline `new Audio()` in components.

---

### US-8.3 — Sound: Munching sound plays when Food action is triggered

**As a user, when I tap the Food button, I want to hear a munching/eating sound, so that feeding Tom feels satisfying.**

#### Acceptance Criteria [Final]

- [ ] AC-8.3.1 An eating/munching sound begins playing within 200ms of `EATING` state entry.
- [ ] AC-8.3.2 Sound stops automatically when state returns to `IDLE`.
- [ ] AC-8.3.3 Silent failure on asset load error.
- [ ] AC-8.3.4 Routed through service layer.

---

### US-8.4 — Sound: Trickle sound plays when Pee action is triggered

**As a user, when I tap the Pee button, I want to hear a liquid trickle sound, so that the action has matching audio feedback.**

#### Acceptance Criteria [Final]

- [ ] AC-8.4.1 A liquid trickle sound begins playing within 200ms of `PEEING` state entry.
- [ ] AC-8.4.2 Sound stops automatically when state returns to `IDLE`.
- [ ] AC-8.4.3 Silent failure on asset load error.
- [ ] AC-8.4.4 Routed through service layer.

---

### US-8.5 — Sound: Snoring/lullaby plays when Sleep action is triggered

**As a user, when I tap the Sleep button, I want to hear soft snoring or lullaby ambience, so that the sleep state feels calming.**

#### Acceptance Criteria [Final]

- [ ] AC-8.5.1 A soft snoring or lullaby sound begins playing within 200ms of `SLEEPING` state entry.
- [ ] AC-8.5.2 Sound loops during sleep state.
- [ ] AC-8.5.3 Sound stops within 300ms when woken (state returns to `IDLE`).
- [ ] AC-8.5.4 Silent failure on asset load error.
- [ ] AC-8.5.5 Routed through service layer.

---

## Files Expected to Change

### CR-1: Layout

| File | Change |
|------|--------|
| `src/routes/+page.svelte` | Flex-column layout split; canvas in `flex: 1` section |
| `src/lib/components/LifestylePanel.svelte` | Remove `position: fixed`/`bottom: 0`; render as block in flow |

### CR-2: Sound Effects

| File | Change |
|------|--------|
| `static/audio/bath-splash.mp3` | New audio asset |
| `static/audio/food-munch.mp3` | New audio asset |
| `static/audio/pee-trickle.mp3` | New audio asset |
| `static/audio/sleep-snore.mp3` | New audio asset |
| `src/lib/services/lifestyleAudioService.ts` | New service — plays/stops SFX per action |
| `src/lib/services/lifestyleService.ts` | Call audio service on state entry/exit |
| `src/lib/services/lifestyleAudioService.test.ts` | Unit tests for new service |

---

## Out of Scope (Sprint 8)

- Stat meters / hunger / hygiene bars
- Per-action volume controls
- New GLB animations
- Sound for gestures or speech
- Visual redesign of lifestyle buttons
- Changes to overlay components (unless required by layout fix)

---

## Dependencies

| Dependency | Status |
|------------|--------|
| Sprint 7 lifestyle state machine | ✅ Merged (commit 9352d87) |
| `lifestyleService.ts` BATHING/EATING/PEEING/SLEEPING states | ✅ Present |
| Royalty-free audio assets (4 clips) | ⚠️ Must be sourced — developer generates synthetic tones if assets unavailable |

---

## Definition of Done

- [ ] All AC above passing
- [ ] `npm run check` clean (no TypeScript errors)
- [ ] Existing 135 unit tests continue to pass
- [ ] Layout verified at: 375×667, 390×844, 768×1024, landscape 667×375
- [ ] Sound tested in Chromium and Safari
- [ ] No inline `new Audio()` in components
