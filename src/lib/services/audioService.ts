/**
 * Audio Service (US-V01–US-V06, US-PERF01)
 *
 * Full Web Audio API pipeline:
 * MediaStream → AnalyserNode (VAD, fftSize=256) → MediaRecorder →
 * decodeAudioData → AudioBufferSourceNode (pitch shift) → GainNode → destination
 *
 * AudioContext is lazily initialized on first user gesture (iOS requirement).
 */

import { audioState } from '$lib/stores';
import { animationService } from './index';
import { startSpeechRecognition, stopSpeechRecognition, clearTranscript } from './speechService';
import type { VadConfig } from '$lib/types';
import { VAD_DEFAULT } from '$lib/types';

let _ctx: AudioContext | null = null;
let _analyser: AnalyserNode | null = null;
let _gainNode: GainNode | null = null;
let _mediaRecorder: MediaRecorder | null = null;
let _stream: MediaStream | null = null;
let _vadFrame: number | null = null;
let _silenceTimer: ReturnType<typeof setTimeout> | null = null;
let _chunks: Blob[] = [];
let _vadConfig: VadConfig = { ...VAD_DEFAULT };
let _pitchShift = 1.5;
let _volume = 0.8;
let _onRecordingStopped: ((blob: Blob) => void | Promise<void>) | null = null;

/** Must be called inside a user gesture handler to satisfy browser autoplay policy. */
export async function initAudioContext(): Promise<void> {
	if (_ctx) {
		if (_ctx.state === 'suspended') await _ctx.resume();
		return;
	}
	_ctx = new AudioContext({ sampleRate: 44100 });
	_gainNode = _ctx.createGain();
	_gainNode.gain.value = _volume;
	_gainNode.connect(_ctx.destination);
}

/** Request microphone permission and set up the VAD analyser. */
export async function requestMicrophonePermission(): Promise<PermissionState> {
	try {
		_stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
		return 'granted';
	} catch (err) {
		const name = (err as DOMException).name;
		return name === 'NotAllowedError' || name === 'PermissionDeniedError' ? 'denied' : 'denied';
	}
}

/** Start recording + VAD loop. Resolves once recording begins. */
export async function startRecording(config?: Partial<VadConfig>): Promise<void> {
	if (!_ctx || !_stream) return;

	_vadConfig = { ...VAD_DEFAULT, ...config };
	_chunks = [];

	// Build analysis graph
	const source = _ctx.createMediaStreamSource(_stream);
	_analyser = _ctx.createAnalyser();
	_analyser.fftSize = _vadConfig.fftSize;
	source.connect(_analyser);

	// MediaRecorder for capturing
	const mime = getPreferredAudioMimeType();
	_mediaRecorder = new MediaRecorder(_stream, mime ? { mimeType: mime } : undefined);
	_mediaRecorder.ondataavailable = (e) => {
		if (e.data.size > 0) _chunks.push(e.data);
	};
	_mediaRecorder.start(100); // 100ms timeslices

	clearTranscript();
	audioState.update((s) => ({ ...s, isRecording: true, isAnalyzing: true, transcript: '' }));
	animationService.requestAnimation('LISTENING');
	startSpeechRecognition();

	_startVadLoop();
}

/**
 * Register a callback fired whenever a recording finishes and produces a blob.
 * Used by UI to handle auto-stop (VAD silence timeout) the same way as manual stop.
 */
export function setRecordingStoppedCallback(
	callback: ((blob: Blob) => void | Promise<void>) | null
): void {
	_onRecordingStopped = callback;
}

