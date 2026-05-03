/**
 * Speech Service (US-V01–US-V06)
 *
 * Wraps the Web Speech API (SpeechRecognition) for real-time transcript capture.
 * Gracefully degrades on browsers without support (Firefox without flag, older Safari).
 *
 * Integration pattern:
 *   - Call startSpeechRecognition() alongside startRecording()
 *   - Call stopSpeechRecognition() alongside stopRecording()
 *   - Transcripts flow into audioState.transcript via Svelte store
 */

import { audioState } from '$lib/stores';

// Vendor-prefix compatibility
const SpeechRecognitionAPI =
	(typeof window !== 'undefined' &&
		(window.SpeechRecognition || (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition)) ||
	null;

let _recognition: SpeechRecognition | null = null;
let _active = false;
let _finalTranscript = '';

/** Returns true if the current browser supports the Web Speech API. */
export function isSpeechRecognitionSupported(): boolean {
	return SpeechRecognitionAPI !== null;
}

/**
 * Start continuous speech recognition.
 * Silently no-ops if the API is unavailable (graceful degradation).
 * Updates audioState.transcript as interim/final results arrive.
 */
export function startSpeechRecognition(lang = 'en-US'): void {
	if (!SpeechRecognitionAPI || _active) return;
	_finalTranscript = '';

	_recognition = new SpeechRecognitionAPI();
	_recognition.lang = lang;
	_recognition.continuous = true;
	_recognition.interimResults = true;
	_recognition.maxAlternatives = 1;

	_recognition.onresult = (event: SpeechRecognitionEvent) => {
		let interim = '';

		for (let i = event.resultIndex; i < event.results.length; i++) {
			const result = event.results[i];
			const text = result[0].transcript;
			if (result.isFinal) {
				_finalTranscript += text;
			} else {
				interim += text;
			}
		}

		const transcript = `${_finalTranscript}${interim}`.trim();
		if (transcript) {
			audioState.update((s) => ({ ...s, transcript }));
		}
	};

	_recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
		// 'no-speech', 'network' are non-fatal; just stop silently
		if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
			// Mic access denied — stop and do not retry
			stopSpeechRecognition();
		}
		// Other errors (aborted, network) — recognition will auto-restart via onend
	};

	_recognition.onend = () => {
		// If we're still supposed to be active, restart (handles interim network drops)
		if (_active && _recognition) {
			try {
				_recognition.start();
			} catch {
				// Already started (race condition) — ignore
			}
		}
	};

	try {
		_recognition.start();
		_active = true;
	} catch {
		// Could not start — browser constraint; degrade silently
		_recognition = null;
		_active = false;
	}
}

/**
 * Stop speech recognition and clear the recognition instance.
 * Safe to call even if recognition was never started.
 */
export function stopSpeechRecognition(): void {
	_active = false;
	_finalTranscript = '';
	if (_recognition) {
		try {
			_recognition.stop();
		} catch {
			// Already stopped
		}
		_recognition = null;
	}
}

/** Clear the transcript in the store (e.g. before a new recording). */
export function clearTranscript(): void {
	_finalTranscript = '';
	audioState.update((s) => ({ ...s, transcript: '' }));
}
