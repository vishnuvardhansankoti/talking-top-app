import { writable } from 'svelte/store';
import type { AudioState } from '$lib/types';

const initialAudioState: AudioState = {
	isRecording: false,
	isPlaying: false,
	isAnalyzing: false,
	rmsLevel: 0,
	transcript: '',
	duration: 0
};

export const audioState = writable<AudioState>(initialAudioState);
