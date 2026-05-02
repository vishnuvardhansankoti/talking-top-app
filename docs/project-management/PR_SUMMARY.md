# PR Summary
## Sprint 6 Post-QA Remediation

## Objective
Address user-reported post-implementation issues:
1. Tom appears but does not read clearly as the character.
2. Repeat voice may not trigger when recording stops automatically on silence.

## Changes
- Updated procedural GLB generation in `scripts/generate-tom-glb.mjs`:
  - Added clear cat features (ears, eyes, pupils, nose, belly patch)
  - Adjusted material palette for better character readability
  - Regenerated `static/models/Tom.glb` (now ~96.4 KB)
- Updated scene framing:
  - `src/lib/components/3d/Stage3D.svelte` camera tuned for better portrait framing
  - `src/lib/components/3d/TomCharacter.svelte` position adjusted upward
  - Added GLB cache-busting query to avoid stale PWA-cached model
- Fixed repeat-voice auto-stop path:
  - Added recording-stopped callback hook in `src/lib/services/audioService.ts`
  - Wired callback in `src/lib/components/ui/MicrophoneButton.svelte` so auto-stop and manual-stop share the same repeat flow

## Validation
- `npm run test` -> 123/123 pass
- `npm run build` -> success

## Remaining QA Gate
- Re-run Playwright smoke validation on the remediated build.
- Manual verification: both manual stop and auto-stop should trigger Tom repeat voice.
