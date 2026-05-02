<script lang="ts">
	/** OverlayFood — food bowl + bite particles CSS overlay for EATING action */
	let { active }: { active: boolean } = $props();
</script>

{#if active}
	<div class="overlay-food" aria-hidden="true">
		<div class="bowl">🍲</div>
		{#each { length: 5 } as _, i}
			<span class="particle" style="--i:{i}"></span>
		{/each}
	</div>
{/if}

<style>
	.overlay-food {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
	}

	.bowl {
		position: absolute;
		bottom: 24%;
		left: 50%;
		transform: translateX(-50%);
		font-size: 48px;
		animation: bowl-slide 0.3s ease-out forwards;
	}

	@keyframes bowl-slide {
		from {
			transform: translateX(-50%) translateY(60px);
			opacity: 0;
		}
		to {
			transform: translateX(-50%) translateY(0);
			opacity: 1;
		}
	}

	.particle {
		position: absolute;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: rgba(255, 180, 60, 0.9);
		bottom: calc(24% + 48px);
		left: 50%;
		transform: translateX(-50%);
		animation: bite-burst 0.5s ease-out calc(0.5s + var(--i) * 0.7s) both;
		--offset: calc((var(--i) - 2) * 24px);
	}

	@keyframes bite-burst {
		0% {
			transform: translateX(calc(-50% + var(--offset))) translateY(0) scale(1);
			opacity: 1;
		}
		100% {
			transform: translateX(calc(-50% + var(--offset))) translateY(-50px) scale(0.2);
			opacity: 0;
		}
	}
</style>