/** Stop recording and return the raw audio blob. */
export async function stopRecording(options: { notify?: boolean } = {}): Promise<Blob | null> {
	const notify = options.notify ?? true;
	if (!_mediaRecorder || _mediaRecorder.state === 'inactive') return null;

	stopSpeechRecognition();

	return new Promise((resolve) => {
		_mediaRecorder!.onstop = () => {
			const blob = new Blob(_chunks, { type: _mediaRecorder!.mimeType || 'audio/webm' });
			_chunks = [];
			audioState.update((s) => ({
				...s,
				isRecording: false,
				isAnalyzing: false,
				duration: blob.size
			}));
			if (notify && _onRecordingStopped) {
				void _onRecordingStopped(blob);
			}
			resolve(blob);
		};
		_mediaRecorder!.stop();
		_stopVadLoop();
	});
}

/**
 * Decode a recorded audio blob, apply pitch shift, and play it back.
 * Triggers SPEAKING animation during playback.
 */
export async function playbackWithPitchShift(blob: Blob, pitchShift?: number): Promise<void> {
	if (!_ctx || !_gainNode) return;

	const shift = pitchShift ?? _pitchShift;
	const arrayBuffer = await blob.arrayBuffer();

	let audioBuffer: AudioBuffer;
	try {
		audioBuffer = await _ctx.decodeAudioData(arrayBuffer);
	} catch {
		return;
	}

	const source = _ctx.createBufferSource();
	source.buffer = audioBuffer;
	source.playbackRate.value = shift;
	source.connect(_gainNode);

	audioState.update((s) => ({ ...s, isPlaying: true }));
	animationService.requestAnimation('SPEAKING');

	source.start(0);
	source.onended = () => {
		audioState.update((s) => ({ ...s, isPlaying: false }));
		animationService.onAnimationFinished();
	};
}

/** Update master volume (0.0–1.0). */
export function setVolume(value: number): void {
	_volume = Math.min(1, Math.max(0, value));
	if (_gainNode) _gainNode.gain.value = _volume;
}

/** Update pitch shift (1.2–1.8). */
export function setPitchShift(value: number): void {
	_pitchShift = Math.min(1.8, Math.max(1.2, value));
}

/** Clean up all audio resources. */
export function destroyAudio(): void {
	_stopVadLoop();
	_stream?.getTracks().forEach((t) => t.stop());
	_ctx?.close();
	_ctx = null;
	_analyser = null;
	_gainNode = null;
	_stream = null;
	_mediaRecorder = null;
}

// ─── MIME type detection ──────────────────────────────────────────────────────

export function getPreferredAudioMimeType(): string | null {
	const candidates = [
		'audio/webm;codecs=opus',
		'audio/webm',
		'audio/mp4',
		'audio/ogg;codecs=opus'
	];
	for (const mime of candidates) {
		if (MediaRecorder.isTypeSupported(mime)) return mime;
	}
	return null;
}

// ─── VAD loop ─────────────────────────────────────────────────────────────────

function _startVadLoop(): void {
	if (!_analyser) return;
	const buffer = new Uint8Array(_analyser.frequencyBinCount);

	const tick = () => {
		if (!_analyser) return;
		_analyser.getByteTimeDomainData(buffer);

		// RMS calculation
		let sum = 0;
		for (const v of buffer) {
			const normalized = v / 128 - 1;
			sum += normalized * normalized;
		}
		const rms = Math.sqrt(sum / buffer.length);
		audioState.update((s) => ({ ...s, rmsLevel: rms }));

		if (rms > _vadConfig.rmsThreshold) {
			// Voice detected — reset silence timer
			if (_silenceTimer) {
				clearTimeout(_silenceTimer);
				_silenceTimer = null;
			}
		} else {
			// Silence — start countdown to auto-stop
			if (!_silenceTimer) {
				_silenceTimer = setTimeout(() => {
					stopRecording();
				}, _vadConfig.silenceDurationMs);
			}
		}

		_vadFrame = requestAnimationFrame(tick);
	};

	_vadFrame = requestAnimationFrame(tick);
}

function _stopVadLoop(): void {
	if (_vadFrame !== null) {
		cancelAnimationFrame(_vadFrame);
		_vadFrame = null;
	}
	if (_silenceTimer) {
		clearTimeout(_silenceTimer);
		_silenceTimer = null;
	}
}
