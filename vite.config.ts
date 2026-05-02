import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'prompt',
			injectRegister: 'script',
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
				globIgnores: ['**/*.glb', '**/*.mp3', '**/*.wav', '**/*.ogg'],
				runtimeCaching: [
					{
						urlPattern: /\.glb$/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'glb-models',
							expiration: { maxEntries: 5, maxAgeSeconds: 30 * 24 * 60 * 60 },
							cacheableResponse: { statuses: [0, 200] }
						}
					},
					{
						urlPattern: /\.(mp3|wav|ogg)$/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'audio-files',
							expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
							cacheableResponse: { statuses: [0, 200] }
						}
					}
				]
			},
			manifest: {
				name: 'Talking Tom',
				short_name: 'Talking Tom',
				description: 'Interactive 3D Talking Tom voice companion',
				theme_color: '#1a1a2e',
				background_color: '#1a1a2e',
				display: 'standalone',
				orientation: 'portrait',
				start_url: '/',
				icons: [
					{ src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
					{ src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
					{ src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' }
				]
			}
		})
	],
	build: {
		target: 'es2022'
	}
});
