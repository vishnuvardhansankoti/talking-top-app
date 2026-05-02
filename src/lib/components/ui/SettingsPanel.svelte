<script lang="ts">
	/**
	 * SettingsPanel (US-UI07)
	 *
	 * Slide-in panel for volume, pitch, and display preferences.
	 * Persists changes via storageService.
	 */
	import { appState } from '$lib/stores';
	import { saveSettings } from '$lib/services/storageService';
	import { setVolume, setPitchShift } from '$lib/services/audioService';
	import { fly, fade } from 'svelte/transition';

	function close() {
		appState.update((s) => ({ ...s, isSettingsOpen: false }));
	}

	function handleVolumeChange(e: Event) {
		const value = parseFloat((e.target as HTMLInputElement).value);
		setVolume(value);
		appState.update((s) => ({ ...s, settings: { ...s.settings, volume: value } }));
		saveSettings({ ...$appState.settings, volume: value });
	}

	function handlePitchChange(e: Event) {
		const value = parseFloat((e.target as HTMLInputElement).value);
		setPitchShift(value);
		appState.update((s) => ({ ...s, settings: { ...s.settings, pitchShift: value } }));
		saveSettings({ ...$appState.settings, pitchShift: value });
	}

	function handleTranscriptToggle(e: Event) {
		const value = (e.target as HTMLInputElement).checked;
		appState.update((s) => ({ ...s, settings: { ...s.settings, showTranscript: value } }));
		saveSettings({ ...$appState.settings, showTranscript: value });
	}

	function handleHapticToggle(e: Event) {
		const value = (e.target as HTMLInputElement).checked;
		appState.update((s) => ({ ...s, settings: { ...s.settings, hapticFeedback: value } }));
		saveSettings({ ...$appState.settings, hapticFeedback: value });
	}
</script>

{#if $appState.isSettingsOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="backdrop"
		onclick={close}
		onkeydown={(e) => e.key === 'Escape' && close()}
		role="button"
		tabindex="0"
		aria-label="Close settings"
		transition:fade={{ duration: 200 }}
	></div>

	<div
		class="panel"
		role="dialog"
		aria-modal="true"
		aria-label="Settings"
		transition:fly={{ x: 320, duration: 300 }}
	>
		<div class="panel-header">
			<h2>Settings</h2>
			<button class="close-btn" onclick={close} aria-label="Close settings">✕</button>
		</div>

		<div class="panel-body">
			<label class="setting-row">
				<span>Volume</span>
				<input
					type="range"
					min="0"
					max="1"
					step="0.05"
					value={$appState.settings.volume}
					onchange={handleVolumeChange}
					aria-label="Volume"
				/>
				<span class="value">{Math.round($appState.settings.volume * 100)}%</span>
			</label>

			<label class="setting-row">
				<span>Pitch</span>
				<input
					type="range"
					min="1.2"
					max="1.8"
					step="0.05"
					value={$appState.settings.pitchShift}
					onchange={handlePitchChange}
					aria-label="Pitch shift"
				/>
				<span class="value">{$appState.settings.pitchShift.toFixed(1)}×</span>
			</label>

			<label class="setting-row toggle">
				<span>Show transcript</span>
				<input
					type="checkbox"
					checked={$appState.settings.showTranscript}
					onchange={handleTranscriptToggle}
					aria-label="Show transcript"
				/>
			</label>

			<label class="setting-row toggle">
				<span>Haptic feedback</span>
				<input
					type="checkbox"
					checked={$appState.settings.hapticFeedback}
					onchange={handleHapticToggle}
					aria-label="Haptic feedback"
				/>
			</label>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 10;
	}

	.panel {
		position: fixed;
		top: 0;
		right: 0;
		height: 100%;
		width: min(320px, 85vw);
		background: #16213e;
		z-index: 11;
		display: flex;
		flex-direction: column;
		padding: 24px 20px;
		box-shadow: -8px 0 32px rgba(0, 0, 0, 0.4);
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 32px;
	}

	h2 {
		margin: 0;
		color: white;
		font-size: 20px;
		font-weight: 600;
	}

	.close-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		font-size: 20px;
		cursor: pointer;
		padding: 4px 8px;
	}

	.panel-body {
		display: flex;
		flex-direction: column;
		gap: 28px;
	}

	.setting-row {
		display: flex;
		align-items: center;
		gap: 12px;
		color: rgba(255, 255, 255, 0.9);
		font-size: 15px;
	}

	.setting-row span:first-child {
		min-width: 90px;
	}

	.setting-row input[type='range'] {
		flex: 1;
		accent-color: #e94560;
	}

	.value {
		min-width: 40px;
		text-align: right;
		font-size: 13px;
		color: rgba(255, 255, 255, 0.6);
	}

	.setting-row.toggle {
		justify-content: space-between;
	}
</style>
