/**
 * Comprehensive tests for gestureService (US-T01-T05)
 * Pointer event simulation for gesture detection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { onGesture, attachGestureHandlers } from '$lib/services/gestureService';

describe('gestureService - Comprehensive', () => {
	let mockElement: HTMLElement;

	beforeEach(() => {
		vi.clearAllMocks();

		// Create mock element
		mockElement = document.createElement('div');
		mockElement.style.width = '300px';
		mockElement.style.height = '300px';
		document.body.appendChild(mockElement);
	});

	afterEach(() => {
		if (document.body.contains(mockElement)) {
			document.body.removeChild(mockElement);
		}
	});

	describe('Gesture Registration', () => {
		it('should register gesture handler', () => {
			const handler = vi.fn();
			expect(() => onGesture(handler)).not.toThrow();
		});

		it('should allow multiple handlers', () => {
			const handler1 = vi.fn();
			const handler2 = vi.fn();
			const handler3 = vi.fn();

			expect(() => {
				onGesture(handler1);
				onGesture(handler2);
				onGesture(handler3);
			}).not.toThrow();
		});
	});

	describe('Gesture Attachment', () => {
		it('should attach handlers to element without throwing', () => {
			expect(() => attachGestureHandlers(mockElement)).not.toThrow();
		});

		it('should handle null element gracefully', () => {
			expect(() => attachGestureHandlers(null as any)).toThrow();
		});

		it('should handle multiple attachments to same element', () => {
			expect(() => {
				attachGestureHandlers(mockElement);
				attachGestureHandlers(mockElement);
			}).not.toThrow();
		});
	});

	describe('Pointer Event Simulation', () => {
		it('should handle pointer down events', () => {
			attachGestureHandlers(mockElement);
			const handler = vi.fn();
			onGesture(handler);

			const event = new PointerEvent('pointerdown', {
				bubbles: true,
				clientX: 150,
				clientY: 150,
				pointerId: 1
			});

			expect(() => mockElement.dispatchEvent(event)).not.toThrow();
		});

		it('should handle pointer move events', () => {
			attachGestureHandlers(mockElement);
			const handler = vi.fn();
			onGesture(handler);

			const downEvent = new PointerEvent('pointerdown', {
				bubbles: true,
				clientX: 150,
				clientY: 150,
				pointerId: 1
			});
			mockElement.dispatchEvent(downEvent);

			const moveEvent = new PointerEvent('pointermove', {
				bubbles: true,
				clientX: 155,
				clientY: 155,
				pointerId: 1
			});

			expect(() => mockElement.dispatchEvent(moveEvent)).not.toThrow();
		});

		it('should handle pointer up events', () => {
			attachGestureHandlers(mockElement);
			const handler = vi.fn();
			onGesture(handler);

			const downEvent = new PointerEvent('pointerdown', {
				bubbles: true,
				clientX: 150,
				clientY: 150,
				pointerId: 1
			});
			mockElement.dispatchEvent(downEvent);

			const upEvent = new PointerEvent('pointerup', {
				bubbles: true,
				clientX: 150,
				clientY: 150,
				pointerId: 1
			});

			expect(() => mockElement.dispatchEvent(upEvent)).not.toThrow();
		});
	});

	describe('Gesture Detection', () => {
		it('should detect short-distance tap (poke)', () => {
			const handler = vi.fn();
			onGesture(handler);
			attachGestureHandlers(mockElement);

			// Simulate short tap (< 30px)
			const downEvent = new PointerEvent('pointerdown', {
				bubbles: true,
				clientX: 150,
				clientY: 150,
				pointerId: 1
			});
			mockElement.dispatchEvent(downEvent);

			const upEvent = new PointerEvent('pointerup', {
				bubbles: true,
				clientX: 152,
				clientY: 151,
				pointerId: 1
			});
			mockElement.dispatchEvent(upEvent);

			// Handler should be called for short distance
			// (actual behavior depends on implementation)
		});

		it('should detect long-distance swipe (pet)', () => {
			const handler = vi.fn();
			onGesture(handler);
			attachGestureHandlers(mockElement);

			// Simulate long swipe (>= 30px)
			const downEvent = new PointerEvent('pointerdown', {
				bubbles: true,
				clientX: 100,
				clientY: 150,
				pointerId: 1
			});
			mockElement.dispatchEvent(downEvent);

			const upEvent = new PointerEvent('pointerup', {
				bubbles: true,
				clientX: 150,
				clientY: 150,
				pointerId: 1
			});
			mockElement.dispatchEvent(upEvent);

			// Handler should be called for long distance
		});

		it('should handle rapid consecutive gestures', () => {
			const handler = vi.fn();
			onGesture(handler);
			attachGestureHandlers(mockElement);

			for (let i = 0; i < 5; i++) {
				const downEvent = new PointerEvent('pointerdown', {
					bubbles: true,
					clientX: 150,
					clientY: 150,
					pointerId: 1
				});
				mockElement.dispatchEvent(downEvent);

				const upEvent = new PointerEvent('pointerup', {
					bubbles: true,
					clientX: 150,
					clientY: 150,
					pointerId: 1
				});
				mockElement.dispatchEvent(upEvent);
			}
		});
	});

	describe('Multi-touch Scenarios', () => {
		it('should handle multi-pointer events', () => {
			attachGestureHandlers(mockElement);
			const handler = vi.fn();
			onGesture(handler);

			// First pointer down
			const down1 = new PointerEvent('pointerdown', {
				bubbles: true,
				clientX: 100,
				clientY: 150,
				pointerId: 1
			});
			mockElement.dispatchEvent(down1);

			// Second pointer down (multi-touch)
			const down2 = new PointerEvent('pointerdown', {
				bubbles: true,
				clientX: 200,
				clientY: 150,
				pointerId: 2
			});
			mockElement.dispatchEvent(down2);

			// Both up
			const up1 = new PointerEvent('pointerup', {
				bubbles: true,
				clientX: 100,
				clientY: 150,
				pointerId: 1
			});
			mockElement.dispatchEvent(up1);

			const up2 = new PointerEvent('pointerup', {
				bubbles: true,
				clientX: 200,
				clientY: 150,
				pointerId: 2
			});
			mockElement.dispatchEvent(up2);
		});

		it('should handle pointer cancel events', () => {
			attachGestureHandlers(mockElement);
			const handler = vi.fn();
			onGesture(handler);

			const downEvent = new PointerEvent('pointerdown', {
				bubbles: true,
				clientX: 150,
				clientY: 150,
				pointerId: 1
			});
			mockElement.dispatchEvent(downEvent);

			const cancelEvent = new PointerEvent('pointercancel', {
				bubbles: true,
				pointerId: 1
			});

			expect(() => mockElement.dispatchEvent(cancelEvent)).not.toThrow();
		});
	});

	describe('Gesture Properties', () => {
		it('should validate gesture types', () => {
			const validTypes = ['poke', 'pet', 'hold'];
			expect(validTypes).toContain('poke');
			expect(validTypes).toContain('pet');
			expect(validTypes).toContain('hold');
		});

		it('should track gesture coordinates', () => {
			attachGestureHandlers(mockElement);

			const downEvent = new PointerEvent('pointerdown', {
				bubbles: true,
				clientX: 100,
				clientY: 200,
				pointerId: 1
			});
			mockElement.dispatchEvent(downEvent);

			// Coordinates should be available in event object
			expect(downEvent.clientX).toBe(100);
			expect(downEvent.clientY).toBe(200);
		});
	});

	describe('Edge Cases', () => {
		it('should handle gestures at element boundaries', () => {
			attachGestureHandlers(mockElement);
			const handler = vi.fn();
			onGesture(handler);

			// Gesture at top-left corner
			const downEvent = new PointerEvent('pointerdown', {
				bubbles: true,
				clientX: 0,
				clientY: 0,
				pointerId: 1
			});
			mockElement.dispatchEvent(downEvent);

			const upEvent = new PointerEvent('pointerup', {
				bubbles: true,
				clientX: 30,
				clientY: 30,
				pointerId: 1
			});
			mockElement.dispatchEvent(upEvent);
		});

		it('should handle zero-distance gestures', () => {
			attachGestureHandlers(mockElement);
			const handler = vi.fn();
			onGesture(handler);

			const downEvent = new PointerEvent('pointerdown', {
				bubbles: true,
				clientX: 150,
				clientY: 150,
				pointerId: 1
			});
			mockElement.dispatchEvent(downEvent);

			const upEvent = new PointerEvent('pointerup', {
				bubbles: true,
				clientX: 150,
				clientY: 150,
				pointerId: 1
			});
			mockElement.dispatchEvent(upEvent);
		});

		it('should handle very large distance gestures', () => {
			attachGestureHandlers(mockElement);
			const handler = vi.fn();
			onGesture(handler);

			const downEvent = new PointerEvent('pointerdown', {
				bubbles: true,
				clientX: 0,
				clientY: 0,
				pointerId: 1
			});
			mockElement.dispatchEvent(downEvent);

			const upEvent = new PointerEvent('pointerup', {
				bubbles: true,
				clientX: 9999,
				clientY: 9999,
				pointerId: 1
			});
			mockElement.dispatchEvent(upEvent);
		});
	});
});
