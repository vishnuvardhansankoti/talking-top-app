import { writable } from 'svelte/store';
import type { AppState } from '$lib/types';
import { SETTINGS_DEFAULT } from '$lib/types';

const initialAppState: AppState = {
	initialized: false,
	modelLoaded: false,
	micPermission: 'prompt',
	settings: { ...SETTINGS_DEFAULT },
	isSettingsOpen: false,
	error: null,
	lifestyleAction: null,
	lifestyleCooldowns: { BATHING: 0, EATING: 0, PEEING: 0, SLEEPING: 0 }
};

export const appState = writable<AppState>(initialAppState);
