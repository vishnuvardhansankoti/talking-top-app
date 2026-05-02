# Sprint 7 Requirements: Lifestyle Interactions

**Version:** 1.0
**Date:** 2026-05-02
**Status:** [Final]
**Sprint Goal:** Give Tom four lifestyle actions (Bath, Food, Pee, Sleep) triggered by a persistent bottom-panel UI, each with a dedicated animation clip, a CSS overlay effect, and a 30-second same-action cooldown.

---

## 1. Sprint Goal

Enable users to trigger four lifestyle interactions — bathing, eating, going to the bathroom, and sleeping — through a persistent icon panel, so Tom feels like a living companion with daily needs.

---

## 2. User Stories

### US-7.1 — Bath
**As a user, I want to tap the Bath button so that Tom takes an animated bath with water-splash visual feedback.**

#### Acceptance Criteria [Final]
- AC-7.1.1: A Bath icon (🛁) button is visible in the lifestyle panel at all times.
- AC-7.1.2: Tapping Bath while Tom is IDLE triggers the BATHING animation and transitions state to BATHING.
- AC-7.1.3: A CSS water-droplet overlay animates over the canvas for ~4 seconds.
- AC-7.1.4: After the clip ends Tom returns to IDLE; Bath button enters a 30-second cooldown (dimmed, non-interactive).
- AC-7.1.5: Tapping Bath while Tom is in any non-IDLE state has no effect.

### US-7.2 — Food
**As a user, I want to tap the Food button so that Tom eats with an eating animation.**

#### Acceptance Criteria [Final]
- AC-7.2.1: A Food icon (🍕) button is visible in the lifestyle panel at all times.
- AC-7.2.2: Tapping Food while IDLE triggers the EATING animation and transitions state to EATING.
- AC-7.2.3: A food-bowl CSS overlay appears over the canvas for ~3 seconds.
- AC-7.2.4: After the clip ends Tom returns to IDLE; Food button enters a 30-second cooldown.
- AC-7.2.5: Tapping Food while in a non-IDLE state has no effect.

### US-7.3 — Pee
**As a user, I want to tap the Pee button so that Tom uses the bathroom with a humorous animation.**

#### Acceptance Criteria [Final]
- AC-7.3.1: A Pee icon (🚽) button is visible in the lifestyle panel at all times.
- AC-7.3.2: Tapping Pee while IDLE triggers the PEEING animation and transitions state to PEEING.
- AC-7.3.3: A CSS steam overlay animates for ~3 seconds.
- AC-7.3.4: After the clip ends Tom returns to IDLE; Pee button enters a 30-second cooldown.
- AC-7.3.5: Tapping Pee while in a non-IDLE state has no effect.

### US-7.4 — Sleep
**As a user, I want to tap the Sleep button so that Tom falls asleep with Zzz bubbles, and I can wake him by tapping.**

#### Acceptance Criteria [Final]
- AC-7.4.1: A Sleep icon (🛏️) button is visible in the lifestyle panel at all times.
- AC-7.4.2: Tapping Sleep while IDLE triggers the SLEEPING animation (loops) and transitions state to SLEEPING.
- AC-7.4.3: Floating Zzz CSS bubbles animate upward from Tom's head during SLEEPING.
- AC-7.4.4: After the clip loop ends (or after 6s) Tom returns to IDLE; Sleep button enters a 30-second cooldown.
- AC-7.4.5: While SLEEPING, tapping the canvas wakes Tom early (returns to IDLE immediately, no cooldown penalty).

---

## 3. UI Specification — Lifestyle Action Panel

- Fixed horizontal strip pinned above the mic button row.
- Four equal-width buttons: Bath | Food | Pee | Sleep.
- Each button: icon (emoji, 24px) + label below (10px, uppercase).
- States: **Idle** (full opacity), **Active** (pulsing ring), **Cooldown** (50% opacity + 30s CSS arc drain), **Blocked** (40% opacity).

---

## 4. Animation Clips (added to Tom.glb)

| Clip | Duration | Key Motion |
|------|----------|-----------|
| BATHING | 4.0s | Lean forward, sway L/R, head shake |
| EATING | 3.0s | Head dip, body bounce, tail wag |
| PEEING | 3.0s | Crouch, hold, shake, stand |
| SLEEPING | 4.0s (loop) | Head droop, slow breathing |

---

## 5. State Machine

```
IDLE ──[Bath]──► BATHING ──[4s]──► IDLE (30s cooldown)
IDLE ──[Food]──► EATING  ──[3s]──► IDLE (30s cooldown)
IDLE ──[Pee]───► PEEING  ──[3s]──► IDLE (30s cooldown)
IDLE ──[Sleep]─► SLEEPING ──[loops / canvas tap]──► IDLE (30s cooldown)
```

Non-IDLE state blocks all lifestyle button taps. Mic is disabled during lifestyle actions.

---

## 6. Out of Scope (Sprint 8)
- Hunger/hygiene/sleep stat meters
- Sound effects per action
- Persistent stat state across reloads

---

## 7. Dependencies
No new npm packages. Uses existing Three.js + SvelteKit + CSS animations.
