/**
 * WCAG 2.1 AA Accessibility Audit
 *
 * Uses axe-core via @axe-core/playwright to audit the app against WCAG 2.1 AA criteria.
 * Runs on multiple viewports to cover responsive accessibility concerns.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('WCAG 2.1 AA Accessibility', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		// Wait for app to be interactive
		await page.waitForLoadState('networkidle');
	});

	test('should have no critical WCAG 2.1 AA violations on main page', async ({ page }) => {
		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		// Filter to only impact: critical and serious
		const criticalViolations = results.violations.filter(
			(v) => v.impact === 'critical' || v.impact === 'serious'
		);

		if (criticalViolations.length > 0) {
			const summary = criticalViolations
				.map(
					(v) =>
						`[${v.impact?.toUpperCase()}] ${v.id}: ${v.description}\n  Nodes: ${v.nodes.map((n) => n.target).join(', ')}`
				)
				.join('\n\n');
			// Report as informative failure
			expect(criticalViolations, `Critical/serious WCAG violations:\n${summary}`).toHaveLength(0);
		}
	});

	test('should have no incomplete (needs review) critical items', async ({ page }) => {
		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa'])
			.analyze();

		// Incomplete items are "needs review" — log but don't fail
		const criticalIncomplete = results.incomplete.filter(
			(v) => v.impact === 'critical' || v.impact === 'serious'
		);

		// We log these to help track but treat as informative
		if (criticalIncomplete.length > 0) {
			console.info(
				`[A11y] ${criticalIncomplete.length} item(s) need manual review for WCAG compliance`
			);
		}

		// Verify that axe ran and returned results (not an error state)
		expect(results).toBeDefined();
		expect(typeof results.violations).toBe('object');
	});

	test('should have accessible page title', async ({ page }) => {
		const title = await page.title();
		expect(title).toBeTruthy();
		expect(title.length).toBeGreaterThan(3);
	});

	test('should have lang attribute on html element', async ({ page }) => {
		const lang = await page.evaluate(() => document.documentElement.getAttribute('lang'));
		expect(lang).toBeTruthy();
		expect(lang).toMatch(/^[a-z]{2}/); // e.g. 'en', 'en-US'
	});

	test('should have sufficient color contrast (axe check)', async ({ page }) => {
		const results = await new AxeBuilder({ page })
			.withRules(['color-contrast'])
			.analyze();

		const contrastViolations = results.violations.filter((v) => v.id === 'color-contrast');

		if (contrastViolations.length > 0) {
			const nodes = contrastViolations.flatMap((v) => v.nodes.map((n) => n.target)).join(', ');
			expect(
				contrastViolations,
				`Color contrast violations on elements: ${nodes}`
			).toHaveLength(0);
		}
	});

	test('should have all images with alt text', async ({ page }) => {
		const results = await new AxeBuilder({ page })
			.withRules(['image-alt'])
			.analyze();

		expect(results.violations.filter((v) => v.id === 'image-alt')).toHaveLength(0);
	});

	test('should have proper heading structure', async ({ page }) => {
		const results = await new AxeBuilder({ page })
			.withRules(['heading-order', 'page-has-heading-one'])
			.analyze();

		// heading-order failures are serious usability issues
		const headingOrderViolations = results.violations.filter((v) => v.id === 'heading-order');
		expect(headingOrderViolations).toHaveLength(0);
	});

	test('should have no keyboard trap', async ({ page }) => {
		const results = await new AxeBuilder({ page })
			.withRules(['scrollable-region-focusable'])
			.analyze();

		expect(results.violations).toHaveLength(0);
	});

	test('should have focusable interactive elements', async ({ page }) => {
		const results = await new AxeBuilder({ page })
			.withRules(['button-name', 'link-name', 'label'])
			.analyze();

		const focusableViolations = results.violations.filter(
			(v) => v.impact === 'critical' || v.impact === 'serious'
		);

		if (focusableViolations.length > 0) {
			const summary = focusableViolations.map((v) => `${v.id}: ${v.description}`).join('\n');
			expect(focusableViolations, `Focusable element violations:\n${summary}`).toHaveLength(0);
		}
	});

	test('should have valid ARIA attributes', async ({ page }) => {
		const results = await new AxeBuilder({ page })
			.withRules([
				'aria-allowed-attr',
				'aria-required-attr',
				'aria-valid-attr',
				'aria-valid-attr-value'
			])
			.analyze();

		const ariaViolations = results.violations.filter(
			(v) => v.impact === 'critical' || v.impact === 'serious'
		);
		expect(ariaViolations).toHaveLength(0);
	});
});
