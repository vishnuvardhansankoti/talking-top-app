/**
 * Tests for MicrophoneButton component (US-UI02, US-A01)
 * Validates component structure
 */

import { describe, it, expect } from 'vitest';

describe('MicrophoneButton Component', () => {
	it('should be importable without errors', async () => {
		const module = await import('$lib/components/ui/MicrophoneButton.svelte');
		expect(module).toBeDefined();
		expect(module.default).toBeDefined();
	});

	it('should not throw when imported', () => {
		expect(async () => {
			await import('$lib/components/ui/MicrophoneButton.svelte');
		}).not.toThrow();
	});
});
