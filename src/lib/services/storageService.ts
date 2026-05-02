/**
 * Storage Service (US-SEC03, US-PWA05)
 *
 * Wraps localStorage for settings persistence.
 * Validates retrieved data against SETTINGS_DEFAULT shape to guard against
 * tampered or stale values.
 */

import type { Settings } from '$lib/types';
import { SETTINGS_DEFAULT, SETTINGS_STORAGE_KEY } from '$lib/types';
import { appState } from '$lib/stores';

/** Load settings from localStorage, falling back to defaults on failure. */
export function loadSettings(): Settings {
	if (typeof localStorage === 'undefined') return { ...SETTINGS_DEFAULT };

	try {
		const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
		if (!raw) return { ...SETTINGS_DEFAULT };

		const parsed = JSON.parse(raw) as Partial<Settings>;
		return sanitizeSettings(parsed);
	} catch {
		return { ...SETTINGS_DEFAULT };
	}
}

/** Persist settings to localStorage and update the app store. */
export function saveSettings(settings: Settings): void {
	const safe = sanitizeSettings(settings);

	try {
		localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(safe));
	} catch {
		// localStorage quota exceeded — ignore silently
	}

	appState.update((s) => ({ ...s, settings: safe }));
}

/** Estimate available storage quota (for debug/info). */
export async function estimateStorageQuota(): Promise<{ usage: number; quota: number } | null> {
	if (!navigator?.storage?.estimate) return null;
	const { usage = 0, quota = 0 } = await navigator.storage.estimate();
	return { usage, quota };
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function sanitizeSettings(raw: Partial<Settings>): Settings {
	return {
		volume: clamp(typeof raw.volume === 'number' ? raw.volume : SETTINGS_DEFAULT.volume, 0, 1),
		pitchShift: clamp(
			typeof raw.pitchShift === 'number' ? raw.pitchShift : SETTINGS_DEFAULT.pitchShift,
			1.2,
			1.8
		),
		showTranscript:
			typeof raw.showTranscript === 'boolean'
				? raw.showTranscript
				: SETTINGS_DEFAULT.showTranscript,
		hapticFeedback:
			typeof raw.hapticFeedback === 'boolean'
				? raw.hapticFeedback
				: SETTINGS_DEFAULT.hapticFeedback
	};
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}
