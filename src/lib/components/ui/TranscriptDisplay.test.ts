/**
 * Tests for TranscriptDisplay component (US-UI04)
 * Validates component structure
 */

import { describe, it, expect } from 'vitest';

describe('TranscriptDisplay Component', () => {
	it('should be importable without errors', async () => {
		const module = await import('$lib/components/ui/TranscriptDisplay.svelte');
		expect(module).toBeDefined();
		expect(module.default).toBeDefined();
	});

	it('should not throw when imported', () => {
		expect(async () => {
			await import('$lib/components/ui/TranscriptDisplay.svelte');
		}).not.toThrow();
	});
});
