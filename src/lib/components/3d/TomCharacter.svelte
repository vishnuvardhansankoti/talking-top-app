<script lang="ts">
	/**
	 * TomCharacter — Threlte component (US-3D01, US-3D02, US-3D04, US-S6-09)
	 *
	 * Loads the Tom.glb model via GLTFLoader, sets up AnimationMixer,
	 * delegates all state transitions to animationService, and exposes
	 * morph-target setter to the lip sync pipeline via synthesisService.
	 */
	import { T } from '@threlte/core';
	import { useGltf, useGltfAnimations } from '@threlte/extras';
	import { initAnimationService } from '$lib/services/animationService';
	import { setMorphInfluenceCallback } from '$lib/services/synthesisService';
	import type { AnimationName } from '$lib/types';
	import type { MorphTargetName } from '$lib/services/lipSyncService';
	import { appState } from '$lib/stores';
	import type { AnimationAction, Mesh } from 'three';

	// ─── Props ────────────────────────────────────────────────────────────────
	interface TomCharacterProps {
		/** Optional callback fired once the head mesh morph setter is ready. */
		onReady?: (setMorphInfluence: (name: MorphTargetName, weight: number) => void) => void;
	}
	let { onReady = undefined }: TomCharacterProps = $props();

	// ─── Load GLTF ───────────────────────────────────────────────────────────────
	const gltf = useGltf('/models/Tom.glb?v=2026-05-02-s7');
	// mixer = plain AnimationMixer (not a store); actions = currentWritable store
	// useGltfAnimations already registers its own useTask to tick the mixer
	const { mixer, actions } = useGltfAnimations(gltf);

	// ─── Reactive init — runs when actions store populates ────────────────────────
	$effect(() => {
		const currentActions = $actions;
		if (mixer && currentActions && Object.keys(currentActions).length > 0) {
			const typedActions = currentActions as Record<AnimationName, AnimationAction>;
			initAnimationService({ mixer, actions: typedActions });
		}
	});

	// ─── Morph-target setter exposed to lip sync pipeline ────────────────────────
	let _headMesh: Mesh | null = null;
	let _eyeMeshes: Array<{ mesh: Mesh; originalScaleY: number }> = [];
	let _sleepEyeStateApplied = false;

	function cacheEyeMeshes(scene: { traverse: (cb: (obj: unknown) => void) => void }): void {
		_eyeMeshes = [];
		scene.traverse((obj) => {
			const mesh = obj as Mesh;
			if (!mesh?.isMesh) return;
			if (!mesh.name || !/eye/i.test(mesh.name)) return;
			_eyeMeshes.push({ mesh, originalScaleY: mesh.scale.y });
		});
	}

	function setSleepEyesClosed(closed: boolean): void {
		if (_eyeMeshes.length === 0) return;
		for (const entry of _eyeMeshes) {
			entry.mesh.scale.y = closed ? Math.max(0.05, entry.originalScaleY * 0.12) : entry.originalScaleY;
		}
	}

	function setMorphInfluence(name: MorphTargetName, weight: number): void {
		if (!_headMesh?.morphTargetDictionary || !_headMesh.morphTargetInfluences) return;
		const idx = _headMesh.morphTargetDictionary[name];
		if (idx === undefined) return;
		_headMesh.morphTargetInfluences[idx] = Math.max(0, Math.min(1, weight));
	}

	// ─── Mark model loaded when scene is available ───────────────────────────────
	// Uses a Promise callback — safe from Svelte's state_unsafe_mutation restriction
	gltf.then(
		(gltfData) => {
			if (gltfData?.scene) {
				appState.update((s) => ({ ...s, modelLoaded: true }));

				// Find the first mesh with morph targets
				gltfData.scene.traverse((obj) => {
					if (_headMesh) return;
					const mesh = obj as Mesh;
					if (mesh.isMesh && mesh.morphTargetDictionary && Object.keys(mesh.morphTargetDictionary).length > 0) {
						_headMesh = mesh;
					}
				});

				// Cache likely eye meshes so sleep mode can close actual model eyes.
				cacheEyeMeshes(gltfData.scene);

				// Wire morph setter into the synthesis/lip-sync pipeline
				setMorphInfluenceCallback(setMorphInfluence);

				// Also call the optional onReady prop if provided
				if (onReady) {
					onReady(setMorphInfluence);
				}
			}
		},
		(err) => {
			console.warn('[TomCharacter] Failed to load Tom.glb:', err);
			appState.update((s) => ({ ...s, modelLoaded: true }));
		}
	);

	$effect(() => {
		const isSleeping = $appState.lifestyleAction === 'SLEEPING';
		if (isSleeping === _sleepEyeStateApplied) return;
		_sleepEyeStateApplied = isSleeping;
		setSleepEyesClosed(isSleeping);
	});
</script>

{#await gltf then gltfData}
	{#if gltfData?.scene}
		<!-- Lift Tom further so model features are clearly above bottom controls -->
		<T is={gltfData.scene} scale={1.5} position={[0, -0.20, 0]} />
	{/if}
{:catch}
	<!-- handled above via gltf.then rejection -->
{/await}
