<script lang="ts">
	/**
	 * TomCharacter — Threlte component (US-3D01, US-3D02, US-3D04, US-S6-09)
	 *
	 * Loads the Tom.glb model via GLTFLoader, sets up AnimationMixer,
	 * delegates all state transitions to animationService, and exposes
	 * morph-target setter to the lip sync pipeline via synthesisService.
	 */
	import { T, useTask } from '@threlte/core';
	import { useGltf, useGltfAnimations } from '@threlte/extras';
	import { initAnimationService } from '$lib/services/animationService';
	import { setMorphInfluenceCallback } from '$lib/services/synthesisService';
	import type { AnimationName } from '$lib/types';
	import type { MorphTargetName } from '$lib/services/lipSyncService';
	import { appState } from '$lib/stores';
	import type { AnimationAction, Mesh, Object3D } from 'three';

	// ─── Props ────────────────────────────────────────────────────────────────
	interface TomCharacterProps {
		/** Optional callback fired once the head mesh morph setter is ready. */
		onReady?: (setMorphInfluence: (name: MorphTargetName, weight: number) => void) => void;
	}
	let { onReady = undefined }: TomCharacterProps = $props();

	// ─── Load GLTF ───────────────────────────────────────────────────────────────
	const gltf = useGltf('/models/Tom.glb?v=2026-05-02-s10');
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

	// ─── Procedural animation state ──────────────────────────────────────────────
	let _jawBone: Object3D | null = null;
	let _leftEarMesh: Mesh | null = null;
	let _rightEarMesh: Mesh | null = null;
	let _isCurrentlySleeping = false;

	// Eye blink
	let _blinkTimer = 0;
	let _nextBlinkIn = 3.0;
	let _blinkProgress = -1;
	const BLINK_DURATION = 0.15;

	// Ear twitch
	let _earTwitchTimer = 0;
	let _nextEarTwitchIn = 5.0;
	let _earTwitchProgress = -1;
	const EAR_TWITCH_DURATION = 0.50;
	function cacheEyeMeshes(scene: { traverse: (cb: (obj: unknown) => void) => void }): void {
		_eyeMeshes = [];
		scene.traverse((obj) => {
			const mesh = obj as Mesh;
			if (!mesh?.isMesh) return;
			// Include sclera, iris, pupil, and glints so blinking looks correct
			if (!mesh.name || !/eye|iris|pupil|glint/i.test(mesh.name)) return;
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
			// Drive jaw bone rotation for clearly visible mouth movement
			if (name === 'mouthOpen' && _jawBone) {
				_jawBone.rotation.x = weight * 0.45; // up to ~26° open
			}
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

				// Cache jaw bone and ear meshes for procedural animations
				gltfData.scene.traverse((obj) => {
					const node = obj as Object3D;
					if (node.name === 'Bone_jaw') _jawBone = node;
					if (node.name === 'Tom_LeftEar') _leftEarMesh = node as Mesh;
					if (node.name === 'Tom_RightEar') _rightEarMesh = node as Mesh;
				});
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
		_isCurrentlySleeping = isSleeping;
		if (isSleeping === _sleepEyeStateApplied) return;
		_sleepEyeStateApplied = isSleeping;
		setSleepEyesClosed(isSleeping);
	});

	// ─── Per-frame procedural animations ────────────────────────────────────────
	useTask((delta: number) => {
		// Eye blinking — suppressed during sleep (eyes already closed)
		if (!_isCurrentlySleeping && _eyeMeshes.length > 0) {
			_blinkTimer += delta;
			if (_blinkTimer >= _nextBlinkIn && _blinkProgress < 0) {
				_blinkProgress = 0;
				_blinkTimer = 0;
				_nextBlinkIn = 2.0 + Math.random() * 3.5;
			}
			if (_blinkProgress >= 0) {
				_blinkProgress += delta / BLINK_DURATION;
				const t = Math.min(1, _blinkProgress);
				const eyeScaleY = Math.max(0.04, 1 - Math.sin(Math.PI * t));
				for (const e of _eyeMeshes) e.mesh.scale.y = eyeScaleY;
				if (_blinkProgress >= 1) {
					_blinkProgress = -1;
					for (const e of _eyeMeshes) e.mesh.scale.y = e.originalScaleY;
				}
			}
		}

		// Ear twitches — periodic, subtle, happens anytime including sleep
		_earTwitchTimer += delta;
		if (_earTwitchTimer >= _nextEarTwitchIn && _earTwitchProgress < 0) {
			_earTwitchProgress = 0;
			_earTwitchTimer = 0;
			_nextEarTwitchIn = 3.0 + Math.random() * 5.0;
		}
		if (_earTwitchProgress >= 0) {
			_earTwitchProgress += delta / EAR_TWITCH_DURATION;
			const angle = Math.sin(Math.PI * Math.min(1, _earTwitchProgress)) * 0.18;
			if (_leftEarMesh) _leftEarMesh.rotation.z = 0.15 + angle;
			if (_rightEarMesh) _rightEarMesh.rotation.z = -0.15 - angle;
			if (_earTwitchProgress >= 1) {
				_earTwitchProgress = -1;
				if (_leftEarMesh) _leftEarMesh.rotation.z = 0.15;
				if (_rightEarMesh) _rightEarMesh.rotation.z = -0.15;
			}
		}
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
