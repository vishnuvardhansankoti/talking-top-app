/**
 * Tests for synthesisService (US-V01, US-V03)
 *
 * The SpeechSynthesis API is not available in jsdom, so we use vi.stubGlobal
 * to provide a minimal mock, then test the service's exported functions.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock SpeechSynthesisUtterance ───────────────────────────────────────────
class MockSpeechSynthesisUtterance {
	text: string;
	pitch = 1;
	rate = 1;
	volume = 1;
	voice: SpeechSynthesisVoice | null = null;
	onstart: (() => void) | null = null;
	onend: (() => void) | null = null;
	onerror: (() => void) | null = null;

	constructor(text: string) {
		this.text = text;
	}
}

// ─── Mock SpeechSynthesis ────────────────────────────────────────────────────
function makeMockSynth() {
	let _voices: SpeechSynthesisVoice[] = [];
	let _utterance: MockSpeechSynthesisUtterance | null = null;
	let _cancelled = false;

	return {
		speak: vi.fn((u: MockSpeechSynthesisUtterance) => {
			_utterance = u;
			_cancelled = false;
			// Auto-fire onstart then onend asynchronously
			setTimeout(() => {
				if (!_cancelled) u.onstart?.();
			}, 0);
			setTimeout(() => {
				if (!_cancelled) u.onend?.();
			}, 10);
		}),
		cancel: vi.fn(() => {
			_cancelled = true;
		}),
		getVoices: vi.fn(() => _voices),
		addEventListener: vi.fn(),
		// Helper for tests to inject voices
		_setVoices(v: SpeechSynthesisVoice[]) {
			_voices = v;
		},
		_getLastUtterance() {
			return _utterance;
		}
	};
}

describe('synthesisService', () => {
	let mockSynth: ReturnType<typeof makeMockSynth>;

	beforeEach(async () => {
		mockSynth = makeMockSynth();
		vi.stubGlobal('speechSynthesis', mockSynth);
		vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance);
		// Re-import to pick up the mocked globals
		vi.resetModules();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.resetModules();
	});

	it('isSpeechSynthesisSupported returns true when API is available', async () => {
		const { isSpeechSynthesisSupported } = await import('./synthesisService');
		expect(isSpeechSynthesisSupported()).toBe(true);
	});

	it('isSpeechSynthesisSupported returns false when speechSynthesis is absent', async () => {
		vi.stubGlobal('speechSynthesis', undefined);
		vi.resetModules();
		const { isSpeechSynthesisSupported } = await import('./synthesisService');
		expect(isSpeechSynthesisSupported()).toBe(false);
	});

	it('speakTranscript resolves immediately for empty string', async () => {
		const { speakTranscript } = await import('./synthesisService');
		await expect(speakTranscript('')).resolves.toBe(false);
		expect(mockSynth.speak).not.toHaveBeenCalled();
	});

	it('speakTranscript resolves immediately for whitespace-only string', async () => {
		const { speakTranscript } = await import('./synthesisService');
		await expect(speakTranscript('   ')).resolves.toBe(false);
		expect(mockSynth.speak).not.toHaveBeenCalled();
	});

	it('speakTranscript calls synth.speak with an utterance', async () => {
		const { speakTranscript } = await import('./synthesisService');
		const p = speakTranscript('hello world');
		await expect(p).resolves.toBe(true);
		expect(mockSynth.speak).toHaveBeenCalledTimes(1);
		const utterance = mockSynth._getLastUtterance();
		expect(utterance).toBeTruthy();
		expect(utterance?.text).toBe('hello world');
	});

	it('speakTranscript cancels any prior speech before speaking', async () => {
		const { speakTranscript } = await import('./synthesisService');
		await speakTranscript('first');
		await speakTranscript('second');
		// cancel should be called once before each speak call
		expect(mockSynth.cancel).toHaveBeenCalledTimes(2);
	});

	it('speakTranscript applies default Tom pitch (2.0) and rate (1.09)', async () => {
		const { speakTranscript } = await import('./synthesisService');
		await speakTranscript('test pitch');
		const u = mockSynth._getLastUtterance();
		expect(u?.pitch).toBe(2);
		expect(u?.rate).toBeCloseTo(1.09, 2);
	});

	it('speakTranscript clamps pitch to [0, 2]', async () => {
		const { speakTranscript } = await import('./synthesisService');
		await speakTranscript('test clamp', { pitch: 999 });
		expect(mockSynth._getLastUtterance()?.pitch).toBe(2);

		vi.resetModules();
		const { speakTranscript: speak2 } = await import('./synthesisService');
		await speak2('test clamp low', { pitch: -5 });
		expect(mockSynth._getLastUtterance()?.pitch).toBe(0);
	});

	it('speakTranscript clamps rate to [0.1, 2]', async () => {
		const { speakTranscript } = await import('./synthesisService');
		await speakTranscript('test rate', { rate: 100 });
		expect(mockSynth._getLastUtterance()?.rate).toBe(2);
	});

	it('speakTranscript resolves when API is unavailable', async () => {
		vi.stubGlobal('speechSynthesis', undefined);
		vi.stubGlobal('SpeechSynthesisUtterance', undefined);
		vi.resetModules();
		const { speakTranscript } = await import('./synthesisService');
		await expect(speakTranscript('hello')).resolves.toBe(false);
	});

	it('cancelSpeech calls synth.cancel', async () => {
		const { cancelSpeech } = await import('./synthesisService');
		cancelSpeech();
		expect(mockSynth.cancel).toHaveBeenCalled();
	});

	it('loadVoices resolves immediately when voices already loaded', async () => {
		const fakeVoice = { name: 'Test', lang: 'en-US' } as unknown as SpeechSynthesisVoice;
		mockSynth._setVoices([fakeVoice]);
		const { loadVoices } = await import('./synthesisService');
		const voices = await loadVoices();
		expect(voices).toHaveLength(1);
		expect(voices[0].name).toBe('Test');
	});

	it('loadVoices resolves empty array when API unavailable', async () => {
		vi.stubGlobal('speechSynthesis', undefined);
		vi.resetModules();
		const { loadVoices } = await import('./synthesisService');
		const voices = await loadVoices();
		expect(voices).toEqual([]);
	});

	it('module exports all expected functions', async () => {
		const mod = await import('./synthesisService');
		expect(typeof mod.isSpeechSynthesisSupported).toBe('function');
		expect(typeof mod.speakTranscript).toBe('function');
		expect(typeof mod.cancelSpeech).toBe('function');
		expect(typeof mod.loadVoices).toBe('function');
	});
});
