<script lang="ts">
	/** OverlaySleep — Zzz bubbles CSS overlay for SLEEPING action */
	let { active }: { active: boolean } = $props();

	const ZZZ = ['Z', 'Z', 'Zzz'];
</script>

{#if active}
	<div class="overlay-sleep" aria-hidden="true">
		{#each ZZZ as text, i}
			<span class="zzz" style="--i:{i}">{text}</span>
		{/each}
	</div>
{/if}

<style>
	.overlay-sleep {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
	}

	.zzz {
		position: absolute;
		top: 15%;
		left: calc(58% + var(--i) * 10px);
		font-size: calc(18px + var(--i) * 6px);
		font-weight: 700;
		color: rgba(200, 230, 255, 0.9);
		text-shadow: 0 0 8px rgba(100, 180, 255, 0.6);
		font-family: system-ui, sans-serif;
		animation: zzz-float 2s ease-out calc(var(--i) * 0.7s) infinite;
	}

	@keyframes zzz-float {
		0% {
			transform: translateY(0) scale(0.6);
			opacity: 0;
		}
		20% {
			opacity: 1;
		}
		80% {
			opacity: 0.8;
		}
		100% {
			transform: translateY(-60px) scale(1.2);
			opacity: 0;
		}
	}

</style>
