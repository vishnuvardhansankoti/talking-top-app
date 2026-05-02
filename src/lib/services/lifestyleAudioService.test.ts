/**
 * lifestyleAudioService.test.ts — Sprint 8
 *
 * Tests for the lifestyle audio service.
 * Uses vi.stubGlobal to mock AudioContext in jsdom.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── AudioContext mock setup ──────────────────────────────────────────────────

const mockOscStart = vi.fn();
const mockOscStop = vi.fn();
const mockConnect = vi.fn();
const mockGainSetValue = vi.fn();
const mockGainRamp = vi.fn();
const mockDecodeAudioData = vi.fn();
const mockCtxClose = vi.fn();
const mockBufferSourceStart = vi.fn();
const mockBufferSourceStop = vi.fn();

function makeMockAudioContext() {
	return {
		state: 'running',
		currentTime: 0,
		destination: {},
		createOscillator: vi.fn(() => ({
			type: '' as OscillatorType,
			frequency: { setValueAtTime: vi.fn() },
			connect: mockConnect,
			start: mockOscStart,
			stop: mockOscStop
		})),
		createGain: vi.fn(() => ({
			gain: {
				setValueAtTime: mockGainSetValue,
				exponentialRampToValueAtTime: mockGainRamp
			},
			connect: mockConnect
		})),
		createBufferSource: vi.fn(() => ({
			buffer: null,
			loop: false,
			connect: mockConnect,
			start: mockBufferSourceStart,
			stop: mockBufferSourceStop
		})),
		decodeAudioData: mockDecodeAudioData,
		close: mockCtxClose
	};
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('lifestyleAudioService', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default: fetch fails so oscillator path runs
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: false, arrayBuffer: vi.fn() })
		);

		vi.stubGlobal('AudioContext', vi.fn().mockImplementation(makeMockAudioContext));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	async function importFresh() {
		vi.resetModules();
		const mod = await import('./lifestyleAudioService');
		mod._resetLifestyleAudioService();
		return mod;
	}

	it('play bath: creates oscillator with sine type and 440 Hz', async () => {
		const { playLifestyleSound } = await importFresh();
		playLifestyleSound('bath');
		// Allow microtask queue to flush
		await new Promise((r) => setTimeout(r, 0));

		const ctx = (globalThis.AudioContext as ReturnType<typeof vi.fn>).mock.results[0]?.value;
		expect(ctx?.createOscillator).toHaveBeenCalled();
		const osc = ctx?.createOscillator.mock.results[0]?.value;
		expect(osc?.type).toBe('sine');
		expect(osc?.frequency.setValueAtTime).toHaveBeenCalledWith(440, expect.any(Number));
	});

	it('play food: creates oscillator with sine type and 660 Hz', async () => {
		const { playLifestyleSound } = await importFresh();
		playLifestyleSound('food');
		await new Promise((r) => setTimeout(r, 0));

		const ctx = (globalThis.AudioContext as ReturnType<typeof vi.fn>).mock.results[0]?.value;
		const osc = ctx?.createOscillator.mock.results[0]?.value;
		expect(osc?.type).toBe('sine');
		expect(osc?.frequency.setValueAtTime).toHaveBeenCalledWith(660, expect.any(Number));
	});

	it('play pee: creates oscillator with triangle type and 330 Hz', async () => {
		const { playLifestyleSound } = await importFresh();
		playLifestyleSound('pee');
		await new Promise((r) => setTimeout(r, 0));

		const ctx = (globalThis.AudioContext as ReturnType<typeof vi.fn>).mock.results[0]?.value;
		const osc = ctx?.createOscillator.mock.results[0]?.value;
		expect(osc?.type).toBe('triangle');
		expect(osc?.frequency.setValueAtTime).toHaveBeenCalledWith(330, expect.any(Number));
	});

	it('play flush: creates oscillator with triangle type and 180 Hz', async () => {
		const { playLifestyleSound } = await importFresh();
		playLifestyleSound('flush');
		await new Promise((r) => setTimeout(r, 0));

		const ctx = (globalThis.AudioContext as ReturnType<typeof vi.fn>).mock.results[0]?.value;
		const osc = ctx?.createOscillator.mock.results[0]?.value;
		expect(osc?.type).toBe('triangle');
		expect(osc?.frequency.setValueAtTime).toHaveBeenCalledWith(180, expect.any(Number));
	});

	it('play sleep: calls osc.start() but NOT osc.stop() (looping)', async () => {
		const { playLifestyleSound } = await importFresh();
		playLifestyleSound('sleep');
		await new Promise((r) => setTimeout(r, 0));

		expect(mockOscStart).toHaveBeenCalled();
		expect(mockOscStop).not.toHaveBeenCalled();
	});

	it('stopSleep: calls osc.stop() on the stored sleep oscillator', async () => {
		const { playLifestyleSound, stopSleepSound } = await importFresh();
		playLifestyleSound('sleep');
		await new Promise((r) => setTimeout(r, 0));

		stopSleepSound();
		expect(mockOscStop).toHaveBeenCalled();
	});

	it('stopSleep when no sleep active: does not throw', async () => {
		const { stopSleepSound } = await importFresh();
		expect(() => stopSleepSound()).not.toThrow();
	});

	it('dispose: calls ctx.close()', async () => {
		const { playLifestyleSound, disposeAudio } = await importFresh();
		playLifestyleSound('bath');
		await new Promise((r) => setTimeout(r, 0));

		disposeAudio();
		expect(mockCtxClose).toHaveBeenCalled();
	});

	it('play is a no-op when window is undefined', async () => {
		const savedWindow = globalThis.window;
		// @ts-expect-error — intentionally deleting window for SSG simulation
		delete globalThis.window;

		try {
			const { playLifestyleSound } = await importFresh();
			expect(() => playLifestyleSound('bath')).not.toThrow();
		} finally {
			globalThis.window = savedWindow;
		}
	});

	it('play swallows error if AudioContext constructor throws', async () => {
		vi.stubGlobal(
			'AudioContext',
			vi.fn().mockImplementation(() => {
				throw new Error('AudioContext not supported');
			})
		);
		const { playLifestyleSound } = await importFresh();
		await expect(async () => {
			playLifestyleSound('bath');
			await new Promise((r) => setTimeout(r, 10));
		}).not.toThrow();
	});

	it('fetch fail: oscillator fallback executes (osc.start called)', async () => {
		// fetch fails by default in beforeEach
		const { playLifestyleSound } = await importFresh();
		playLifestyleSound('food');
		await new Promise((r) => setTimeout(r, 0));

		expect(mockOscStart).toHaveBeenCalled();
	});

	it('fetch success: decodeAudioData is called, no oscillator fallback', async () => {
		const fakeBuffer = new ArrayBuffer(8);
		const fakeAudioBuffer = {};
		mockDecodeAudioData.mockResolvedValue(fakeAudioBuffer);

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				arrayBuffer: vi.fn().mockResolvedValue(fakeBuffer)
			})
		);

		const { playLifestyleSound } = await importFresh();
		playLifestyleSound('bath');
		await new Promise((r) => setTimeout(r, 10));

		const ctx = (globalThis.AudioContext as ReturnType<typeof vi.fn>).mock.results[0]?.value;
		expect(ctx?.decodeAudioData).toHaveBeenCalledWith(fakeBuffer);
		expect(mockOscStart).not.toHaveBeenCalled();
	});
});
