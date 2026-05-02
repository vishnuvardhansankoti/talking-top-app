/**
 * lifestyleService.ts — Sprint 7
 *
 * Manages lifestyle actions: BATHING, EATING, PEEING, SLEEPING.
 * Coordinates animation requests, cooldown timers, and appState updates.
 */

import { get } from 'svelte/store';
import { appState } from '$lib/stores';
import { requestAnimation, onAnimationFinished } from './animationService';
import { playLifestyleSound, stopSleepSound } from './lifestyleAudioService';
import type { LifestyleActionName } from '$lib/types';

const ACTION_TO_SOUND: Record<LifestyleActionName, 'bath' | 'food' | 'pee' | 'sleep'> = {
	BATHING: 'bath',
	EATING: 'food',
	PEEING: 'pee',
	SLEEPING: 'sleep'
};

const CLIP_DURATION_MS: Record<LifestyleActionName, number> = {
	BATHING: 4000,
	EATING: 3000,
	PEEING: 3000,
	SLEEPING: 6000 // auto-finish quickly to avoid indefinite sleep state
};

export const LIFESTYLE_COOLDOWN_MS = 30_000;

let _actionTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Trigger a lifestyle action. No-op if:
 *  - another lifestyle action is already running
 *  - the button is on cooldown
 */
export function triggerLifestyleAction(action: LifestyleActionName): void {
	const state = get(appState);

	if (state.lifestyleAction !== null) return;
	if (state.lifestyleCooldowns[action] > Date.now()) return;

	requestAnimation(action);
	playLifestyleSound(ACTION_TO_SOUND[action]);
	appState.update((s) => ({ ...s, lifestyleAction: action }));

	const duration = CLIP_DURATION_MS[action];
	if (duration > 0) {
		if (_actionTimer) clearTimeout(_actionTimer);
		_actionTimer = setTimeout(() => _finishLifestyleAction(action), duration);
	}
}

/**
 * Wake Tom from sleep early. No-op if Tom is not SLEEPING.
 * Does NOT start a cooldown (per AC-7.4.5).
 */
export function wakeFromSleep(): void {
	const state = get(appState);
	if (state.lifestyleAction !== 'SLEEPING') return;
	if (_actionTimer) {
		clearTimeout(_actionTimer);
		_actionTimer = null;
	}

	stopSleepSound();
	onAnimationFinished();
	appState.update((s) => ({ ...s, lifestyleAction: null }));
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function _finishLifestyleAction(action: LifestyleActionName): void {
	_actionTimer = null;
	if (action === 'SLEEPING') stopSleepSound();
	if (action === 'PEEING') playLifestyleSound('flush');
	onAnimationFinished();
	appState.update((s) => ({
		...s,
		lifestyleAction: null,
		lifestyleCooldowns: {
			...s.lifestyleCooldowns,
			[action]: Date.now() + LIFESTYLE_COOLDOWN_MS
		}
	}));
}

/** Reset all state (used in tests). */
export function _resetLifestyleService(): void {
	if (_actionTimer) {
		clearTimeout(_actionTimer);
		_actionTimer = null;
	}
}
