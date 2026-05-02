import { writable } from 'svelte/store';
import type { AnimationState } from '$lib/types';

const initialAnimationState: AnimationState = {
	current: 'IDLE',
	previous: null,
	queue: [],
	blending: false,
	locked: false
};

export const animationState = writable<AnimationState>(initialAnimationState);
