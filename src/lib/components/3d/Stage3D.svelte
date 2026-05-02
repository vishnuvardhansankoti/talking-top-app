<script lang="ts">
	/**
	 * Stage3D — Single Threlte Canvas (ADR-002, US-3D02)
	 *
	 * Houses the entire Three.js scene. Canvas is never conditionally mounted
	 * (single Canvas rule). Camera, lights, and TomCharacter live here.
	 *
	 * Shows a loading overlay until modelLoaded flips true (US-3D02).
	 */
	import { Canvas } from '@threlte/core';
	import { T } from '@threlte/core';
	import TomCharacter from './TomCharacter.svelte';
	import { appState } from '$lib/stores';

	/** Detect WebGL availability before mounting Canvas */
	function isWebGLAvailable(): boolean {
		try {
			const canvas = document.createElement('canvas');
			return !!(
				canvas.getContext('webgl2') ||
				canvas.getContext('webgl') ||
				canvas.getContext('experimental-webgl')
			);
		} catch {
			return false;
		}
	}

	const webglSupported = typeof window !== 'undefined' && isWebGLAvailable();

	// If WebGL is unavailable, mark model as loaded so the spinner doesn't block
	if (!webglSupported) {
		appState.update((s) => ({ ...s, modelLoaded: true }));
	}
</script>

<!-- Loading overlay (US-3D02) — hidden once model is loaded -->
{#if !$appState.modelLoaded}
	<div class="loading-overlay" role="status" aria-live="polite" aria-label="Loading character model">
		<div class="loading-spinner" aria-hidden="true"></div>
		<p class="loading-text">Loading Tom…</p>
	</div>
{/if}

<div class="stage3d" role="img" aria-label="3D Talking Tom character">
	{#if webglSupported}
		<Canvas>
			<!-- Camera -->
			<T.PerspectiveCamera makeDefault fov={42} near={0.1} far={100} position={[0, 0.7, 3.4]} />

			<!-- Ambient light for base illumination -->
			<T.AmbientLight intensity={0.6} />

			<!-- Key light -->
			<T.DirectionalLight
				position={[3, 4, 2]}
				intensity={1.2}
				castShadow
				shadow.mapSize.width={1024}
				shadow.mapSize.height={1024}
			/>

			<!-- Fill light -->
			<T.DirectionalLight position={[-2, 2, -1]} intensity={0.4} color="#8899ff" />

			<!-- Tom character -->
			<TomCharacter />
		</Canvas>
	{:else}
		<div class="webgl-fallback" role="alert">
			<span class="fallback-icon" aria-hidden="true">🐱</span>
			<p class="fallback-title">WebGL Not Available</p>
			<p class="fallback-body">
				Your browser or graphics driver has WebGL disabled.<br />
				Try enabling hardware acceleration in your browser settings, or switch to Chrome / Edge.
			</p>
		</div>
	{/if}
</div>

<style>
	.stage3d {
		width: 100%;
		height: 100%;
		position: absolute;
		inset: 0;
	}

	.loading-overlay {
		position: absolute;
		inset: 0;
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: #1a1a2e;
		gap: 20px;
	}

	.loading-spinner {
		width: 56px;
		height: 56px;
		border: 4px solid rgba(255, 255, 255, 0.15);
		border-top-color: #e94560;
		border-radius: 50%;
		animation: spin 0.9s linear infinite;
	}

	.loading-text {
		color: rgba(255, 255, 255, 0.7);
		font-size: 16px;
		font-family: system-ui, sans-serif;
		letter-spacing: 0.03em;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.webgl-fallback {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		background: #1a1a2e;
		padding: 32px;
		text-align: center;
	}

	.fallback-icon {
		font-size: 72px;
		line-height: 1;
	}

	.fallback-title {
		color: #e94560;
		font-size: 18px;
		font-weight: 600;
		font-family: system-ui, sans-serif;
		margin: 0;
	}

	.fallback-body {
		color: rgba(255, 255, 255, 0.6);
		font-size: 14px;
		font-family: system-ui, sans-serif;
		line-height: 1.6;
		margin: 0;
		max-width: 320px;
	}
</style>
