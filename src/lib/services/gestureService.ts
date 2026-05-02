/**
 * Gesture Service (US-T05)
 *
 * Detects poke, pet (swipe), and hold gestures from touch/mouse events
 * and maps them to GestureEvents consumed by the animation state machine.
 */

import type { GestureEvent, GestureType } from '$lib/types';

const HOLD_DURATION_MS = 600; // ms to qualify as a hold
const PET_MIN_DISTANCE_PX = 30; // minimum swipe distance for a pet

interface PointerSnapshot {
	x: number;
	y: number;
	time: number;
	holdTimer: ReturnType<typeof setTimeout> | null;
}

let _snapshot: PointerSnapshot | null = null;
let _listeners: Array<(event: GestureEvent) => void> = [];

/** Register a listener for gesture events. Returns an unsubscribe function. */
export function onGesture(handler: (event: GestureEvent) => void): () => void {
	_listeners.push(handler);
	return () => {
		_listeners = _listeners.filter((h) => h !== handler);
	};
}

/** Attach pointer event handlers to a DOM element. Returns a cleanup function. */
export function attachGestureHandlers(el: HTMLElement): () => void {
	el.addEventListener('pointerdown', _onDown);
	el.addEventListener('pointerup', _onUp);
	el.addEventListener('pointermove', _onMove);
	el.addEventListener('pointercancel', _cancel);

	return () => {
		el.removeEventListener('pointerdown', _onDown);
		el.removeEventListener('pointerup', _onUp);
		el.removeEventListener('pointermove', _onMove);
		el.removeEventListener('pointercancel', _cancel);
		_cancel();
	};
}

// ─── Internal handlers ────────────────────────────────────────────────────────

function _onDown(e: PointerEvent): void {
	_snapshot = {
		x: e.clientX,
		y: e.clientY,
		time: Date.now(),
		holdTimer: setTimeout(() => {
			if (_snapshot) {
				_emit('hold', _snapshot.x, _snapshot.y, e);
				_snapshot = null;
			}
		}, HOLD_DURATION_MS)
	};
}

function _onMove(e: PointerEvent): void {
	if (!_snapshot) return;
	const dx = e.clientX - _snapshot.x;
	const dy = e.clientY - _snapshot.y;
	const dist = Math.sqrt(dx * dx + dy * dy);
	if (dist > PET_MIN_DISTANCE_PX) {
		// Cancel hold timer — movement means it's a pet/swipe
		if (_snapshot.holdTimer) clearTimeout(_snapshot.holdTimer);
		_snapshot.holdTimer = null;
	}
}

function _onUp(e: PointerEvent): void {
	if (!_snapshot) return;

	const dx = e.clientX - _snapshot.x;
	const dy = e.clientY - _snapshot.y;
	const dist = Math.sqrt(dx * dx + dy * dy);

	if (_snapshot.holdTimer) clearTimeout(_snapshot.holdTimer);

	if (dist >= PET_MIN_DISTANCE_PX) {
		_emit('pet', e.clientX, e.clientY, e);
	} else {
		_emit('poke', e.clientX, e.clientY, e);
	}

	_snapshot = null;
}

function _cancel(): void {
	if (_snapshot?.holdTimer) clearTimeout(_snapshot.holdTimer);
	_snapshot = null;
}

function _emit(type: GestureType, clientX: number, clientY: number, e: PointerEvent): void {
	const rect = (e.target as HTMLElement)?.getBoundingClientRect?.();
	const x = rect ? (clientX - rect.left) / rect.width : 0.5;
	const y = rect ? (clientY - rect.top) / rect.height : 0.5;

	const event: GestureEvent = { type, x, y, timestamp: Date.now() };
	_listeners.forEach((h) => h(event));
}
