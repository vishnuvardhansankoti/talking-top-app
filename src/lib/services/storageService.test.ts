/**
 * Tests for storageService (US-SEC03, US-PWA05)
 * Focus: Settings persistence and validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadSettings, saveSettings, estimateStorageQuota } from '$lib/services/storageService';
import { SETTINGS_DEFAULT } from '$lib/types';

describe('storageService', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		localStorage.clear();
	});

	describe('loadSettings', () => {
		it('should return settings object', () => {
			const settings = loadSettings();
			expect(settings).toBeDefined();
			expect(typeof settings).toBe('object');
		});

		it('should load stored settings if present', () => {
			const custom = { ...SETTINGS_DEFAULT, volume: 0.7 };
			localStorage.setItem('talking-tom-settings', JSON.stringify(custom));
			const loaded = loadSettings();
			expect(loaded.volume).toBe(0.7);
		});
	});

	describe('saveSettings', () => {
		it('should persist settings to localStorage', () => {
			const settings = { ...SETTINGS_DEFAULT, volume: 0.6, pitch: 1.6 };
			saveSettings(settings);
			const stored = localStorage.getItem('talking-tom-settings');
			expect(stored).toBeDefined();
			const parsed = JSON.parse(stored!);
			expect(parsed.volume).toBe(0.6);
		});
	});

	describe('estimateStorageQuota', () => {
		it('should be callable', async () => {
			const result = await estimateStorageQuota();
			// May return null if API not available, or storage info if it is
			expect(result === null || typeof result === 'object').toBe(true);
		});
	});
});
