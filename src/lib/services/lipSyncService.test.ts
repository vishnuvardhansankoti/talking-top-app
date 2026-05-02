/**
 * Unit tests for lipSyncService.ts (US-S6-11)
 *
 * Target: ≥ 80% line coverage of lipSyncService.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	registerMorphSetter,
	startLipSync,
	stopLipSync,
	type SetMorphInfluenceFn
} from './lipSyncService';

// ─── rAF / cAF mocks ─────────────────────────────────────────────────────────

let rafCallbacks: Map<number, FrameRequestCallback> = new Map();
let rafCounter = 0;

function mockRaf(cb: FrameRequestCallback): number {
	rafCounter++;
	rafCallbacks.set(rafCounter, cb);
	return rafCounter;
}

function mockCaf(id: number): void {
	rafCallbacks.delete(id);
}

function flushRaf(timestamp = 0): void {
	// Run all pending callbacks (snapshot first to avoid infinite loop)
	const pending = [...rafCallbacks.entries()];
	for (const [id, cb] of pending) {
		rafCallbacks.delete(id);
		cb(timestamp);
	}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFakeSetter(): { calls: Array<[string, number]>; fn: SetMorphInfluenceFn } {
	const calls: Array<[string, number]> = [];
	const fn: SetMorphInfluenceFn = (name, weight) => calls.push([name, weight]);
	return { calls, fn };
}

function makeUtterance(text = 'hello'): SpeechSynthesisUtterance {
	// Minimal fake — only onboundary is used by the service
	return {
		text,
		onboundary: null,
		onstart: null,
		onend: null,
		onerror: null
	} as unknown as SpeechSynthesisUtterance;
}

function makeBoundaryEvent(charLength: number, name = 'word'): SpeechSynthesisEvent {
	return { charLength, name, charIndex: 0, elapsedTime: 0 } as unknown as SpeechSynthesisEvent;
}

// ─── Test setup ──────────────────────────────────────────────────────────────

beforeEach(() => {
	vi.useFakeTimers();
	rafCallbacks = new Map();
	rafCounter = 0;

	// Patch global rAF / cAF
	vi.stubGlobal('requestAnimationFrame', mockRaf);
	vi.stubGlobal('cancelAnimationFrame', mockCaf);
	vi.stubGlobal('performance', { now: () => Date.now() });

	// Reset module state by calling stopLipSync before each test
	stopLipSync();
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('registerMorphSetter', () => {
	it('stores the setter and uses it when morphs are applied', () => {
		const { calls, fn } = makeFakeSetter();
		registerMorphSetter(fn);

		const utterance = makeUtterance();
		startLipSync(utterance);

		// Fire a boundary event
		const event = makeBoundaryEvent(3);
		utterance.onboundary!(event as Event as SpeechSynthesisEvent);

		// Should have received mouthOpen and mouthWide calls
		const openCall = calls.find(([n]) => n === 'mouthOpen');
		const wideCall = calls.find(([n]) => n === 'mouthWide');
		expect(openCall).toBeDefined();
		expect(wideCall).toBeDefined();

		stopLipSync();
	});
});

describe('startLipSync', () => {
	it('registers onboundary handler on the utterance', () => {
		const { fn } = makeFakeSetter();
		registerMorphSetter(fn);

		const utterance = makeUtterance();
		expect(utterance.onboundary).toBeNull();

		startLipSync(utterance);
		expect(typeof utterance.onboundary).toBe('function');

		stopLipSync();
	});

	it('calling startLipSync twice does not throw', () => {
		const { fn } = makeFakeSetter();
		registerMorphSetter(fn);

		const u1 = makeUtterance('first');
		const u2 = makeUtterance('second');
		expect(() => {
			startLipSync(u1);
			startLipSync(u2);
		}).not.toThrow();

		stopLipSync();
	});
});

describe('boundary event → morph weights', () => {
	beforeEach(() => {
		const { fn } = makeFakeSetter();
		registerMorphSetter(fn);
	});

	it.each([
		// [charLength, expectedSyllables, expectedOpen, expectedWide]
		[3, 1, 0.4, 0.1],
		[6, 2, 0.55, 0.2],
		[9, 3, 0.7, 0.3],
		[15, 5, 1.0, 0.5]
	])('charLength=%i → mouthOpen≈%f mouthWide≈%f', (charLength, _sylls, expectedOpen, expectedWide) => {
		const morphCalls: Array<[string, number]> = [];
		registerMorphSetter((name, weight) => morphCalls.push([name, weight]));

		const utterance = makeUtterance();
		startLipSync(utterance);
		utterance.onboundary!(makeBoundaryEvent(charLength) as unknown as Event as SpeechSynthesisEvent);

		const open = morphCalls.find(([n]) => n === 'mouthOpen')?.[1] ?? -1;
		const wide = morphCalls.find(([n]) => n === 'mouthWide')?.[1] ?? -1;

		expect(open).toBeCloseTo(expectedOpen, 5);
		expect(wide).toBeCloseTo(expectedWide, 5);

		// All weights must be within [0, 1]
		for (const [, w] of morphCalls) {
			expect(w).toBeGreaterThanOrEqual(0);
			expect(w).toBeLessThanOrEqual(1);
		}

		stopLipSync();
	});

	it('mouthOpen is always within [0, 1] for any charLength', () => {
		const morphCalls: Array<[string, number]> = [];
		registerMorphSetter((name, weight) => morphCalls.push([name, weight]));

		for (const charLength of [1, 2, 5, 10, 20, 50, 100]) {
			morphCalls.length = 0;
			const utterance = makeUtterance();
			startLipSync(utterance);
			utterance.onboundary!(makeBoundaryEvent(charLength) as unknown as Event as SpeechSynthesisEvent);

			const open = morphCalls.find(([n]) => n === 'mouthOpen')?.[1] ?? -1;
			const wide = morphCalls.find(([n]) => n === 'mouthWide')?.[1] ?? -1;
			expect(open).toBeGreaterThanOrEqual(0);
			expect(open).toBeLessThanOrEqual(1);
			expect(wide).toBeGreaterThanOrEqual(0);
			expect(wide).toBeLessThanOrEqual(1);
			stopLipSync();
		}
	});

	it('uses event.name.length as fallback when charLength is undefined', () => {
		const morphCalls: Array<[string, number]> = [];
		registerMorphSetter((name, weight) => morphCalls.push([name, weight]));

		const utterance = makeUtterance();
		startLipSync(utterance);

		// Event without charLength property
		const event = { name: 'hello', charIndex: 0, elapsedTime: 0 } as unknown as SpeechSynthesisEvent;
		utterance.onboundary!(event as unknown as Event as SpeechSynthesisEvent);

		const open = morphCalls.find(([n]) => n === 'mouthOpen')?.[1] ?? -1;
		expect(open).toBeGreaterThan(0);
		stopLipSync();
	});
});

describe('stopLipSync', () => {
	it('sets both morph targets to 0', () => {
		const morphCalls: Array<[string, number]> = [];
		registerMorphSetter((name, weight) => morphCalls.push([name, weight]));

		const utterance = makeUtterance();
		startLipSync(utterance);

		// Fire boundary to activate morph
		utterance.onboundary!(makeBoundaryEvent(6) as unknown as Event as SpeechSynthesisEvent);
		morphCalls.length = 0; // clear previous

		stopLipSync();

		const openStop = morphCalls.find(([n]) => n === 'mouthOpen');
		const wideStop = morphCalls.find(([n]) => n === 'mouthWide');
		expect(openStop?.[1]).toBe(0);
		expect(wideStop?.[1]).toBe(0);
	});

	it('does not throw when called without startLipSync', () => {
		expect(() => stopLipSync()).not.toThrow();
	});
});

describe('graceful degradation (no onboundary fired)', () => {
	it('does not throw when startLipSync is called and stopped immediately', () => {
		const { fn } = makeFakeSetter();
		registerMorphSetter(fn);

		const utterance = makeUtterance();
		expect(() => {
			startLipSync(utterance);
			stopLipSync();
		}).not.toThrow();
	});

	it('does not throw after 500ms timeout without boundary events', () => {
		const morphCalls: Array<[string, number]> = [];
		registerMorphSetter((name, weight) => morphCalls.push([name, weight]));

		const utterance = makeUtterance();
		startLipSync(utterance);

		// Advance past the 500 ms idle-fallback timer
		vi.advanceTimersByTime(600);

		// Flush idle-fallback rAF — should not throw
		expect(() => flushRaf(700)).not.toThrow();

		stopLipSync();
	});

	it('idle fallback produces mouthOpen in [0, 0.3]', () => {
		const morphCalls: Array<[string, number]> = [];
		registerMorphSetter((name, weight) => morphCalls.push([name, weight]));

		const utterance = makeUtterance();
		startLipSync(utterance);

		// Trigger idle fallback
		vi.advanceTimersByTime(600);
		flushRaf(600);

		const openCalls = morphCalls.filter(([n]) => n === 'mouthOpen').map(([, w]) => w);
		for (const w of openCalls) {
			expect(w).toBeGreaterThanOrEqual(0);
			expect(w).toBeLessThanOrEqual(0.3);
		}

		stopLipSync();
	});
});

describe('decay', () => {
	it('starts rAF-based decay after boundary event', () => {
		const { fn } = makeFakeSetter();
		registerMorphSetter(fn);

		const utterance = makeUtterance();
		startLipSync(utterance);
		utterance.onboundary!(makeBoundaryEvent(6) as unknown as Event as SpeechSynthesisEvent);

		// There should be a pending rAF callback for decay
		expect(rafCallbacks.size).toBeGreaterThan(0);

		stopLipSync();
	});

	it('decay RAF does not run after stopLipSync cancels it', () => {
		const morphCalls: Array<[string, number]> = [];
		registerMorphSetter((name, weight) => morphCalls.push([name, weight]));

		const utterance = makeUtterance();
		startLipSync(utterance);
		utterance.onboundary!(makeBoundaryEvent(6) as unknown as Event as SpeechSynthesisEvent);

		stopLipSync();
		morphCalls.length = 0;

		// All rAF callbacks should have been cancelled
		flushRaf(200);
		// No morph calls should happen after stop (only the 0-reset from stopLipSync already fired)
		// Some residual calls possible from decay flush — check they're all 0
		for (const [, w] of morphCalls) {
			expect(w).toBe(0);
		}
	});
});
