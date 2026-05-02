<script lang="ts">
	/** OverlayBath — water droplets CSS overlay for BATHING action */
	let { active }: { active: boolean } = $props();
</script>

{#if active}
	<div class="overlay-bath" aria-hidden="true">
		<div class="shower-head"></div>
		<div class="water-column">
			{#each { length: 18 } as _, i}
				<span class="water-drop" style="--i:{i}"></span>
			{/each}
		</div>
	</div>
{/if}

<style>
	.overlay-bath {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
	}

	.shower-head {
		position: absolute;
		top: 36%;
		left: 50%;
		transform: translate(-50%, -100%);
		width: 44px;
		height: 16px;
		border-radius: 10px;
		background: linear-gradient(180deg, rgba(220, 230, 245, 0.95), rgba(140, 155, 180, 0.95));
		box-shadow:
			0 2px 8px rgba(0, 0, 0, 0.25),
			inset 0 -2px 3px rgba(40, 50, 70, 0.25);
	}

	.shower-head::after {
		content: '';
		position: absolute;
		left: 50%;
		top: -10px;
		transform: translateX(-50%);
		width: 6px;
		height: 12px;
		border-radius: 3px;
		background: rgba(185, 198, 220, 0.9);
	}

	.water-column {
		position: absolute;
		left: 50%;
		top: 36%;
		width: 120px;
		height: 170px;
		transform: translateX(-50%);
	}

	.water-drop {
		position: absolute;
		top: 0;
		left: calc(8px + var(--i) * 6px);
		width: 2px;
		height: 26px;
		border-radius: 999px;
		background: linear-gradient(180deg, rgba(185, 230, 255, 0.95), rgba(115, 195, 255, 0.35));
		filter: blur(0.25px);
		opacity: 0;
		animation: shower-fall 0.9s linear calc(var(--i) * 0.06s) infinite;
	}

	@keyframes shower-fall {
		0% {
			transform: translateY(0) scaleY(0.9);
			opacity: 1;
		}
		100% {
			transform: translateY(145px) scaleY(1.2);
			opacity: 0;
		}
	}
</style>
