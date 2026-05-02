/**
 * lifestyleAudioService.ts — Sprint 8
 *
 * Plays sound effects for lifestyle actions (Bath, Food, Pee, Sleep).
 * Strategy: fetch mp3 from static/audio/ first; fall back to Web Audio API
 * oscillator if file is absent or fetch fails. All errors are swallowed silently.
 *
 * SSG-safe: AudioContext is lazily initialized — never constructed at module
 * load time or during the SvelteKit static build.
 */

import type { LifestyleSound } from '$lib/types';

// ─── Oscillator fallback parameters ──────────────────────────────────────────

const OSCILLATOR_PARAMS: Record<
	LifestyleSound,
	{ frequency: number; type: OscillatorType; duration: number; loop: boolean }
> = {
	bath: { frequency: 440, type: 'sine', duration: 1.5, loop: false },
	food: { frequency: 660, type: 'sine', duration: 0.8, loop: false },
	pee: { frequency: 330, type: 'triangle', duration: 2.0, loop: false },
	sleep: { frequency: 200, type: 'sine', duration: 0, loop: true },
	flush: { frequency: 180, type: 'triangle', duration: 1.2, loop: false }
};

const AUDIO_FILE_MAP: Record<LifestyleSound, string> = {
	bath: '/audio/bath-splash.wav',
	food: '/audio/food-crunch.wav',
	pee: '/audio/pee-stream.wav',
	sleep: '/audio/sleep-snore.wav',
	flush: '/audio/toilet-flush.wav'
};

// ─── Internal state ───────────────────────────────────────────────────────────

let _ctx: AudioContext | null = null;
let _sleepOscillator: OscillatorNode | null = null;
let _sleepGain: GainNode | null = null;
let _sleepBufferSource: AudioBufferSourceNode | null = null;

// ─── Private helpers ──────────────────────────────────────────────────────────

function getAudioContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	try {
		if (!_ctx || _ctx.state === 'closed') {
			_ctx = new AudioContext();
		}
		return _ctx;
	} catch {
		return null;
	}
}

function playOscillator(sound: LifestyleSound): void {
	const ctx = getAudioContext();
	if (!ctx) return;

	try {
		const params = OSCILLATOR_PARAMS[sound];
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = params.type;
		osc.frequency.setValueAtTime(params.frequency, ctx.currentTime);
		gain.gain.setValueAtTime(0.3, ctx.currentTime);
		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start();

		if (params.loop) {
			_sleepOscillator = osc;
			_sleepGain = gain;
		} else {
			gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + params.duration);
			osc.stop(ctx.currentTime + params.duration + 0.05);
		}
	} catch {
		// Swallow all oscillator errors
	}
}

async function playWithFallback(sound: LifestyleSound): Promise<void> {
	const ctx = getAudioContext();
	if (!ctx) return;

	try {
		const resp = await fetch(AUDIO_FILE_MAP[sound]);
		if (!resp.ok) throw new Error('file not found');
		const arrayBuffer = await resp.arrayBuffer();
		const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
		const source = ctx.createBufferSource();
		source.buffer = audioBuffer;
		source.connect(ctx.destination);

		if (sound === 'sleep') {
			source.loop = true;
			_sleepBufferSource = source;
		}

		source.start();
	} catch {
		// File unavailable or decode failed — use oscillator fallback
		playOscillator(sound);
	}
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function playLifestyleSound(sound: LifestyleSound): void {
	playWithFallback(sound).catch(() => {});
}

export function stopSleepSound(): void {
	try {
		_sleepOscillator?.stop();
	} catch {
		// Already stopped — ignore
	}
	_sleepOscillator = null;
	_sleepGain = null;

	try {
		_sleepBufferSource?.stop();
	} catch {
		// Already stopped — ignore
	}
	_sleepBufferSource = null;
}

export function disposeAudio(): void {
	stopSleepSound();
	try {
		_ctx?.close();
		_ctx = null;
	} catch {
		// Ignore
	}
}

/** Reset internal state (used in tests). */
export function _resetLifestyleAudioService(): void {
	_sleepOscillator = null;
	_sleepGain = null;
	_sleepBufferSource = null;
	_ctx = null;
}
