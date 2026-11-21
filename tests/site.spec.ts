import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const widths = [{ n: 'phone', w: 375, h: 800 }, { n: 'tablet', w: 768, h: 1000 }, { n: 'desktop', w: 1280, h: 900 }];

for (const v of widths) {
  test.describe(v.n, () => {
    test.use({ viewport: { width: v.w, height: v.h } });

    test('no horizontal page scroll, axe clean', async ({ page }) => {
      await page.goto('/');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(res.violations.map((x) => `${x.id}: ${x.nodes.length}`)).toEqual([]);
    });

    test('correct swimlane layout shown', async ({ page }) => {
      await page.goto('/');
      const grid = page.locator('#panel-borrow .lanegrid-wrap');
      const list = page.locator('#panel-borrow .stagelist-wrap');
      await expect(grid).toBeVisible(); await expect(list).toBeHidden();
    });
  });
}

test('placeholder page passes axe', async ({ page }) => {
  await page.goto('/placeholders/');
  const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(res.violations.map((x) => x.id)).toEqual([]);
});

test('tabs: default, keyboard, outcome buttons', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#tab-borrow')).toHaveAttribute('aria-selected', 'true');
  await page.locator('#tab-borrow').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#tab-join')).toBeFocused();
  await expect(page.locator('#panel-join')).toBeVisible();
  await expect(page.locator('#panel-borrow')).toBeHidden();
  await page.locator('[data-open-flow=loan]').click();
  await expect(page.locator('#tab-loan')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#panel-loan')).toBeVisible();
});

test('flow counts match the handover (8, 4, 5 stages)', async ({ page }) => {
  await page.goto('/');
  for (const [k, n] of [['borrow', 8], ['join', 4], ['loan', 5]] as const) {
    await expect(page.locator(`#panel-${k} .lanegrid-wrap .card.singlify`)).toHaveCount(n);
  }
});

test('size toggle', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const frame = page.locator('#panel-borrow .frame');
  await frame.getByRole('button', { name: 'Half size' }).click();
  await expect(frame).toHaveAttribute('data-size', 'half');
  await expect(frame.getByRole('button', { name: 'Half size' })).toHaveAttribute('aria-pressed', 'true');
});

test('directory filters, live count, empty state', async ({ page }) => {
  await page.goto('/');
  const count = page.locator('#dir-count');
  await expect(count).toHaveText('Showing 19 of 19 connectors');
  await page.locator('[data-filter=route]').getByRole('button', { name: 'Included' }).click();
  await expect(count).toHaveText('Showing 4 of 19 connectors');
  await page.locator('[data-filter=cat]').getByRole('button', { name: 'Accounting' }).click();
  await expect(page.locator('#dir-empty')).toBeVisible();
  await page.getByRole('button', { name: 'Show every connector' }).click();
  await expect(count).toHaveText('Showing 19 of 19 connectors');
});

test('every directory row carries the live-status placeholder', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#dir-list li mark', { hasText: 'Live with credit unions: to confirm' })).toHaveCount(19);
});

test('axe clean on every journey tab', async ({ page }) => {
  await page.goto('/');
  for (const k of ['join', 'loan']) {
    await page.locator(`#tab-${k}`).click();
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(res.violations.map((x) => x.id), k).toEqual([]);
  }
});

test('manual actions are badged: member and staff', async ({ page }) => {
  await page.goto('/');
  const grid = page.locator('#panel-borrow .lanegrid-wrap');
  await expect(grid.locator('.card.member.is-manual .pill')).toHaveCount(3); // joins, pays joining fee, accepts offer
  await expect(grid.locator('.card.team .pill')).toHaveCount(2); // identity fails, application referred
  await expect(grid.locator('.card.member.no-action')).toHaveCount(2); // told in app, receives loan
  await expect(grid.locator('.card.singlify .pill, .card.partner .pill')).toHaveCount(0);
});
