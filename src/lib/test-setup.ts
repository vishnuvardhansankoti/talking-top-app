import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Web Audio API
const createMockNode = () => ({
	connect: vi.fn(),
	disconnect: vi.fn(),
	start: vi.fn(),
	stop: vi.fn(),
	gain: { value: 1 },
	frequencyBinCount: 128,
	fftSize: 256,
	getByteTimeDomainData: vi.fn((buf: Uint8Array) => buf.fill(128)),
	playbackRate: { value: 1 },
	onended: null as (() => void) | null,
	buffer: null
});

global.AudioContext = vi.fn().mockImplementation(() => ({
	createGain: vi.fn(() => createMockNode()),
	createAnalyser: vi.fn(() => createMockNode()),
	createMediaStreamSource: vi.fn(() => createMockNode()),
	createBufferSource: vi.fn(() => ({ ...createMockNode(), onended: null, start: vi.fn() })),
	decodeAudioData: vi.fn(() => Promise.resolve({})),
	destination: {},
	state: 'running',
	resume: vi.fn(() => Promise.resolve()),
	close: vi.fn(() => Promise.resolve()),
	sampleRate: 44100
})) as unknown as typeof AudioContext;

global.MediaRecorder = vi.fn().mockImplementation(() => ({
	start: vi.fn(),
	stop: vi.fn(),
	ondataavailable: null,
	onstop: null,
	state: 'inactive',
	mimeType: 'audio/webm'
})) as unknown as typeof MediaRecorder;

(global.MediaRecorder as unknown as { isTypeSupported: (t: string) => boolean }).isTypeSupported =
	vi.fn().mockReturnValue(true);
