<script lang="ts">
	/**
	 * TranscriptDisplay (US-UI01, US-V06)
	 *
	 * Optionally shows the last recognized transcript.
	 * Auto-hides after 4 seconds. Degrades gracefully (Firefox has no STT).
	 */
	import { audioState, appState } from '$lib/stores';
	import { fly } from 'svelte/transition';

	let visible = $state(false);
	let hideTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		const text = $audioState.transcript;
		if (text && $appState.settings.showTranscript) {
			visible = true;
			if (hideTimer) clearTimeout(hideTimer);
			hideTimer = setTimeout(() => {
				visible = false;
			}, 4000);
		}
	});
</script>

{#if visible && $audioState.transcript}
	<div
		class="transcript"
		role="status"
		aria-live="polite"
		aria-atomic="true"
		transition:fly={{ y: 20, duration: 250 }}
	>
		<p>{$audioState.transcript}</p>
	</div>
{/if}

<style>
	.transcript {
		position: fixed;
		bottom: 140px;
		left: 50%;
		transform: translateX(-50%);
		max-width: min(480px, 90vw);
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(12px);
		border-radius: 12px;
		padding: 10px 18px;
		color: white;
		font-size: 14px;
		text-align: center;
		pointer-events: none;
	}

	p {
		margin: 0;
		line-height: 1.4;
	}
</style>
