/**
 * Synthesis Service (US-V01, US-V03)
 *
 * Wraps the Web Speech API SpeechSynthesis to produce Tom's signature
 * "funny voice" — high pitch, slightly faster rate — when repeating the
 * user's words. Gracefully degrades when the API is unavailable.
 *
 * Voice profile (Tom):
 *   pitch: 2.0  (max chipmunk)
 *   rate:  1.09 (about 5% slower than previous pace)
 *   volume: respects app volume setting
 *
 * Integration:
 *   1. Call speakTranscript(text, settings) right after stopRecording()
 *   2. It emits animationService.requestAnimation('SPEAKING') before speaking
 *   3. On end/error it emits requestAnimation('IDLE')
 */

import { audioState } from '$lib/stores';
import { requestAnimation } from '$lib/services/animationService';
import { registerMorphSetter, startLipSync, stopLipSync } from '$lib/services/lipSyncService';
import type { SetMorphInfluenceFn } from '$lib/services/lipSyncService';

const SPEECH_START_TIMEOUT_MS = 1500;
const SPEECH_MIN_TIMEOUT_MS = 4000;
const SPEECH_MAX_TIMEOUT_MS = 18000;

function isIOSChrome(): boolean {
	if (typeof navigator === 'undefined') return false;
	const ua = navigator.userAgent || '';
	return /iP(hone|ad|od)/i.test(ua) && /CriOS/i.test(ua);
}

/** Stores the morph-influence setter registered by TomCharacter. */
let _morphInfluenceFn: SetMorphInfluenceFn | null = null;

function getSynthesis(): SpeechSynthesis | null {
	return typeof window !== 'undefined' ? (window.speechSynthesis ?? null) : null;
}

function estimateSpeechTimeoutMs(text: string): number {
	const estimated = 1000 + text.length * 120;
	return Math.max(SPEECH_MIN_TIMEOUT_MS, Math.min(SPEECH_MAX_TIMEOUT_MS, estimated));
}

/**
 * Register the morph-influence callback from TomCharacter.
 * Called once the GLTF head mesh is ready.
 */
export function setMorphInfluenceCallback(fn: SetMorphInfluenceFn): void {
	_morphInfluenceFn = fn;
	registerMorphSetter(fn);
}

/** Returns true if SpeechSynthesis is available in the current browser. */
export function isSpeechSynthesisSupported(): boolean {
	return Boolean(getSynthesis()) && typeof SpeechSynthesisUtterance !== 'undefined';
}

/**
 * Speak `text` with Tom's funny-voice profile.
 *
 * @param text     The transcript to speak (empty string is a no-op).
 * @param options  Override pitch, rate, volume. Defaults to Tom's profile.
 * @returns        A Promise that resolves when speech ends (or if API unavailable).
 */
export function speakTranscript(
	text: string,
	options: { pitch?: number; rate?: number; volume?: number } = {}
): Promise<boolean> {
	const synth = getSynthesis();

	if (!isSpeechSynthesisSupported() || !text.trim()) {
		return Promise.resolve(false);
	}

	// Cancel any current speech before starting
	synth!.cancel();
	synth!.resume?.();

	return new Promise((resolve) => {
		const utterance = new SpeechSynthesisUtterance(text);
		let started = false;
		let settled = false;
		let startTimeout: ReturnType<typeof setTimeout> | null = null;
		let endTimeout: ReturnType<typeof setTimeout> | null = null;

		const clearTimers = () => {
			if (startTimeout) {
				clearTimeout(startTimeout);
				startTimeout = null;
			}
			if (endTimeout) {
				clearTimeout(endTimeout);
				endTimeout = null;
			}
		};

		const finish = (ok: boolean) => {
			if (settled) return;
			settled = true;
			clearTimers();
			audioState.update((s) => ({ ...s, isPlaying: false }));
			stopLipSync();
			requestAnimation('IDLE');
			resolve(ok);
		};

		// Tom's voice profile — chipmunk-high pitch, energetic pace
		utterance.pitch = Math.min(2, Math.max(0, options.pitch ?? 2.0));
		utterance.rate = Math.min(2, Math.max(0.1, options.rate ?? 1.09));
		utterance.volume = Math.min(1, Math.max(0, options.volume ?? 1.0));
		utterance.lang = 'en-US';

		// Prefer a higher-pitched built-in voice when available
		const voices = synth!.getVoices();
		const preferred = voices.find(
			(v) =>
				v.lang.startsWith('en') &&
				(v.name.toLowerCase().includes('samantha') ||
					v.name.toLowerCase().includes('karen') ||
					v.name.toLowerCase().includes('zira'))
		);
		if (preferred) utterance.voice = preferred;

		utterance.onstart = () => {
			started = true;
			if (startTimeout) {
				clearTimeout(startTimeout);
				startTimeout = null;
			}
			if (_morphInfluenceFn) {
				// Start lip sync only when speech actually starts to reduce A/V drift on iOS.
				startLipSync(utterance, {
					fallbackDelayMs: isIOSChrome() ? 0 : 120,
					kickoff: true
				});
			}
			audioState.update((s) => ({ ...s, isPlaying: true }));
			requestAnimation('SPEAKING');
		};

		utterance.onend = () => {
			finish(started);
		};

		utterance.onerror = () => {
			finish(false);
		};

		startTimeout = setTimeout(() => {
			synth!.cancel();
			finish(false);
		}, SPEECH_START_TIMEOUT_MS);

		endTimeout = setTimeout(() => {
			synth!.cancel();
			finish(false);
		}, estimateSpeechTimeoutMs(text));

		synth!.speak(utterance);
	});
}

/** Cancel any in-progress speech immediately. */
export function cancelSpeech(): void {
	getSynthesis()?.cancel();
	audioState.update((s) => ({ ...s, isPlaying: false }));
}

/**
 * Load available voices (async on Chrome — voices load after a short delay).
 * Call once on app init to prime the voice list.
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
	const synth = getSynthesis();
	if (!isSpeechSynthesisSupported()) return Promise.resolve([]);

	return new Promise((resolve) => {
		const voices = synth!.getVoices();
		if (voices.length > 0) {
			resolve(voices);
			return;
		}
		// Chrome fires voiceschanged asynchronously
		synth!.addEventListener('voiceschanged', () => resolve(synth!.getVoices()), { once: true });
	});
}
