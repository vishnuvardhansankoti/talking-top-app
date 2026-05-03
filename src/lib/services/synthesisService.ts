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

const synth = typeof window !== 'undefined' ? (window.speechSynthesis ?? null) : null;

/** Stores the morph-influence setter registered by TomCharacter. */
let _morphInfluenceFn: SetMorphInfluenceFn | null = null;

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
	return Boolean(synth) && typeof SpeechSynthesisUtterance !== 'undefined';
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
): Promise<void> {
	if (!isSpeechSynthesisSupported() || !text.trim()) {
		return Promise.resolve();
	}

	// Cancel any current speech before starting
	synth!.cancel();

	return new Promise((resolve) => {
		const utterance = new SpeechSynthesisUtterance(text);

		// Tom's voice profile — chipmunk-high pitch, energetic pace
		utterance.pitch = Math.min(2, Math.max(0, options.pitch ?? 2.0));
		utterance.rate = Math.min(2, Math.max(0.1, options.rate ?? 1.09));
		utterance.volume = Math.min(1, Math.max(0, options.volume ?? 1.0));

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
			audioState.update((s) => ({ ...s, isPlaying: true }));
			requestAnimation('SPEAKING');
		};

		utterance.onend = () => {
			audioState.update((s) => ({ ...s, isPlaying: false }));
			stopLipSync();
			requestAnimation('IDLE');
			resolve();
		};

		utterance.onerror = () => {
			audioState.update((s) => ({ ...s, isPlaying: false }));
			stopLipSync();
			requestAnimation('IDLE');
			resolve(); // resolve rather than reject — non-fatal
		};

		synth!.speak(utterance);
		if (_morphInfluenceFn) {
			startLipSync(utterance);
		}
	});
}

/** Cancel any in-progress speech immediately. */
export function cancelSpeech(): void {
	synth?.cancel();
	audioState.update((s) => ({ ...s, isPlaying: false }));
}

/**
 * Load available voices (async on Chrome — voices load after a short delay).
 * Call once on app init to prime the voice list.
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
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
