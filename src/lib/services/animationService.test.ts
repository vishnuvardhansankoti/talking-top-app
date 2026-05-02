import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { animationState } from '$lib/stores';
import {
	requestAnimation,
	onAnimationFinished,
	emergencyFallback,
	initAnimationService
} from './animationService';
import type { AnimationName } from '$lib/types';

// Minimal mock for Three.js AnimationAction + AnimationMixer
function makeAction(name: AnimationName) {
	return {
		reset: vi.fn().mockReturnThis(),
		play: vi.fn().mockReturnThis(),
		stop: vi.fn().mockReturnThis(),
		fadeIn: vi.fn().mockReturnThis(),
		crossFadeTo: vi.fn().mockReturnThis(),
		setLoop: vi.fn().mockReturnThis(),
		clampWhenFinished: false
	};
}

const mockActions = {
	IDLE: makeAction('IDLE'),
	LISTENING: makeAction('LISTENING'),
	SPEAKING: makeAction('SPEAKING'),
	REACTING_POKE: makeAction('REACTING_POKE'),
	REACTING_PET: makeAction('REACTING_PET'),
	REACTING_HOLD: makeAction('REACTING_HOLD')
};

const mockMixer = { update: vi.fn() } as unknown as import('three').AnimationMixer;

beforeEach(() => {
	vi.useFakeTimers();
	Object.values(mockActions).forEach((a) => vi.clearAllMocks());
	initAnimationService({
		mixer: mockMixer,
		actions: mockActions as unknown as Record<AnimationName, import('three').AnimationAction>
	});
});

describe('animationService', () => {
	it('initializes to IDLE state', () => {
		const state = get(animationState);
		expect(state.current).toBe('IDLE');
		expect(state.queue).toHaveLength(0);
		expect(state.locked).toBe(false);
	});

	it('transitions to SPEAKING (higher priority) immediately', () => {
		requestAnimation('SPEAKING');
		const state = get(animationState);
		expect(state.current).toBe('SPEAKING');
		expect(mockActions.SPEAKING.reset).toHaveBeenCalled();
		expect(mockActions.SPEAKING.play).toHaveBeenCalled();
	});

	it('queues lower-priority animations (max 2)', () => {
		// First get to SPEAKING so LISTENING and REACTING_POKE are lower
		requestAnimation('SPEAKING');
		requestAnimation('REACTING_POKE');
		requestAnimation('LISTENING');
		requestAnimation('REACTING_PET'); // should displace REACTING_POKE (FIFO, max 2)

		const state = get(animationState);
		expect(state.queue).toHaveLength(2);
	});

	it('returns to IDLE after animation finishes with empty queue', () => {
		requestAnimation('SPEAKING');
		onAnimationFinished();
		vi.runAllTimers();
		const state = get(animationState);
		expect(state.current).toBe('IDLE');
	});

	it('dequeues next animation when current finishes', () => {
		requestAnimation('SPEAKING');
		requestAnimation('REACTING_POKE'); // enqueued
		onAnimationFinished();
		vi.runAllTimers();
		const state = get(animationState);
		expect(state.current).toBe('REACTING_POKE');
	});

	it('emergencyFallback resets to IDLE and locks briefly', () => {
		requestAnimation('SPEAKING');
		emergencyFallback();
		const locked = get(animationState);
		expect(locked.current).toBe('IDLE');
		expect(locked.locked).toBe(true);

		vi.advanceTimersByTime(350);
		expect(get(animationState).locked).toBe(false);
	});

	it('ignores requests while locked', () => {
		requestAnimation('SPEAKING');
		emergencyFallback();
		requestAnimation('LISTENING');
		// Should still be IDLE since locked
		expect(get(animationState).current).toBe('IDLE');
	});
});
