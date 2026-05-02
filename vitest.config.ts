import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./src/lib/test-setup.ts'],
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['src/**/*.e2e.{js,ts}', 'tests/**'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/lib/services/**'],
			exclude: [
				'src/lib/services/index.ts',
				// audioService contains Web Audio API code that cannot be tested in jsdom
				// Excluded from coverage analysis due to platform limitations
				'src/lib/services/audioService.ts',
				// speechService wraps the Web Speech API (SpeechRecognition) which is
				// unavailable in jsdom; core branch coverage impossible at unit-test level
				'src/lib/services/speechService.ts'
			],
			thresholds: {
				lines: 70,
				functions: 70,
				branches: 60,
				statements: 70
			}
		}
	}
});
