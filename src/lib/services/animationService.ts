/**
 * Animation State Machine Service (US-3D06)
 *
 * 6 states: IDLE / LISTENING / SPEAKING / REACTING_POKE / REACTING_PET / REACTING_HOLD
 * Priority: SPEAKING(4) > LISTENING(3) > REACTING_*(2) > IDLE(1)
 * Max 2-item FIFO queue. 250ms crossfade blend. Emergency fallback to IDLE.
 */

import type { AnimationName, AnimationStateName } from '$lib/types';
import { ANIMATION_PRIORITY } from '$lib/types';
import { animationState } from '$lib/stores';
import type { AnimationAction, AnimationMixer } from 'three';

const BLEND_DURATION_MS = 250;
const MAX_QUEUE_SIZE = 2;

export interface AnimationServiceOptions {
	mixer: AnimationMixer;
	actions: Record<AnimationName, AnimationAction>;
	onStateChange?: (state: AnimationStateName) => void;
}

let _mixer: AnimationMixer | null = null;
let _actions: Record<AnimationName, AnimationAction> | null = null;
let _currentAction: AnimationAction | null = null;
let _onStateChange: ((state: AnimationStateName) => void) | null = null;
let _blendTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Initialize the service with a Three.js AnimationMixer and actions map.
 * Must be called once after the GLTF model is loaded.
 */
export function initAnimationService(options: AnimationServiceOptions): void {
	_mixer = options.mixer;
	_actions = options.actions;
	_onStateChange = options.onStateChange ?? null;

	// Start IDLE
	const idleAction = _actions['IDLE'];
	idleAction.reset().fadeIn(0).play();
	_currentAction = idleAction;

	animationState.update((s) => ({
		...s,
		current: 'IDLE',
		previous: null,
		queue: [],
		blending: false,
		locked: false
	}));
}

/**
 * Request a transition to the given animation state.
 * Higher-priority requests preempt lower-priority ones.
 * Lower-priority requests are queued (max 2 items FIFO).
 */
export function requestAnimation(target: AnimationStateName): void {
	if (!_actions) return;

	animationState.update((s) => {
		if (s.locked) return s;

		const targetPriority = ANIMATION_PRIORITY[target as AnimationName];
		const currentPriority = ANIMATION_PRIORITY[s.current as AnimationName];

		if (targetPriority >= currentPriority) {
			// Preempt current — transition immediately
			_transition(s.current, target);
			return { ...s, previous: s.current, current: target, blending: true, queue: [] };
		} else {
			// Lower priority — enqueue (FIFO, max 2)
			const queue = [...s.queue, target].slice(-MAX_QUEUE_SIZE);
			return { ...s, queue };
		}
	});
}

/**
 * Called by the animation loop (via useFrame / requestAnimationFrame) when
 * the current animation clip has finished. Dequeues next or falls back to IDLE.
 */
export function onAnimationFinished(): void {
	animationState.update((s) => {
		if (s.queue.length > 0) {
			const [next, ...rest] = s.queue;
			_transition(s.current, next);
			return { ...s, previous: s.current, current: next, blending: true, queue: rest };
		} else {
			// Return to IDLE
			_transition(s.current, 'IDLE');
			return { ...s, previous: s.current, current: 'IDLE', blending: true, queue: [] };
		}
	});
}

/**
 * Emergency fallback: resets to IDLE regardless of current state.
 * Locks the machine for 300ms to prevent rapid thrashing.
 */
export function emergencyFallback(): void {
	if (_blendTimeout) clearTimeout(_blendTimeout);

	animationState.update((s) => {
		_forceIdle();
		return { ...s, current: 'IDLE', previous: null, queue: [], blending: false, locked: true };
	});

	// Unlock after brief cooldown
	setTimeout(() => {
		animationState.update((s) => ({ ...s, locked: false }));
	}, 300);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _transition(from: AnimationStateName, to: AnimationStateName): void {
	if (!_actions) return;

	const fromAction = _actions[from as AnimationName];
	const toAction = _actions[to as AnimationName];

	if (!toAction) {
		emergencyFallback();
		return;
	}

	// Crossfade
	const isLooping = to === 'IDLE' || to === 'SLEEPING';
	toAction.reset().setLoop(isLooping ? 2201 /* LoopRepeat */ : 2200 /* LoopOnce */, Infinity);
	toAction.clampWhenFinished = to !== 'IDLE';

	if (fromAction && fromAction !== toAction) {
		fromAction.crossFadeTo(toAction, BLEND_DURATION_MS / 1000, true);
	} else {
		toAction.fadeIn(BLEND_DURATION_MS / 1000);
	}
	toAction.play();
	_currentAction = toAction;

	if (_blendTimeout) clearTimeout(_blendTimeout);
	_blendTimeout = setTimeout(() => {
		animationState.update((s) => ({ ...s, blending: false }));
		_onStateChange?.(to);
	}, BLEND_DURATION_MS);
}

function _forceIdle(): void {
	if (!_actions) return;
	const idleAction = _actions['IDLE'];
	if (!idleAction) return;

	// Stop all, restart IDLE immediately
	Object.values(_actions).forEach((a) => a.stop());
	idleAction.reset().setLoop(2201, Infinity).fadeIn(0.05).play();
	_currentAction = idleAction;
}
