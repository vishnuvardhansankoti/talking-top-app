<script lang="ts">
	/**
	 * Main page — assembles all components (US-UI01, US-PWA03, US-PWA05)
	 *
	 * Layout: full-viewport stage with GestureLayer overlay,
	 * mic button and settings button fixed at bottom, transcript above.
	 */
	import { onMount } from 'svelte';
	import { useRegisterSW } from 'virtual:pwa-register/svelte';
	import Stage3D from '$lib/components/3d/Stage3D.svelte';
	import GestureLayer from '$lib/components/interaction/GestureLayer.svelte';
	import MicrophoneButton from '$lib/components/ui/MicrophoneButton.svelte';
	import TranscriptDisplay from '$lib/components/ui/TranscriptDisplay.svelte';
	import SettingsPanel from '$lib/components/ui/SettingsPanel.svelte';
	import LifestylePanel from '$lib/components/LifestylePanel.svelte';
	import OverlayBath from '$lib/components/overlays/OverlayBath.svelte';
	import OverlayFood from '$lib/components/overlays/OverlayFood.svelte';
	import OverlayPee from '$lib/components/overlays/OverlayPee.svelte';
	import OverlaySleep from '$lib/components/overlays/OverlaySleep.svelte';
	import { appState } from '$lib/stores';
	import { loadSettings } from '$lib/services/storageService';
	import { isSpeechRecognitionSupported } from '$lib/services/speechService';
	import { isSpeechSynthesisSupported } from '$lib/services/synthesisService';

	// PWA update prompt (US-PWA03)
	const { needRefresh, updateServiceWorker } = useRegisterSW({
		onRegistered(r) {
			r && setInterval(() => r.update(), 60 * 60 * 1000);
		}
	});

	onMount(() => {
		const settings = loadSettings();
		appState.update((s) => ({ ...s, settings, initialized: true }));
	});

	// US-V05: browser compat warning — shown once if key APIs are missing
	let showCompatWarning = $state(false);
	let compatDismissed = $state(false);
	onMount(() => {
		if (!isSpeechRecognitionSupported() || !isSpeechSynthesisSupported()) {
			showCompatWarning = true;
		}
	});

	function openSettings() {
		appState.update((s) => ({ ...s, isSettingsOpen: true }));
	}
</script>

<svelte:head>
	<title>Talking Tom</title>
</svelte:head>

<div class="viewport">
	<div class="canvas-area">
		<Stage3D />
		<GestureLayer />

		<div class="ui-layer" aria-label="Controls" role="region">
			<TranscriptDisplay />
			<div class="controls">
				<div class="mic-row">
					<MicrophoneButton />
					<button class="settings-btn" onclick={openSettings} aria-label="Open settings" title="Settings">
						⚙️
					</button>
				</div>
			</div>
		</div>

		<!-- Lifestyle overlays positioned over the canvas -->
		<OverlayBath active={$appState.lifestyleAction === 'BATHING'} />
		<OverlayFood active={$appState.lifestyleAction === 'EATING'} />
		<OverlayPee active={$appState.lifestyleAction === 'PEEING'} />
		<OverlaySleep active={$appState.lifestyleAction === 'SLEEPING'} />

		{#if showCompatWarning && !compatDismissed}
			<div class="compat-warning" role="alert" aria-live="assertive">
				<span>⚠️ Your browser has limited voice support. Touch interactions still work!</span>
				<button onclick={() => (compatDismissed = true)} aria-label="Dismiss browser compatibility warning">✕</button>
			</div>
		{/if}

		{#if $needRefresh}
			<div class="update-toast" role="alert" aria-live="assertive">
				<span>New version available</span>
				<button onclick={() => updateServiceWorker(true)}>Update</button>
			</div>
		{/if}

		<SettingsPanel />
	</div>

	<LifestylePanel />
</div>

<style>
	.viewport {
		position: fixed;
		inset: 0;
		overflow: hidden;
		background: #1a1a2e;
		display: flex;
		flex-direction: column;
	}

	.canvas-area {
		position: relative;
		flex: 1 1 0;
		min-height: 0;
		overflow: hidden;
	}

	.ui-layer {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 5;
	}

	.controls {
		position: absolute;
		bottom: env(safe-area-inset-bottom, 0px);
		left: 0;
		right: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		pointer-events: all;
	}

	.mic-row {
		display: flex;
		align-items: center;
		gap: 20px;
		padding: 16px 0 16px;
	}

	.settings-btn {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		border: 2px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(8px);
		cursor: pointer;
		font-size: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.15s ease;
	}

	.settings-btn:active {
		transform: scale(0.92);
	}

	.update-toast {
		position: fixed;
		top: 20px;
		left: 50%;
		transform: translateX(-50%);
		background: #0f3460;
		color: white;
		border-radius: 12px;
		padding: 10px 16px;
		display: flex;
		align-items: center;
		gap: 12px;
		z-index: 20;
		font-size: 14px;
	}

	.update-toast button {
		background: #e94560;
		border: none;
		color: white;
		padding: 4px 12px;
		border-radius: 8px;
		cursor: pointer;
		font-size: 13px;
		font-weight: 600;
	}

	/* US-V05: Browser compat warning */
	.compat-warning {
		position: fixed;
		bottom: 120px;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(15, 52, 96, 0.95);
		color: white;
		border-radius: 12px;
		padding: 12px 16px;
		display: flex;
		align-items: center;
		gap: 12px;
		z-index: 20;
		font-size: 13px;
		max-width: min(400px, 90vw);
		text-align: left;
		border: 1px solid rgba(255, 255, 255, 0.15);
		pointer-events: none;
	}

	.compat-warning button {
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		font-size: 16px;
		padding: 0 4px;
		flex-shrink: 0;
		pointer-events: auto;
	}
</style>
