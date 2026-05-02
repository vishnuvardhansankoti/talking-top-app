# Sprint Context
## Talking Tom PWA - Sprint 8: Layout + Lifestyle Audio

**Sprint:** Sprint 8 - Layout + Lifestyle Audio  
**Date:** May 2, 2026  
**Sprint Goal:** Deliver CR-1 and CR-2: separate lifestyle buttons from Tom's 3D canvas (no overlap) and add action sound effects (bath/food/pee/sleep) with SSG-safe fallback audio behavior.


## Current Scope

### Analyst Scope (✅ Complete)
- Requirements doc: `docs/requirements/sprint8-layout-and-audio.md`
- CR-1: layout separation between Tom canvas and lifestyle action buttons
- CR-2: lifestyle action sound effects with non-crashing fallback behavior
- Acceptance criteria: US-8.1 through US-8.5 marked [Final]

### Architect Scope (✅ Complete)
- ADR doc: `docs/project-management/ADR-sprint8.md`
- Layout design: `.viewport` flex column with `.canvas-area` above `LifestylePanel`
- Audio design: `lifestyleAudioService` with mp3-first playback and oscillator fallback
- SSG safety requirement: lazy AudioContext initialization behind `typeof window` guard

### Developer Scope (✅ Complete)
- `src/routes/+page.svelte` — refactored to render `LifestylePanel` below canvas; no overlap
- `src/lib/services/lifestyleAudioService.ts` — new audio service with fallback oscillator tones
- `src/lib/services/lifestyleService.ts` — action sound playback + sleep-stop integration
- `src/lib/services/lifestyleAudioService.test.ts` — 11 audio behavior tests
- `src/lib/types/index.ts` — added `LifestyleSound` type

### QA Scope (✅ Complete)
- 146/146 unit tests pass (includes new audio test file)
- 160/160 Playwright E2E pass
- Build passes (`npm run build`)
- Firefox click interception regression fixed (`.compat-warning` pointer events)

### Post-QA Remediation (Session 10)
- Fixed Firefox E2E failures caused by compat-warning intercepting clicks on settings/mic controls
- Applied non-blocking banner style while keeping dismiss button interactive
- Revalidated with targeted Firefox critical flows and full Playwright matrix

---

## Acceptance Criteria (Sprint 8)

| ID | Criteria | Status |
|----|----------|--------|
| AC-S8-01 | Lifestyle panel is visually separated from Tom canvas and no overlap occurs | ✅ |
| AC-S8-02 | Bath/Food/Pee/Sleep actions trigger corresponding sound behavior | ✅ |
| AC-S8-03 | Sleep sound loops and stops on wake/finish transitions | ✅ |
| AC-S8-04 | Audio logic is SSG-safe (no module-top AudioContext init; window-guarded) | ✅ |
| AC-S8-05 | Unit tests include explicit fallback + decode paths for audio playback | ✅ |
| AC-S8-06 | `npm test` passes (146/146) | ✅ |
| AC-S8-07 | `npm run build` succeeds | ✅ |
| AC-S8-08 | `npx playwright test --reporter=line` passes (160/160) | ✅ |
