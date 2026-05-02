/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				brand: {
					dark: '#1a1a2e',
					mid: '#16213e',
					accent: '#0f3460',
					highlight: '#e94560'
				}
			}
		}
	},
	plugins: []
};
