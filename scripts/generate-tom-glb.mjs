/**
 * generate-tom-glb.mjs
 *
 * Node.js ESM script (US-S6-01) that procedurally generates Tom.glb:
 *   - Head mesh with 2 morph targets: mouthOpen (0), mouthWide (1)
 *   - Body mesh, tail mesh
 *   - 3-bone rig hierarchy: Bone_spine → Bone_head, Bone_tail
 *   - 6 named AnimationClips: IDLE, LISTENING, SPEAKING,
 *                              REACTING_POKE, REACTING_PET, REACTING_HOLD
 *
 * Usage: node scripts/generate-tom-glb.mjs
 *
 * Note: GLTFExporter r184 uses FileReader for the binary GLB packing step.
 * We provide a minimal Node.js polyfill using the built-in Blob.arrayBuffer().
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
	const sphere = new SphereGeometry(0.25, 16, 12);
	const base = sphere.toNonIndexed(); // absolute position array

	const posArr = base.attributes.position.array;
	const count = posArr.length / 3;

	// --- morph target 0: mouthOpen (lower hemisphere vertices drop down)
	const morphOpen = new Float32Array(posArr.length);
	for (let i = 0; i < count; i++) {
		const y = posArr[i * 3 + 1];
		morphOpen[i * 3]     = posArr[i * 3];
		morphOpen[i * 3 + 1] = y < 0 ? posArr[i * 3 + 1] - 0.08 : posArr[i * 3 + 1];
		morphOpen[i * 3 + 2] = posArr[i * 3 + 2];
	}

	// --- morph target 1: mouthWide (equatorial vertices spread outward)
	const morphWide = new Float32Array(posArr.length);
	for (let i = 0; i < count; i++) {
		const y   = posArr[i * 3 + 1];
		const x   = posArr[i * 3];
		const abs = Math.abs(y);
		morphWide[i * 3]     = abs < 0.1 ? x + Math.sign(x || 1) * 0.05 : posArr[i * 3];
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
	head.position.set(0, 0.5, 0); // relative to spine

	const tail = new Bone();
	tail.name = 'Bone_tail';
	tail.position.set(0, -0.3, -0.2); // relative to spine

	spine.add(head);
	spine.add(tail);

	return spine;
}

// ─── 3. Build Animation Clips ────────────────────────────────────────────────

function buildAnimationClips() {
	// ── IDLE: 2.0s LoopRepeat — Bone_spine bobbing ──────────────────────────
	const idle = new AnimationClip('IDLE', 2.0, [
		new VectorKeyframeTrack(
			'Bone_spine.position',
			[0, 1.0, 2.0],
			[0, 0, 0,  0, 0.04, 0,  0, 0, 0]
		)
	]);

	// ── LISTENING: 1.2s LoopRepeat — Bone_head tilt 8° Z ───────────────────
	const listenQ0 = eulerToQArr(0, 0, 0);
	const listenQ1 = eulerToQArr(0, 0, 0.14);
	const listening = new AnimationClip('LISTENING', 1.2, [
		new QuaternionKeyframeTrack(
			'Bone_head.quaternion',
			[0, 0.6, 1.2],
			[...listenQ0, ...listenQ1, ...listenQ0]
		)
	]);

	// ── SPEAKING: 0.8s LoopRepeat — spine + head nod ───────────────────────
	const speakHeadQ0 = eulerToQArr(0, 0, 0);
	const speakHeadQ1 = eulerToQArr(0.09, 0, 0);
	const speaking = new AnimationClip('SPEAKING', 0.8, [
		new VectorKeyframeTrack(
			'Bone_spine.position',
			[0, 0.4, 0.8],
			[0, 0, 0,  0, 0.02, 0.01,  0, 0, 0]
		),
		new QuaternionKeyframeTrack(
			'Bone_head.quaternion',
			[0, 0.4, 0.8],
			[...speakHeadQ0, ...speakHeadQ1, ...speakHeadQ0]
		)
	]);

	// ── REACTING_POKE: 0.6s LoopOnce ────────────────────────────────────────
	const pokeHeadQ0 = eulerToQArr(0, 0, 0);
	const pokeHeadQ1 = eulerToQArr(-0.26, 0, 0);
	const reactingPoke = new AnimationClip('REACTING_POKE', 0.6, [
		new VectorKeyframeTrack(
			'Bone_spine.position',
			[0, 0.1, 0.4, 0.6],
			[0, 0, 0,  -0.06, 0.02, 0,  0.02, 0, 0,  0, 0, 0]
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
	const tailQ0     = eulerToQArr(0, 0, 0);
	const tailQLft   = eulerToQArr(0, 0, 0.35);
	const tailQRgt   = eulerToQArr(0, 0, -0.35);
	const reactingPet = new AnimationClip('REACTING_PET', 1.5, [
		new QuaternionKeyframeTrack(
			'Bone_head.quaternion',
			[0, 0.75, 1.5],
			[...petHeadQ0, ...petHeadQ1, ...petHeadQ0]
		),
		new QuaternionKeyframeTrack(
			'Bone_tail.quaternion',
			[0, 0.5, 1.0, 1.5],
			[...tailQ0, ...tailQLft, ...tailQRgt, ...tailQ0]
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
	const eatTailWagL   = eulerToQArr(0, 0,  0.17);
	const eatTailWagR   = eulerToQArr(0, 0, -0.17);
	const eating = new AnimationClip('EATING', 3.0, [
		new QuaternionKeyframeTrack(
			'Bone_head.quaternion',
			[0, 0.3, 3.0],
			[...Q_IDENTITY, ...eatHeadDip, ...Q_IDENTITY]
		),
		new VectorKeyframeTrack(
			'Bone_spine.position',
			[0, 0.3, 0.8, 1.2, 1.8, 2.2, 2.5, 3.0],
			[0,0,0, 0,-0.04,0, 0,0.02,0, 0,-0.04,0, 0,0.02,0, 0,-0.04,0, 0,0,0, 0,0,0]
		),
		new QuaternionKeyframeTrack(
			'Bone_tail.quaternion',
			[0, 1.5, 2.0, 2.5, 3.0],
			[...Q_IDENTITY, ...eatTailWagL, ...eatTailWagR, ...eatTailWagL, ...Q_IDENTITY]
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
			[...Q_IDENTITY, ...peeHeadDown, ...peeHeadDown, ...Q_IDENTITY]
		),
		new QuaternionKeyframeTrack(
			'Bone_spine.quaternion',
			[0, 0.5, 2.0, 2.3, 2.6, 3.0],
			[...Q_IDENTITY, ...Q_IDENTITY, ...Q_IDENTITY, ...peeShakeL, ...peeShakeR, ...Q_IDENTITY]
		)
	]);

	// ── SLEEPING: 4.0s LoopRepeat ────────────────────────────────────────────
	// Droop head → slow breathing (seamless loop at t=0 and t=4)
	const sleepHeadDroop = eulerToQArr(0.35, 0, 0);
	const sleeping = new AnimationClip('SLEEPING', 4.0, [
		new QuaternionKeyframeTrack(
			'Bone_head.quaternion',
			[0, 0.5, 4.0],
			[...Q_IDENTITY, ...sleepHeadDroop, ...sleepHeadDroop]
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

	// Bone hierarchy
	const spineRoot = buildBones();
	scene.add(spineRoot);

	// Head mesh (plain Mesh with morph targets)
	const headGeom = buildHeadGeometry();
	const headMat = new MeshStandardMaterial({ color: 0x8e9198, roughness: 0.75 });
	const headMesh = new Mesh(headGeom, headMat);
	headMesh.updateMorphTargets();
	if (!headMesh.morphTargetDictionary || Object.keys(headMesh.morphTargetDictionary).length === 0) {
		headMesh.morphTargetDictionary = { mouthOpen: 0, mouthWide: 1 };
	}
	headMesh.name = 'Tom_Head';
	headMesh.position.set(0, 0.5, 0);
	scene.add(headMesh);

	// Ears (simple cone geometry for a clear cat silhouette)
	const earGeom = new ConeGeometry(0.08, 0.18, 10);
	const earMat = new MeshStandardMaterial({ color: 0x7e828a, roughness: 0.8 });
	const leftEar = new Mesh(earGeom, earMat);
	leftEar.name = 'Tom_LeftEar';
	leftEar.position.set(-0.14, 0.76, 0.0);
	leftEar.rotation.z = 0.12;
	leftEar.rotation.x = -0.05;
	scene.add(leftEar);

	const rightEar = new Mesh(earGeom, earMat);
	rightEar.name = 'Tom_RightEar';
	rightEar.position.set(0.14, 0.76, 0.0);
	rightEar.rotation.z = -0.12;
	rightEar.rotation.x = -0.05;
	scene.add(rightEar);

	// Eyes and nose to avoid "generic blob" appearance
	const eyeGeom = new SphereGeometry(0.03, 10, 8);
	const eyeMat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
	const leftEye = new Mesh(eyeGeom, eyeMat);
	leftEye.name = 'Tom_LeftEye';
	leftEye.position.set(-0.07, 0.54, 0.22);
	scene.add(leftEye);

	const rightEye = new Mesh(eyeGeom, eyeMat);
	rightEye.name = 'Tom_RightEye';
	rightEye.position.set(0.07, 0.54, 0.22);
	scene.add(rightEye);

	const pupilGeom = new SphereGeometry(0.012, 8, 8);
	const pupilMat = new MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
	const leftPupil = new Mesh(pupilGeom, pupilMat);
	leftPupil.name = 'Tom_LeftPupil';
	leftPupil.position.set(-0.07, 0.54, 0.245);
	scene.add(leftPupil);

	const rightPupil = new Mesh(pupilGeom, pupilMat);
	rightPupil.name = 'Tom_RightPupil';
	rightPupil.position.set(0.07, 0.54, 0.245);
	scene.add(rightPupil);

	const noseGeom = new SphereGeometry(0.02, 10, 8);
	const noseMat = new MeshStandardMaterial({ color: 0xd06a7b, roughness: 0.4 });
	const nose = new Mesh(noseGeom, noseMat);
	nose.name = 'Tom_Nose';
	nose.position.set(0, 0.44, 0.245);
	scene.add(nose);

	// Body mesh
	const bodyGeom = new CylinderGeometry(0.15, 0.18, 0.5, 12);
	const bodyMat = new MeshStandardMaterial({ color: 0x767a83, roughness: 0.8 });
	const bodyMesh = new Mesh(bodyGeom, bodyMat);
	bodyMesh.name = 'Tom_Body';
	bodyMesh.position.set(0, 0, 0);
	scene.add(bodyMesh);

	// Belly patch for visual contrast
	const bellyGeom = new SphereGeometry(0.12, 14, 10);
	const bellyMat = new MeshStandardMaterial({ color: 0xd9d9dc, roughness: 0.85 });
	const belly = new Mesh(bellyGeom, bellyMat);
	belly.name = 'Tom_Belly';
	belly.scale.set(1.0, 1.2, 0.55);
	belly.position.set(0, -0.06, 0.13);
	scene.add(belly);

	// Tail mesh
	const tailGeom = new CylinderGeometry(0.03, 0.06, 0.3, 8);
	const tailMat = new MeshStandardMaterial({ color: 0x777777 });
	const tailMesh = new Mesh(tailGeom, tailMat);
	tailMesh.name = 'Tom_Tail';
	tailMesh.position.set(0, -0.3, -0.2);
	tailMesh.rotation.x = Math.PI / 4;
	scene.add(tailMesh);

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
