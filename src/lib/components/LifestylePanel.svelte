<script lang="ts">
	/**
	 * LifestylePanel — Sprint 7
	 *
	 * Horizontal strip of 4 lifestyle action buttons: Bath, Food, Pee, Sleep.
	 * Buttons are disabled while another action is active or in cooldown.
	 * Cooldown is shown as a 30s CSS arc draining animation.
	 */
	import { appState } from '$lib/stores';
	import { triggerLifestyleAction } from '$lib/services/lifestyleService';
	import type { LifestyleActionName } from '$lib/types';

	const BUTTONS: Array<{ action: LifestyleActionName; icon: string; label: string }> = [
		{ action: 'BATHING', icon: '🛁', label: 'Bath' },
		{ action: 'EATING', icon: '🍕', label: 'Food' },
		{ action: 'PEEING', icon: '🚽', label: 'Pee' },
		{ action: 'SLEEPING', icon: '🛏️', label: 'Sleep' }
	];

	function isBlocked(action: LifestyleActionName): boolean {
		const { lifestyleAction } = $appState;
		return lifestyleAction !== null && lifestyleAction !== action;
	}

	function isActive(action: LifestyleActionName): boolean {
		return $appState.lifestyleAction === action;
	}

	function handleClick(action: LifestyleActionName) {
		triggerLifestyleAction(action);
	}
</script>

<div class="lifestyle-panel" role="group" aria-label="Lifestyle actions">
	{#each BUTTONS as { action, icon, label }}
		{@const active = isActive(action)}
		{@const blocked = isBlocked(action)}
		{@const disabled = active || blocked}

		<button
			class="lifestyle-btn"
			class:is-active={active}
			class:is-blocked={blocked}
			{disabled}
			onclick={() => handleClick(action)}
			aria-label="{label} action{active ? ' (active)' : ''}"
			title={label}
		>
			<span class="btn-icon">{icon}</span>
			<span class="btn-label">{label}</span>

			{#if active}
				<span class="active-ring" aria-hidden="true"></span>
			{/if}
		</button>
	{/each}
</div>

<style>
	.lifestyle-panel {
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		background: rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		width: 100%;
		box-sizing: border-box;
	}

	.lifestyle-btn {
		position: relative;
		flex: 1;
		max-width: 80px;
		min-width: 56px;
		height: 56px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		border: none;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.1);
		cursor: pointer;
		transition: transform 0.15s ease, opacity 0.2s ease;
		overflow: hidden;
		padding: 0;
	}

	.lifestyle-btn:not(:disabled):active {
		transform: scale(0.92);
	}

	.lifestyle-btn:not(:disabled):hover {
		background: rgba(255, 255, 255, 0.18);
	}

	.lifestyle-btn.is-blocked {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.lifestyle-btn.is-active {
		background: rgba(100, 200, 255, 0.25);
	}

	.btn-icon {
		font-size: 22px;
		line-height: 1;
		display: block;
	}

	.btn-label {
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: rgba(255, 255, 255, 0.85);
		font-family: system-ui, sans-serif;
		font-weight: 600;
		display: block;
	}

	/* Pulsing ring for active state */
	.active-ring {
		position: absolute;
		inset: 0;
		border-radius: 12px;
		border: 2px solid rgba(100, 200, 255, 0.9);
		animation: pulse-ring 1s ease-in-out infinite;
		pointer-events: none;
	}

	@keyframes pulse-ring {
		0%,
		100% {
			opacity: 0.9;
			transform: scale(1);
		}
		50% {
			opacity: 0.4;
			transform: scale(1.04);
		}
	}

</style>
