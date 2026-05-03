/**
 * generate-tom-glb.mjs
 *
 * Procedurally generates Tom.glb — a Talking Tom inspired cat character.
 *
 * Key improvements:
 *  - Meshes are correctly PARENTED to bones so animations visually move the model
 *  - Classic Tom look: bigger head, bright green eyes, pink inner ears, whiskers
 *  - Bone_jaw driven by lip sync for visible mouth movements
 *  - Richer animations: IDLE (breathing + tail wag), LISTENING (body lean)
 *
 * Scene hierarchy:
 *   Bone_spine (world y=-0.25)
 *   ├── Tom_Body, Tom_Belly
 *   ├── Bone_head (world y=0.27)
 *   │   ├── Tom_Head (head center world y≈0.55, radius 0.30)
 *   │   ├── Ears (outer+inner), Eyes (white+iris+pupil), Nose, Whiskers
 *   │   └── Bone_jaw → Tom_Chin, Tom_MouthDark
 *   └── Bone_tail → Tom_Tail
 *
 * Usage: node scripts/generate-tom-glb.mjs
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ─── Node.js polyfills required by GLTFExporter ───────────────────────────────

if (typeof self === 'undefined') {
	global.self = global;
}

if (typeof FileReader === 'undefined') {
	global.FileReader = class FakeFileReader {
		constructor() {
			this.result = null;
			this.onload = null;
			this.onloadend = null;
			this.onerror = null;
		}
		readAsArrayBuffer(blob) {
			Promise.resolve().then(async () => {
				try {
					this.result = await blob.arrayBuffer();
					if (this.onload) this.onload({ target: this });
					if (this.onloadend) this.onloadend({ target: this });
				} catch (e) {
					if (this.onerror) this.onerror(e);
					if (this.onloadend) this.onloadend({ target: this });
				}
			});
		}
	};
}

import {
	AnimationClip,
	Bone,
	ConeGeometry,
	CylinderGeometry,
	Euler,
	Float32BufferAttribute,
	Mesh,
	MeshStandardMaterial,
	Quaternion,
	Scene,
	SphereGeometry,
	VectorKeyframeTrack,
	QuaternionKeyframeTrack
} from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// ─── Paths ────────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '..', 'static', 'models', 'Tom.glb');

// ─── Utility: Euler → Quaternion flat array ───────────────────────────────────

function eulerToQArr(ex, ey, ez) {
	const q = new Quaternion().setFromEuler(new Euler(ex, ey, ez));
	return [q.x, q.y, q.z, q.w];
}

const Q_IDENTITY = [0, 0, 0, 1];

// ─── 1. Build Morph-Target Head Geometry ────────────────────────────────────

function buildHeadGeometry() {
	// Slightly larger head for a more classic Talking Tom silhouette
	const sphere = new SphereGeometry(0.31, 20, 14);
	const base = sphere.toNonIndexed(); // absolute position array

	const posArr = base.attributes.position.array;
	const count = posArr.length / 3;

	// --- morph target 0: mouthOpen
	// Only deforms the front-lower area (y < -0.06, z > 0) for a jaw-opening effect
	const morphOpen = new Float32Array(posArr.length);
	for (let i = 0; i < count; i++) {
		const y = posArr[i * 3 + 1];
		const z = posArr[i * 3 + 2];
		morphOpen[i * 3] = posArr[i * 3];
		if (y < -0.06 && z > 0) {
			// Strength ramps up with depth below lip line and toward front
			const strength = Math.min(1, ((-y - 0.06) / 0.22) * (z / 0.28));
			morphOpen[i * 3 + 1] = posArr[i * 3 + 1] - 0.16 * strength;
			morphOpen[i * 3 + 2] = posArr[i * 3 + 2] + 0.07 * strength;
		} else {
			morphOpen[i * 3 + 1] = posArr[i * 3 + 1];
			morphOpen[i * 3 + 2] = posArr[i * 3 + 2];
		}
	}

	// --- morph target 1: mouthWide (equatorial vertices spread outward)
	const morphWide = new Float32Array(posArr.length);
	for (let i = 0; i < count; i++) {
		const y   = posArr[i * 3 + 1];
		const x   = posArr[i * 3];
		const abs = Math.abs(y);
		morphWide[i * 3]     = abs < 0.12 ? x + Math.sign(x || 1) * 0.08 : posArr[i * 3];
		morphWide[i * 3 + 1] = posArr[i * 3 + 1];
		morphWide[i * 3 + 2] = posArr[i * 3 + 2];
	}

	// Attach morph attributes (absolute)
	const mouthOpenAttr = new Float32BufferAttribute(morphOpen, 3);
	mouthOpenAttr.name = 'mouthOpen';
	const mouthWideAttr = new Float32BufferAttribute(morphWide, 3);
	mouthWideAttr.name = 'mouthWide';

	base.morphAttributes.position = [mouthOpenAttr, mouthWideAttr];
	base.morphTargetsRelative = false;

	return base;
}

// ─── 2. Build Bone Hierarchy ─────────────────────────────────────────────────

function buildBones() {
	const spine = new Bone();
	spine.name = 'Bone_spine';
	spine.position.set(0, -0.25, 0);

	const head = new Bone();
	head.name = 'Bone_head';
	head.position.set(0, 0.52, 0); // relative to spine → world y = 0.27


	// Jaw pivot sits at the mouth area (in head-bone local space)
	// head-bone world y = 0.27 → mouth world y ≈ 0.42 → jaw local y = 0.15
	const jaw = new Bone();
	jaw.name = 'Bone_jaw';
	jaw.position.set(0, 0.15, 0.24);
	head.add(jaw);

	const tail = new Bone();
	tail.name = 'Bone_tail';
	tail.position.set(0, -0.3, -0.2); // relative to spine
	spine.add(head);
	spine.add(tail);

	return { spine, headBone: head, jawBone: jaw, tailBone: tail };
}

// ─── 3. Build Animation Clips ────────────────────────────────────────────────

function buildAnimationClips() {
	const Q0 = Q_IDENTITY;

	// ── IDLE: 3.0s LoopRepeat — breathing + tail wag + head micro-movement ──
	const tailWagL  = eulerToQArr(0, 0,  0.32);
	const tailWagR  = eulerToQArr(0, 0, -0.32);
	const headMicro = eulerToQArr(0, 0,  0.025);
	const idle = new AnimationClip('IDLE', 3.0, [
		// Breathing: spine scale Y pulses
		new VectorKeyframeTrack(
			'Bone_spine.scale',
			[0, 0.8, 1.5, 2.3, 3.0],
			[1,1,1,  1,1.022,1,  1,1,1,  1,1.020,1,  1,1,1]
		),
		// Tail wagging left and right (2 cycles per loop)
		new QuaternionKeyframeTrack(
			'Bone_tail.quaternion',
			[0, 0.4, 0.75, 1.1, 1.5, 1.9, 2.25, 2.65, 3.0],
			[...Q0, ...tailWagL, ...Q0, ...tailWagR, ...Q0, ...tailWagL, ...Q0, ...tailWagR, ...Q0]
		),
		// Subtle head micro tilt back and forth
		new QuaternionKeyframeTrack(
			'Bone_head.quaternion',
			[0, 1.5, 3.0],
			[...headMicro, ...eulerToQArr(0, 0, -0.025), ...headMicro]
		)
	]);

	// ── LISTENING: 2.0s LoopRepeat — body lean forward + engaged head nods ──
	const listenLeanQ = eulerToQArr(0.11, 0, 0);  // body leans ~6° forward
	const listenTiltQ = eulerToQArr(0.06, 0, 0.13); // head tilt + slight fwd
	const tailPerkQ   = eulerToQArr(-0.30, 0, 0);    // tail lifts back
	const listening = new AnimationClip('LISTENING', 2.0, [
		// Body leans in to listen
		new QuaternionKeyframeTrack(
			'Bone_spine.quaternion',
			[0, 0.35, 1.7, 2.0],
			[...Q0, ...listenLeanQ, ...listenLeanQ, ...Q0]
		),
		// Head nods attentively twice
		new QuaternionKeyframeTrack(
			'Bone_head.quaternion',
			[0, 0.4, 0.8, 1.2, 1.6, 2.0],
			[...Q0, ...listenTiltQ, ...Q0, ...listenTiltQ, ...Q0, ...Q0]
		),
		// Tail perks up
		new QuaternionKeyframeTrack(
			'Bone_tail.quaternion',
			[0, 0.35, 2.0],
			[...Q0, ...tailPerkQ, ...tailPerkQ]
		)
	]);

	// ── SPEAKING: 0.5s LoopRepeat — energetic head nod + body sway ──────────
	// (Jaw movement is driven separately by lip sync in TomCharacter.svelte)
	const speakNodQ  = eulerToQArr(0.14, 0, 0);
	const speakSwayQ = eulerToQArr(0, 0, 0.06);
	const speaking = new AnimationClip('SPEAKING', 0.5, [
		new QuaternionKeyframeTrack(
			'Bone_head.quaternion',
			[0, 0.25, 0.5],
			[...Q0, ...speakNodQ, ...Q0]
		),
		new QuaternionKeyframeTrack(
			'Bone_spine.quaternion',
			[0, 0.25, 0.5],
			[...Q0, ...speakSwayQ, ...Q0]
		)
	]);

	// ── REACTING_POKE: 0.6s LoopOnce ────────────────────────────────────────
	const pokeHeadQ0 = eulerToQArr(0, 0, 0);
	const pokeHeadQ1 = eulerToQArr(-0.30, 0, 0);
	const reactingPoke = new AnimationClip('REACTING_POKE', 0.6, [
		new VectorKeyframeTrack(
			'Bone_spine.position',
			[0, 0.1, 0.4, 0.6],
			[0, 0, 0,  -0.08, 0.02, 0,  0.02, 0, 0,  0, 0, 0]
		),
		new QuaternionKeyframeTrack(
			'Bone_head.quaternion',
			[0, 0.1, 0.6],
			[...pokeHeadQ0, ...pokeHeadQ1, ...pokeHeadQ0]
		)
	]);

	// ── REACTING_PET: 1.5s LoopOnce ─────────────────────────────────────────
	const petHeadQ0  = eulerToQArr(0, 0, 0);
	const petHeadQ1  = eulerToQArr(0, 0, 0.17);
	const tailQL     = eulerToQArr(0, 0, 0.38);
	const tailQR     = eulerToQArr(0, 0, -0.38);
	const reactingPet = new AnimationClip('REACTING_PET', 1.5, [
		new QuaternionKeyframeTrack(
			'Bone_head.quaternion',
			[0, 0.75, 1.5],
			[...petHeadQ0, ...petHeadQ1, ...petHeadQ0]
		),
		new QuaternionKeyframeTrack(
			'Bone_tail.quaternion',
			[0, 0.5, 1.0, 1.5],
			[...Q0, ...tailQL, ...tailQR, ...Q0]
		)
	]);

	// ── REACTING_HOLD: 1.8s LoopOnce ────────────────────────────────────────
	const holdRotQ0 = eulerToQArr(0, 0, 0);
	const holdRotQ1 = eulerToQArr(0.05, 0, 0.05);
	const reactingHold = new AnimationClip('REACTING_HOLD', 1.8, [
		new VectorKeyframeTrack(
			'Bone_spine.position',
			[0, 0.3, 1.5, 1.8],
			[0, 0, 0,  0, 0.08, 0,  0, 0.08, 0,  0, 0, 0]
		),
		new QuaternionKeyframeTrack(
			'Bone_spine.quaternion',
			[0, 0.3, 1.5, 1.8],
			[...holdRotQ0, ...holdRotQ1, ...holdRotQ1, ...holdRotQ0]
		)
	]);

	// ── BATHING: 4.0s LoopOnce ──────────────────────────────────────────────
	// Lean forward → sway L/R → shake head dry → return
	const bathHeadFwd   = eulerToQArr(0.35, 0, 0);
	const bathSwayL     = eulerToQArr(0, 0,  0.087);
	const bathSwayR     = eulerToQArr(0, 0, -0.087);
	const bathShakeL    = eulerToQArr(0.35, 0.26, 0);
	const bathShakeR    = eulerToQArr(0.35,-0.26, 0);
	const bathing = new AnimationClip('BATHING', 4.0, [
		new QuaternionKeyframeTrack(
			'Bone_head.quaternion',
			[0, 0.5, 3.0, 3.25, 3.5, 3.75, 4.0],
			[...Q_IDENTITY, ...bathHeadFwd, ...bathHeadFwd, ...bathShakeL, ...bathShakeR, ...bathShakeL, ...Q_IDENTITY]
		),
		new QuaternionKeyframeTrack(
			'Bone_spine.quaternion',
			[0, 0.5, 1.5, 2.5, 3.0, 4.0],
			[...Q_IDENTITY, ...bathSwayL, ...bathSwayR, ...bathSwayL, ...Q_IDENTITY, ...Q_IDENTITY]
		)
	]);

	// ── EATING: 3.0s LoopOnce ───────────────────────────────────────────────
	// Dip head → body bounce x3 → tail wag → return
	const eatHeadDip    = eulerToQArr(-0.52, 0, 0);
	const eatTailWagL   = eulerToQArr(0, 0,  0.22);
	const eatTailWagR   = eulerToQArr(0, 0, -0.22);
	const eating = new AnimationClip('EATING', 3.0, [
		new QuaternionKeyframeTrack(
			'Bone_head.quaternion',
			[0, 0.3, 3.0],
			[...Q0, ...eatHeadDip, ...Q0]
		),
		new VectorKeyframeTrack(
			'Bone_spine.position',
			[0, 0.3, 0.8, 1.2, 1.8, 2.2, 2.5, 3.0],
			[0,0,0, 0,-0.04,0, 0,0.02,0, 0,-0.04,0, 0,0.02,0, 0,-0.04,0, 0,0,0, 0,0,0]
		),
		new QuaternionKeyframeTrack(
			'Bone_tail.quaternion',
			[0, 1.5, 2.0, 2.5, 3.0],
			[...Q0, ...eatTailWagL, ...eatTailWagR, ...eatTailWagL, ...Q0]
		)
	]);

	// ── PEEING: 3.0s LoopOnce ───────────────────────────────────────────────
	// Crouch → hold with sway → shake → stand
	const peeHeadDown   = eulerToQArr(0.17, 0, 0);
	const peeShakeL     = eulerToQArr(0, 0,  0.087);
	const peeShakeR     = eulerToQArr(0, 0, -0.087);
	const peeing = new AnimationClip('PEEING', 3.0, [
		new VectorKeyframeTrack(
			'Bone_spine.position',
			[0, 0.5, 2.0, 3.0],
			[0,0,0, 0,-0.08,0, 0,-0.08,0, 0,0,0]
		),
		new QuaternionKeyframeTrack(
			'Bone_head.quaternion',
			[0, 0.5, 2.0, 3.0],
			[...Q0, ...peeHeadDown, ...peeHeadDown, ...Q0]
		),
		new QuaternionKeyframeTrack(
			'Bone_spine.quaternion',
			[0, 0.5, 2.0, 2.3, 2.6, 3.0],
			[...Q0, ...Q0, ...Q0, ...peeShakeL, ...peeShakeR, ...Q0]
		)
	]);

	// ── SLEEPING: 4.0s LoopRepeat ────────────────────────────────────────────
	// Droop head → slow breathing (seamless loop at t=0 and t=4)
	const sleepHeadDroop = eulerToQArr(0.35, 0, 0);
	const sleeping = new AnimationClip('SLEEPING', 4.0, [
		new QuaternionKeyframeTrack(
			'Bone_head.quaternion',
			[0, 0.5, 4.0],
			[...Q0, ...sleepHeadDroop, ...sleepHeadDroop]
		),
		new VectorKeyframeTrack(
			'Bone_spine.position',
			[0, 0.5, 1.5, 2.5, 3.5, 4.0],
			[0,0,0, 0,-0.04,0, 0,-0.02,0, 0,-0.04,0, 0,-0.02,0, 0,-0.04,0]
		)
	]);

	return [idle, listening, speaking, reactingPoke, reactingPet, reactingHold, bathing, eating, peeing, sleeping];
}

// ─── 4. Assemble Scene ───────────────────────────────────────────────────────

function buildScene() {
	const scene = new Scene();
	scene.name = 'Tom';

	// ── Bones ──
	const { spine, headBone, jawBone, tailBone } = buildBones();
	scene.add(spine);

	// ── Shared materials ──
	const furMat      = new MeshStandardMaterial({ color: 0x8f9096, roughness: 0.72 });
	const bellyMat    = new MeshStandardMaterial({ color: 0xe7e7ea, roughness: 0.84 });
	const eyeWhiteMat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.30 });
	const irisMat     = new MeshStandardMaterial({ color: 0x63d93b, roughness: 0.35 });
	const pupilMat    = new MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.50 });
	const noseMat     = new MeshStandardMaterial({ color: 0xf59bac, roughness: 0.36 });
	const innerEarMat = new MeshStandardMaterial({ color: 0xde8ca2, roughness: 0.55 });
	const mouthMat    = new MeshStandardMaterial({ color: 0xa84a5e, roughness: 0.55 });
	const whiskerMat  = new MeshStandardMaterial({ color: 0xf8f8f2, roughness: 0.50 });

	// ── Head mesh (parented to headBone) ──
	// headBone world y = 0.27; head sphere center at local (0, 0.28, 0) → world y = 0.55
	const headGeom = buildHeadGeometry();
	const headMesh = new Mesh(headGeom, furMat.clone());
	headMesh.name = 'Tom_Head';
	headMesh.updateMorphTargets();
	if (!headMesh.morphTargetDictionary || Object.keys(headMesh.morphTargetDictionary).length === 0) {
		headMesh.morphTargetDictionary = { mouthOpen: 0, mouthWide: 1 };
	}
	headMesh.morphTargetInfluences = [0, 0];
	headMesh.position.set(0, 0.29, 0); // local within headBone
	headBone.add(headMesh);

	// ── Ears (parented to headBone so they move with the head) ──
	// Ear local position = ear world − headBone world(0,0.27,0)
	const outerEarGeom = new ConeGeometry(0.095, 0.21, 12);
	const innerEarGeom = new ConeGeometry(0.065, 0.17, 10);

	const leftEar = new Mesh(outerEarGeom, furMat.clone());
	leftEar.name = 'Tom_LeftEar';
	leftEar.position.set(-0.17, 0.55, 0); // world: (-0.17, 0.82, 0)
	leftEar.rotation.set(-0.05, 0, 0.15);
	headBone.add(leftEar);

	const leftInnerEar = new Mesh(innerEarGeom, innerEarMat);
	leftInnerEar.name = 'Tom_LeftInnerEar';
	leftInnerEar.position.set(-0.16, 0.55, 0.02);
	leftInnerEar.rotation.set(-0.12, 0, 0.15);
	headBone.add(leftInnerEar);

	const rightEar = new Mesh(outerEarGeom, furMat.clone());
	rightEar.name = 'Tom_RightEar';
	rightEar.position.set(0.17, 0.55, 0);
	rightEar.rotation.set(-0.05, 0, -0.15);
	headBone.add(rightEar);

	const rightInnerEar = new Mesh(innerEarGeom, innerEarMat);
	rightInnerEar.name = 'Tom_RightInnerEar';
	rightInnerEar.position.set(0.16, 0.55, 0.02);
	rightInnerEar.rotation.set(-0.12, 0, -0.15);
	headBone.add(rightInnerEar);

	// ── Eyes (parented to headBone) ──
	// Eye world: (±0.10, 0.59, 0.27) → local: (±0.10, 0.32, 0.27)
	const eyeWhiteGeom = new SphereGeometry(0.066, 14, 10);
	const irisGeom     = new SphereGeometry(0.045, 12, 10);
	const pupilGeom    = new SphereGeometry(0.024, 10,  8);
	const glintGeom    = new SphereGeometry(0.008,  6,  6);

	function addEye(side, name) {
		const sx = side * 0.105;
		const ew = new Mesh(eyeWhiteGeom, eyeWhiteMat.clone());
		ew.name = `Tom_${name}Eye`;
		ew.position.set(sx, 0.325, 0.275);
		headBone.add(ew);

		const iris = new Mesh(irisGeom, irisMat.clone());
		iris.name = `Tom_${name}Iris`;
		iris.position.set(sx, 0.325, 0.292);
		headBone.add(iris);

		const pupil = new Mesh(pupilGeom, pupilMat.clone());
		pupil.name = `Tom_${name}Pupil`;
		pupil.position.set(sx, 0.33, 0.304);
		headBone.add(pupil);

		// White highlight gives life to the eyes
		const glint = new Mesh(glintGeom, eyeWhiteMat.clone());
		glint.name = `Tom_${name}Glint`;
		glint.position.set(sx - side * 0.011, 0.342, 0.312);
		headBone.add(glint);
	}
	addEye(-1, 'Left');
	addEye( 1, 'Right');

	// ── Nose ──
	const noseGeom = new SphereGeometry(0.025, 10, 8);
	const nose = new Mesh(noseGeom, noseMat);
	nose.name = 'Tom_Nose';
	nose.position.set(0, 0.21, 0.295);
	headBone.add(nose);

	// ── Whiskers (3 per side, horizontal cylinders) ──
	const whiskerGeom = new CylinderGeometry(0.003, 0.001, 0.22, 4);
	const whiskerDefs = [
		{ name: 'Tom_WL1', x: -0.08, y: 0.225, tz:  0.10 },
		{ name: 'Tom_WL2', x: -0.08, y: 0.215, tz:  0    },
		{ name: 'Tom_WL3', x: -0.08, y: 0.205, tz: -0.10 },
		{ name: 'Tom_WR1', x:  0.08, y: 0.225, tz:  0.10 },
		{ name: 'Tom_WR2', x:  0.08, y: 0.215, tz:  0    },
		{ name: 'Tom_WR3', x:  0.08, y: 0.205, tz: -0.10 },
	];
	for (const w of whiskerDefs) {
		const wm = new Mesh(whiskerGeom, whiskerMat.clone());
		wm.name = w.name;
		wm.position.set(w.x, w.y, 0.290);
		// Rotate cylinder to point sideways (Z→X axis), then tilt slightly
		wm.rotation.set(0, w.x < 0 ? -0.35 : 0.35, Math.PI / 2 + w.tz * (w.x < 0 ? -1 : 1));
		headBone.add(wm);
	}

	// ── Jaw / Chin (parented to Bone_jaw — opens when lip sync fires) ──
	// jawBone local pos (0, 0.15, 0.24) in headBone → world y ≈ 0.42
	const chinGeom = new SphereGeometry(0.13, 14, 10);
	const chin = new Mesh(chinGeom, furMat.clone());
	chin.name = 'Tom_Chin';
	chin.scale.set(1.18, 0.60, 0.82);
	chin.position.set(0, -0.07, 0.005); // puffier cheeks/jawline
	jawBone.add(chin);

	const mouthInterior = new Mesh(new SphereGeometry(0.06, 10, 8), mouthMat);
	mouthInterior.name = 'Tom_MouthDark';
	mouthInterior.scale.set(1, 0.50, 0.90);
	mouthInterior.position.set(0, -0.02, 0.04); // visible when jaw rotates open
	jawBone.add(mouthInterior);

	// ── Body (parented to spine) ──
	// spine world y = -0.25; body center world y = 0 → local y = 0.25
	const bodyGeom = new CylinderGeometry(0.16, 0.20, 0.52, 14);
	const bodyMesh = new Mesh(bodyGeom, furMat.clone());
	bodyMesh.name = 'Tom_Body';
	bodyMesh.position.set(0, 0.25, 0);
	spine.add(bodyMesh);

	const bellyGeom = new SphereGeometry(0.14, 16, 12);
	const belly = new Mesh(bellyGeom, bellyMat);
	belly.name = 'Tom_Belly';
	belly.scale.set(1.0, 1.30, 0.55);
	belly.position.set(0, 0.19, 0.14);
	spine.add(belly);

	// ── Tail (parented to tailBone) ──
	// tailBone world y = -0.55; tail mesh world y = -0.30 → local y = 0.25
	const tailGeom = new CylinderGeometry(0.032, 0.072, 0.35, 10);
	const tailMesh = new Mesh(tailGeom, furMat.clone());
	tailMesh.name = 'Tom_Tail';
	tailMesh.position.set(0, 0.25, 0);
	tailMesh.rotation.x = Math.PI / 4;
	tailBone.add(tailMesh);

	return scene;
}

// ─── 5. Export ───────────────────────────────────────────────────────────────

async function main() {
	const scene = buildScene();
	const clips = buildAnimationClips();

	const exporter = new GLTFExporter();
	const buffer = await exporter.parseAsync(scene, {
		binary: true,
		animations: clips,
		onlyVisible: false
	});

	const outBuf = Buffer.from(buffer);
	fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
	fs.writeFileSync(OUT_PATH, outBuf);

	const kb = (outBuf.length / 1024).toFixed(1);
	console.log(`✅ Tom.glb written to: ${OUT_PATH}`);
	console.log(`   Size: ${kb} KB (limit: 2048 KB)`);
	console.log(`   Animation clips: ${clips.map((c) => c.name).join(', ')}`);
}

main().catch((err) => {
	console.error('❌ Failed to generate Tom.glb:', err);
	process.exit(1);
});
