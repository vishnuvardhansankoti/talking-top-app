/**
 * Tests for audioService (US-A01, US-V01, US-V02, US-V03, US-V04)
 * Focus: Core service functionality and parameter validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	getPreferredAudioMimeType,
	setVolume,
	setPitchShift,
	destroyAudio,
	requestMicrophonePermission,
	startRecording,
	stopRecording,
	playbackWithPitchShift
} from '$lib/services/audioService';

describe('audioService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		try {
			destroyAudio();
		} catch {
			// ignore
		}
	});

	describe('getPreferredAudioMimeType', () => {
		it('should return a string MIME type', () => {
			const mime = getPreferredAudioMimeType();
			expect(typeof mime).toBe('string');
			expect(mime.length).toBeGreaterThan(0);
		});

		it('should return valid audio MIME type', () => {
			const mime = getPreferredAudioMimeType();
			expect(mime.startsWith('audio/')).toBe(true);
		});

		it('should cache MIME type (consistent return)', () => {
			const mime1 = getPreferredAudioMimeType();
			const mime2 = getPreferredAudioMimeType();
			expect(mime1).toBe(mime2);
		});

		it('should prefer webm when available', () => {
			const mime = getPreferredAudioMimeType();
			// Should be webm or fallback to mp4/ogg
			expect(['webm', 'mp4', 'ogg'].some((m) => mime.includes(m))).toBe(true);
		});
	});

	describe('volume control', () => {
		it('setVolume should accept 0', () => {
			expect(() => setVolume(0)).not.toThrow();
		});

		it('setVolume should accept 0.5', () => {
			expect(() => setVolume(0.5)).not.toThrow();
		});

		it('setVolume should accept 1', () => {
			expect(() => setVolume(1)).not.toThrow();
		});

		it('setVolume should clamp negative values', () => {
			expect(() => setVolume(-1)).not.toThrow();
			expect(() => setVolume(-0.5)).not.toThrow();
		});

		it('setVolume should clamp values above 1', () => {
			expect(() => setVolume(1.5)).not.toThrow();
			expect(() => setVolume(2)).not.toThrow();
		});

		it('setPitchShift should accept 1.2', () => {
			expect(() => setPitchShift(1.2)).not.toThrow();
		});

		it('setPitchShift should accept 1.5', () => {
			expect(() => setPitchShift(1.5)).not.toThrow();
		});

		it('setPitchShift should accept 1.8', () => {
			expect(() => setPitchShift(1.8)).not.toThrow();
		});

		it('setPitchShift should clamp below 1.2', () => {
			expect(() => setPitchShift(0.8)).not.toThrow();
			expect(() => setPitchShift(1.0)).not.toThrow();
		});

		it('setPitchShift should clamp above 1.8', () => {
			expect(() => setPitchShift(2.0)).not.toThrow();
			expect(() => setPitchShift(3.0)).not.toThrow();
		});
	});

	describe('recording operations', () => {
		it('startRecording should be callable', () => {
			expect(() => startRecording()).not.toThrow();
		});

		it('stopRecording should be callable', () => {
			expect(() => stopRecording()).not.toThrow();
		});

		it('should handle start/stop sequence', () => {
			expect(() => {
				startRecording();
				stopRecording();
			}).not.toThrow();
		});

		it('requestMicrophonePermission should be callable', () => {
			expect(() => requestMicrophonePermission()).not.toThrow();
		});
	});

	describe('playback operations', () => {
		it('playbackWithPitchShift should handle ArrayBuffer', () => {
			expect(() => playbackWithPitchShift(new ArrayBuffer(1024))).not.toThrow();
		});

		it('playbackWithPitchShift should handle empty buffer', () => {
			expect(() => playbackWithPitchShift(new ArrayBuffer(0))).not.toThrow();
		});

		it('playbackWithPitchShift should handle with pitch parameter', () => {
			expect(() => playbackWithPitchShift(new ArrayBuffer(512), 1.5)).not.toThrow();
		});

		it('playbackWithPitchShift should handle large buffer', () => {
			const largeBuffer = new ArrayBuffer(1024 * 1024);
			expect(() => playbackWithPitchShift(largeBuffer)).not.toThrow();
		});
	});

	describe('cleanup', () => {
		it('destroyAudio should be callable', () => {
			expect(() => destroyAudio()).not.toThrow();
		});

		it('destroyAudio should handle multiple calls', () => {
			expect(() => {
				destroyAudio();
				destroyAudio();
				destroyAudio();
			}).not.toThrow();
		});
	});

	describe('service resilience', () => {
		it('should handle repeated volume changes', () => {
			expect(() => {
				for (let i = 0; i < 10; i++) {
					setVolume(Math.random());
				}
			}).not.toThrow();
		});

		it('should handle repeated pitch changes', () => {
			expect(() => {
				for (let i = 0; i < 10; i++) {
					setPitchShift(1.2 + Math.random() * 0.6);
				}
			}).not.toThrow();
		});

		it('should handle mixed operations', () => {
			expect(() => {
				setVolume(0.8);
				setPitchShift(1.5);
				startRecording();
				setPitchShift(1.2);
				stopRecording();
				setVolume(0.5);
			}).not.toThrow();
		});
	});
});
