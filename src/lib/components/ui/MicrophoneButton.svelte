<script lang="ts">
	/**
	 * MicrophoneButton (US-V01, US-V02, US-V03)
	 *
	 * Initiates/stops voice recording. Also serves as the user-gesture
	 * entry point for AudioContext init (iOS requirement).
	 */
	import { onMount, onDestroy } from 'svelte';
	import {
		initAudioContext,
		requestMicrophonePermission,
		startRecording,
		stopRecording,
		playbackWithPitchShift,
		setRecordingStoppedCallback
	} from '$lib/services/audioService';
	import { speakTranscript, isSpeechSynthesisSupported, loadVoices } from '$lib/services/synthesisService';
	import { appState, audioState } from '$lib/stores';

	// Prime voice list on mount (Chrome async voices)
	onMount(() => {
		loadVoices();
		setRecordingStoppedCallback((blob) => repeatCapturedAudio(blob));
	});
	onDestroy(() => {
		setRecordingStoppedCallback(null);
	});

	let isLoading = $state(false);

	async function repeatCapturedAudio(blob: Blob | null): Promise<void> {
		const transcript = $audioState.transcript;

		if (transcript && isSpeechSynthesisSupported()) {
			// Primary path: speak transcript in Tom's funny high-pitched voice
			const pitchScale = ($appState.settings.pitchShift ?? 1.5) / 1.5;
			await speakTranscript(transcript, { pitch: Math.min(2, pitchScale * 2.0) });
		} else if (blob) {
			// Fallback: raw audio playback with pitch-shift
			await playbackWithPitchShift(blob, $appState.settings.pitchShift);
		}
	}

	async function handleTap() {
		// iOS: AudioContext must be created/resumed in a user gesture
		await initAudioContext();

		// Block mic during lifestyle actions (AC-7.x)
		if ($appState.lifestyleAction !== null) return;

		if ($audioState.isRecording) {
			const blob = await stopRecording({ notify: false });
			await repeatCapturedAudio(blob);
			return;
		}

		// First time — request mic permission
		if ($appState.micPermission === 'prompt') {
			isLoading = true;
			const result = await requestMicrophonePermission();
			appState.update((s) => ({ ...s, micPermission: result }));
			isLoading = false;
			if (result === 'denied') return;
		}

		if ($appState.micPermission === 'denied') return;

		await startRecording();
	}

	const label = $derived(
		isLoading
			? 'Requesting microphone permission…'
			: $audioState.isRecording
				? 'Stop recording'
				: $appState.micPermission === 'denied'
					? 'Microphone access denied'
					: 'Start recording'
	);
</script>

<button
	class="mic-button"
	class:recording={$audioState.isRecording}
	class:denied={$appState.micPermission === 'denied'}
	class:loading={isLoading}
	onclick={handleTap}
	disabled={isLoading || $appState.micPermission === 'denied'}
	aria-label={label}
	aria-pressed={$audioState.isRecording}
>
	{#if isLoading}
		<span class="icon" aria-hidden="true">⏳</span>
	{:else if $audioState.isRecording}
		<span class="icon" aria-hidden="true">⏹</span>
	{:else if $appState.micPermission === 'denied'}
		<span class="icon" aria-hidden="true">🚫</span>
	{:else}
		<span class="icon" aria-hidden="true">🎙</span>
	{/if}
</button>

<style>
	.mic-button {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		border: 3px solid rgba(255, 255, 255, 0.3);
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(8px);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			transform 0.15s ease,
			background 0.2s ease,
			border-color 0.2s ease;
		-webkit-tap-highlight-color: transparent;
	}

	.mic-button:active {
		transform: scale(0.94);
	}

	.mic-button.recording {
		background: rgba(233, 69, 96, 0.4);
		border-color: #e94560;
		animation: pulse 1s ease-in-out infinite;
	}

	.mic-button.denied {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.icon {
		font-size: 24px;
		line-height: 1;
	}

	@keyframes pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(233, 69, 96, 0.4);
		}
		50% {
			box-shadow: 0 0 0 12px rgba(233, 69, 96, 0);
		}
	}
</style>
