<script lang="ts">
	/** OverlayPee — steam/mist CSS overlay for PEEING action */
	let { active }: { active: boolean } = $props();
</script>

{#if active}
	<div class="overlay-pee" aria-hidden="true">
		{#each { length: 3 } as _, i}
			<span class="steam" style="--i:{i}"></span>
		{/each}
	</div>
{/if}

<style>
	.overlay-pee {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
	}

	.steam {
		position: absolute;
		width: 16px;
		height: 24px;
		border-radius: 50%;
		background: rgba(180, 220, 255, 0.6);
		bottom: 16%;
		left: calc(45% + var(--i) * 12px);
		filter: blur(4px);
		animation: steam-rise 1.2s ease-in-out calc(var(--i) * 0.4s) infinite;
	}

	@keyframes steam-rise {
		0% {
			transform: translateY(0) scale(1);
			opacity: 0.7;
		}
		100% {
			transform: translateY(-28px) scale(1.4);
			opacity: 0;
		}
	}
</style>
