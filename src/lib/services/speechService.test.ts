/**
 * Speech Service Tests (US-V01–US-V06)
 *
 * Tests for the Web Speech API wrapper, including graceful degradation
 * on browsers without SpeechRecognition support.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { audioState } from '$lib/stores';
import * as speechService from '$lib/services/speechService';

// ─── Mock SpeechRecognition ───────────────────────────────────────────────────

class MockSpeechRecognition {
	lang = '';
	continuous = false;
	interimResults = false;
	maxAlternatives = 1;

	onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
	onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;
	onend: (() => void) | null = null;

	start = vi.fn();
	stop = vi.fn();
}

describe('speechService', () => {
	beforeEach(() => {
		// Reset audio state before each test
		audioState.set({
			isRecording: false,
			isPlaying: false,
			isAnalyzing: false,
			rmsLevel: 0,
			transcript: '',
			duration: 0
		});

		// Stop any active recognition
		speechService.stopSpeechRecognition();
	});

	afterEach(() => {
		speechService.stopSpeechRecognition();
		vi.unstubAllGlobals();
	});

	describe('isSpeechRecognitionSupported()', () => {
		it('should return a boolean', () => {
			const result = speechService.isSpeechRecognitionSupported();
			expect(typeof result).toBe('boolean');
		});
	});

	describe('startSpeechRecognition()', () => {
		it('should not throw when called', () => {
			expect(() => speechService.startSpeechRecognition()).not.toThrow();
		});

		it('should not throw on double-start', () => {
			expect(() => {
				speechService.startSpeechRecognition();
				speechService.startSpeechRecognition();
			}).not.toThrow();
		});

		it('should accept a custom language parameter', () => {
			expect(() => speechService.startSpeechRecognition('fr-FR')).not.toThrow();
		});
	});

	describe('stopSpeechRecognition()', () => {
		it('should not throw when called without start', () => {
			expect(() => speechService.stopSpeechRecognition()).not.toThrow();
		});

		it('should be idempotent', () => {
			speechService.stopSpeechRecognition();
			speechService.stopSpeechRecognition();
			expect(get(audioState).transcript).toBe('');
		});

		it('should stop after start without throwing', () => {
			speechService.startSpeechRecognition();
			expect(() => speechService.stopSpeechRecognition()).not.toThrow();
		});
	});

	describe('clearTranscript()', () => {
		it('should clear the transcript in audioState', () => {
			audioState.update((s) => ({ ...s, transcript: 'Hello Tom!' }));
			expect(get(audioState).transcript).toBe('Hello Tom!');

			speechService.clearTranscript();
			expect(get(audioState).transcript).toBe('');
		});

		it('should not affect other audioState fields', () => {
			audioState.update((s) => ({ ...s, transcript: 'test', isRecording: true, rmsLevel: 0.5 }));

			speechService.clearTranscript();

			const state = get(audioState);
			expect(state.transcript).toBe('');
			expect(state.isRecording).toBe(true);
			expect(state.rmsLevel).toBe(0.5);
		});

		it('should be safe to call when transcript is already empty', () => {
			expect(get(audioState).transcript).toBe('');
			expect(() => speechService.clearTranscript()).not.toThrow();
			expect(get(audioState).transcript).toBe('');
		});
	});

	describe('module exports', () => {
		it('should export all expected functions', () => {
			expect(typeof speechService.isSpeechRecognitionSupported).toBe('function');
			expect(typeof speechService.startSpeechRecognition).toBe('function');
			expect(typeof speechService.stopSpeechRecognition).toBe('function');
			expect(typeof speechService.clearTranscript).toBe('function');
		});
	});
});
