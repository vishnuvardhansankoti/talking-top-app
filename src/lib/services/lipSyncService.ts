/**
 * Lip Sync Service (US-S6-08)
 *
 * Drives mouth morph targets ('mouthOpen', 'mouthWide') in real-time
 * from SpeechSynthesisUtterance boundary events.
 *
 * Syllable heuristic:
 *   syllables  = max(1, floor(charLength / 3))
 *   mouthOpen  = min(1.0, 0.25 + 0.15 × syllables)
 *   mouthWide  = min(0.6, 0.10 × syllables)
 *
 * Idle fallback (Firefox/Safari — no onboundary support):
 *   Activates 120 ms after onstart if no boundary event fires.
 *   mouthOpen(t) = clamp(0.15 × sin(2π × 2.5 × t) + 0.1, 0, 0.3)
 *
 * Decay:
 *   Each boundary event starts a 120 ms rAF-driven linear decay to 0.
 */

export type MorphTargetName = 'mouthOpen' | 'mouthWide';
export type SetMorphInfluenceFn = (name: MorphTargetName, weight: number) => void;
export interface LipSyncOptions {
	fallbackDelayMs?: number;
	kickoff?: boolean;
}

// ─── Module state ────────────────────────────────────────────────────────────

let _morphSetter: SetMorphInfluenceFn | null = null;
let _decayRafId: number | null = null;
let _fallbackRafId: number | null = null;
let _fallbackTimerId: ReturnType<typeof setTimeout> | null = null;
let _boundaryFired = false;
let _active = false;
const FALLBACK_START_DELAY_MS = 120;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Register the morph-influence setter function.
 * Called by TomCharacter once the GLTF head mesh is ready.
 */
export function registerMorphSetter(fn: SetMorphInfluenceFn): void {
	_morphSetter = fn;
}

/**
 * Begin lip-sync for the given utterance.
 * Registers onboundary handler; starts idle fallback timer.
 */
export function startLipSync(utterance: SpeechSynthesisUtterance, options: LipSyncOptions = {}): void {
	_stopAllTimers();
	_boundaryFired = false;
	_active = true;
	const fallbackDelay = Math.max(0, options.fallbackDelayMs ?? FALLBACK_START_DELAY_MS);

	if (options.kickoff !== false) {
		// Immediate, short mouth pulse at speech start to reduce perceived onset lag.
		_setMorph('mouthOpen', 0.2);
		_setMorph('mouthWide', 0.06);
		_startDecay(0.2, 0.06, 90);
	}

	// Wire boundary events
	utterance.onboundary = (event: SpeechSynthesisEvent) => {
		_handleBoundary(event);
	};

	// Idle fallback: if no boundary fires quickly, use sine-wave mouth
	_fallbackTimerId = setTimeout(() => {
		if (!_boundaryFired && _active) {
			_startIdleFallback();
		}
	}, fallbackDelay);
}

/**
 * Stop lip-sync: cancel all loops, decay morph targets to 0 immediately.
 */
export function stopLipSync(): void {
	_active = false;
	_stopAllTimers();

	if (_morphSetter) {
		_morphSetter('mouthOpen', 0);
		_morphSetter('mouthWide', 0);
	}
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function _handleBoundary(event: SpeechSynthesisEvent): void {
	if (!_active) return;

	_boundaryFired = true;

	// Cancel idle fallback if it activated
	_stopFallback();

	// Cancel previous decay rAF
	if (_decayRafId !== null) {
		cancelAnimationFrame(_decayRafId);
		_decayRafId = null;
	}

	// Syllable heuristic
	const charLength = (event as SpeechSynthesisEvent & { charLength?: number }).charLength ?? (event.name?.length ?? 4);
	const syllables = Math.max(1, Math.floor(charLength / 3));
	const mouthOpen = Math.min(1.0, 0.25 + 0.15 * syllables);
	const mouthWide = Math.min(0.6, 0.1 * syllables);

	_setMorph('mouthOpen', mouthOpen);
	_setMorph('mouthWide', mouthWide);

	// Start 120 ms linear decay back to 0
	_startDecay(mouthOpen, mouthWide, 120);
}

function _startDecay(fromOpen: number, fromWide: number, durationMs: number): void {
	const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

	function tick(): void {
		const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
		const t = Math.min(1, elapsed / durationMs);
		const open = fromOpen * (1 - t);
		const wide = fromWide * (1 - t);

		_setMorph('mouthOpen', open);
		_setMorph('mouthWide', wide);

		if (t < 1 && _active) {
			_decayRafId = requestAnimationFrame(tick);
		} else {
			_decayRafId = null;
		}
	}

	_decayRafId = requestAnimationFrame(tick);
}

function _startIdleFallback(): void {
	const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

	function tick(): void {
		if (!_active) return;
		const t = ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime) / 1000;
		const raw = 0.15 * Math.sin(2 * Math.PI * 2.5 * t) + 0.1;
		const mouthOpen = Math.max(0, Math.min(0.3, raw));

		_setMorph('mouthOpen', mouthOpen);
		_setMorph('mouthWide', mouthOpen * 0.3);

		_fallbackRafId = requestAnimationFrame(tick);
	}

	_fallbackRafId = requestAnimationFrame(tick);
}

function _stopFallback(): void {
	if (_fallbackTimerId !== null) {
		clearTimeout(_fallbackTimerId);
		_fallbackTimerId = null;
	}
	if (_fallbackRafId !== null) {
		cancelAnimationFrame(_fallbackRafId);
		_fallbackRafId = null;
	}
}

function _stopAllTimers(): void {
	_stopFallback();
	if (_decayRafId !== null) {
		cancelAnimationFrame(_decayRafId);
		_decayRafId = null;
	}
}

function _setMorph(name: MorphTargetName, weight: number): void {
	_morphSetter?.(name, Math.max(0, Math.min(1, weight)));
}
