<script lang="ts">
	/**
	 * GestureLayer — Transparent overlay for touch/pointer gestures (US-T05)
	 *
	 * Covers the canvas and translates pointer events into GestureEvents
	 * via gestureService, which drives the animation state machine.
	 */
	import { onMount, onDestroy } from 'svelte';
	import { attachGestureHandlers, onGesture } from '$lib/services/gestureService';
	import { requestAnimation } from '$lib/services/animationService';
	import { wakeFromSleep } from '$lib/services/lifestyleService';
	import type { GestureEvent } from '$lib/types';
	import { appState } from '$lib/stores';

	let overlayEl: HTMLDivElement;
	let cleanupHandlers: () => void;
	let cleanupGesture: () => void;

	onMount(() => {
		cleanupHandlers = attachGestureHandlers(overlayEl);
		cleanupGesture = onGesture(handleGesture);
	});

	onDestroy(() => {
		cleanupHandlers?.();
		cleanupGesture?.();
	});

	function handleGesture(event: GestureEvent) {
		// AC-7.4.5: canvas tap wakes Tom from sleep
		if ($appState.lifestyleAction === 'SLEEPING') {
			wakeFromSleep();
			return;
		}

		// Block gestures during other lifestyle actions
		if ($appState.lifestyleAction !== null) return;

		// Haptic feedback if enabled
		if ($appState.settings.hapticFeedback && navigator.vibrate) {
			navigator.vibrate(event.type === 'hold' ? [50, 30, 50] : 30);
		}

		switch (event.type) {
			case 'poke':
				requestAnimation('REACTING_POKE');
				break;
			case 'pet':
				requestAnimation('REACTING_PET');
				break;
			case 'hold':
				requestAnimation('REACTING_HOLD');
				break;
		}
	}
</script>

<div
	bind:this={overlayEl}
	class="gesture-layer"
	role="presentation"
	aria-hidden="true"
></div>

<style>
	.gesture-layer {
		position: absolute;
		inset: 0;
		cursor: pointer;
		touch-action: none;
		-webkit-user-select: none;
		user-select: none;
	}
</style>
