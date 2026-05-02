// ─── Animation Names ──────────────────────────────────────────────────────────
export type LifestyleActionName = 'BATHING' | 'EATING' | 'PEEING' | 'SLEEPING';

export type LifestyleSound = 'bath' | 'food' | 'pee' | 'sleep' | 'flush';

export type AnimationName =
	| 'IDLE'
	| 'LISTENING'
	| 'SPEAKING'
	| 'REACTING_POKE'
	| 'REACTING_PET'
	| 'REACTING_HOLD'
	| 'BATHING'
	| 'EATING'
	| 'PEEING'
	| 'SLEEPING';

export type MicPermission = 'granted' | 'denied' | 'prompt';

// ─── Priority Map (ADR-004) ───────────────────────────────────────────────────
export const ANIMATION_PRIORITY: Record<AnimationName, number> = {
	IDLE: 1,
	REACTING_POKE: 2,
	REACTING_PET: 2,
	REACTING_HOLD: 2,
	LISTENING: 3,
	SPEAKING: 4,
	BATHING: 5,
	EATING: 5,
	PEEING: 5,
	SLEEPING: 5
};

// ─── Settings ─────────────────────────────────────────────────────────────────
export interface Settings {
	volume: number; // 0.0–1.0
	pitchShift: number; // 1.2–1.8
	showTranscript: boolean;
	hapticFeedback: boolean;
}

export const SETTINGS_STORAGE_KEY = 'talking-tom-settings';

export const SETTINGS_DEFAULT: Settings = {
	volume: 0.8,
	pitchShift: 1.5,
	showTranscript: true,
	hapticFeedback: true
};

// ─── Gesture ──────────────────────────────────────────────────────────────────
export type GestureType = 'poke' | 'pet' | 'hold';

export interface GestureEvent {
	type: GestureType;
	x: number; // normalized 0–1
	y: number; // normalized 0–1
	timestamp: number;
}

// ─── Lifestyle State ──────────────────────────────────────────────────────────
export interface LifestyleCooldowns {
	BATHING: number; // Unix ms when cooldown expires (0 = no cooldown)
	EATING: number;
	PEEING: number;
	SLEEPING: number;
}

// ─── App State ────────────────────────────────────────────────────────────────
export interface AppState {
	initialized: boolean;
	modelLoaded: boolean;
	micPermission: MicPermission;
	settings: Settings;
	isSettingsOpen: boolean;
	error: string | null;
	lifestyleAction: LifestyleActionName | null;
	lifestyleCooldowns: LifestyleCooldowns;
}

// ─── Animation State ──────────────────────────────────────────────────────────
export type AnimationStateName =
	| 'IDLE'
	| 'LISTENING'
	| 'SPEAKING'
	| 'REACTING_POKE'
	| 'REACTING_PET'
	| 'REACTING_HOLD'
	| 'BATHING'
	| 'EATING'
	| 'PEEING'
	| 'SLEEPING';

export interface AnimationState {
	current: AnimationStateName;
	previous: AnimationStateName | null;
	queue: AnimationStateName[];
	blending: boolean;
	locked: boolean; // true during emergency fallback
}

// ─── Audio State ──────────────────────────────────────────────────────────────
export interface AudioState {
	isRecording: boolean;
	isPlaying: boolean;
	isAnalyzing: boolean; // VAD active
	rmsLevel: number; // 0.0–1.0 instantaneous RMS
	transcript: string;
	duration: number; // last recording ms
}

// ─── VAD config ───────────────────────────────────────────────────────────────
export interface VadConfig {
	fftSize: 256 | 512 | 1024 | 2048;
	rmsThreshold: number; // e.g. 0.01
	silenceDurationMs: number; // ms of silence before stopping
}

export const VAD_DEFAULT: VadConfig = {
	fftSize: 256,
	rmsThreshold: 0.01,
	silenceDurationMs: 1500
};
