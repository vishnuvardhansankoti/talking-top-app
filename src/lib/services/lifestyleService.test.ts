import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { appState } from '$lib/stores';

// ─── Mock animationService ────────────────────────────────────────────────────
vi.mock('$lib/services/animationService', () => ({
	requestAnimation: vi.fn(),
	onAnimationFinished: vi.fn()
}));

vi.mock('./lifestyleAudioService', () => ({
	playLifestyleSound: vi.fn(),
	stopSleepSound: vi.fn()
}));

// ─── Import after mocks ───────────────────────────────────────────────────────
import {
	triggerLifestyleAction,
	wakeFromSleep,
	_resetLifestyleService
} from './lifestyleService';
import { requestAnimation, onAnimationFinished } from '$lib/services/animationService';
import { playLifestyleSound, stopSleepSound } from './lifestyleAudioService';

// ─── Reset state before each test ────────────────────────────────────────────
beforeEach(() => {
	vi.useFakeTimers();
	vi.mocked(requestAnimation).mockClear();
	vi.mocked(onAnimationFinished).mockClear();
	vi.mocked(playLifestyleSound).mockClear();
	vi.mocked(stopSleepSound).mockClear();
	_resetLifestyleService();
	appState.update((s) => ({
		...s,
		lifestyleAction: null,
		lifestyleCooldowns: { BATHING: 0, EATING: 0, PEEING: 0, SLEEPING: 0 }
	}));
});

afterEach(() => {
	vi.useRealTimers();
});

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('lifestyleService', () => {
	describe('triggerLifestyleAction', () => {
		it('requests animation and sets lifestyleAction when IDLE', () => {
			triggerLifestyleAction('BATHING');
			expect(requestAnimation).toHaveBeenCalledWith('BATHING');
			expect(playLifestyleSound).toHaveBeenCalledWith('bath');
			expect(get(appState).lifestyleAction).toBe('BATHING');
		});

		it('blocks if another lifestyle action is already active', () => {
			appState.update((s) => ({ ...s, lifestyleAction: 'EATING' }));
			triggerLifestyleAction('BATHING');
			expect(requestAnimation).not.toHaveBeenCalled();
		});

		it('finishes BATHING after 4s, returns to IDLE', () => {
			triggerLifestyleAction('BATHING');
			expect(get(appState).lifestyleAction).toBe('BATHING');

			vi.advanceTimersByTime(4000);

			expect(onAnimationFinished).toHaveBeenCalledTimes(1);
			const state = get(appState);
			expect(state.lifestyleAction).toBeNull();
		});

		it('finishes EATING after 3s', () => {
			triggerLifestyleAction('EATING');
			vi.advanceTimersByTime(3000);
			expect(get(appState).lifestyleAction).toBeNull();
		});

		it('finishes PEEING after 3s', () => {
			triggerLifestyleAction('PEEING');
			vi.advanceTimersByTime(3000);
			expect(get(appState).lifestyleAction).toBeNull();
		});

		it('plays flush sound when PEEING finishes', () => {
			triggerLifestyleAction('PEEING');
			vi.advanceTimersByTime(3000);
			expect(playLifestyleSound).toHaveBeenCalledWith('pee');
			expect(playLifestyleSound).toHaveBeenCalledWith('flush');
		});

		it('finishes SLEEPING after 6s', () => {
			triggerLifestyleAction('SLEEPING');
			vi.advanceTimersByTime(6_000);
			expect(onAnimationFinished).toHaveBeenCalledTimes(1);
			expect(get(appState).lifestyleAction).toBeNull();
		});
	});

	describe('wakeFromSleep', () => {
		it('wakes Tom from SLEEPING, returns to IDLE', () => {
			appState.update((s) => ({ ...s, lifestyleAction: 'SLEEPING' }));
			wakeFromSleep();
			expect(onAnimationFinished).toHaveBeenCalledTimes(1);
			expect(get(appState).lifestyleAction).toBeNull();
		});

		it('does NOT start cooldown on early wake (AC-7.4.5)', () => {
			appState.update((s) => ({ ...s, lifestyleAction: 'SLEEPING' }));
			wakeFromSleep();
			expect(get(appState).lifestyleCooldowns.SLEEPING).toBe(0);
		});

		it('is a no-op when Tom is not SLEEPING', () => {
			wakeFromSleep();
			expect(onAnimationFinished).not.toHaveBeenCalled();
		});

		it('is a no-op when Tom is in a different lifestyle action', () => {
			appState.update((s) => ({ ...s, lifestyleAction: 'BATHING' }));
			wakeFromSleep();
			expect(onAnimationFinished).not.toHaveBeenCalled();
		});
	});
});
