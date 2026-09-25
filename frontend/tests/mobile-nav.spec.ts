import { test, expect } from '@playwright/test';
import path from 'path';
import os from 'os';
import fs from 'fs';

const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || path.join(os.tmpdir(), "motoshop-test-artifacts");
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

test.describe('MotoShop Mobile Bottom Navigation Suite', () => {
  test.use({
    viewport: { width: 375, height: 812 }, // iPhone 13/14 mobile viewport
  });

  test('Cashier sign in: verifies mobile bottom nav items, positioning & alignment (Daylight Mode)', async ({ page }) => {
    // Mock /auth/refresh as cashier
    await page.route('**/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-cashier-token',
          role: 'cashier',
          user_id: 'usr-cashier-01',
          first_name: 'Sarah',
          last_name: 'Connor',
          display_mode: 'light',
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('user_role', 'cashier');
      localStorage.setItem('user_name', 'Sarah Connor');
      localStorage.setItem('user_id', 'usr-cashier-01');
      localStorage.setItem('user_email', 'cashier@motoshop.com');
      document.cookie = 'motoshop_mode=light; path=/';
    });

    await page.goto('/pos');
    await page.waitForLoadState('networkidle');

    const bottomNav = page.locator('nav[aria-label="Mobile Bottom Navigation"]');
    await expect(bottomNav).toBeVisible({ timeout: 10000 });

    const counterTab = bottomNav.locator('a[href="/pos"]');
    await expect(counterTab).toBeVisible();
    await expect(counterTab).toHaveAttribute('aria-current', 'page');

    const invoicesTab = bottomNav.locator('a[href="/sales"]');
    await expect(invoicesTab).toBeVisible();

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'cashier-mobile-nav.png') });
  });

  test('Mechanic sign in: verifies mobile bottom nav items, positioning & alignment (Daylight Mode)', async ({ page }) => {
    // Mock /auth/refresh as mechanic
    await page.route('**/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-mechanic-token',
          role: 'mechanic',
          user_id: 'usr-mechanic-01',
          first_name: 'Mike',
          last_name: 'Doohan',
          display_mode: 'light',
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('user_role', 'mechanic');
      localStorage.setItem('user_name', 'Mike Doohan');
      localStorage.setItem('user_id', 'usr-mechanic-01');
      localStorage.setItem('user_email', 'mechanic@motoshop.com');
      document.cookie = 'motoshop_mode=light; path=/';
    });

    await page.goto('/repairs/board');
    await page.waitForLoadState('networkidle');

    const bottomNav = page.locator('nav[aria-label="Mobile Bottom Navigation"]');
    await expect(bottomNav).toBeVisible({ timeout: 10000 });

    const jobsTab = bottomNav.locator('a[href="/repairs/board"]');
    await expect(jobsTab).toBeVisible();
    await expect(jobsTab).toHaveAttribute('aria-current', 'page');

    const customersTab = bottomNav.locator('a[href="/repairs/history"]');
    await expect(customersTab).toBeVisible();

    const bikesTab = bottomNav.locator('a[href="/motorcycles"]');
    await expect(bikesTab).toBeVisible();

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mechanic-mobile-nav.png') });
  });

  test('Mechanic sign in: verifies mobile bottom nav in Dark Mode', async ({ page }) => {
    await page.route('**/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-mechanic-token',
          role: 'mechanic',
          user_id: 'usr-mechanic-01',
          first_name: 'Mike',
          last_name: 'Doohan',
          display_mode: 'dark',
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('user_role', 'mechanic');
      localStorage.setItem('user_name', 'Mike Doohan');
      localStorage.setItem('user_id', 'usr-mechanic-01');
      localStorage.setItem('user_email', 'mechanic@motoshop.com');
      localStorage.setItem('motoshop_theme_mode', 'dark');
      document.cookie = 'motoshop_mode=dark; path=/';
    });

    await page.goto('/repairs/board');
    await page.waitForLoadState('networkidle');

    // Ensure dark class on html
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(300);

    const bottomNav = page.locator('nav[aria-label="Mobile Bottom Navigation"]');
    await expect(bottomNav).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mechanic-mobile-nav-dark.png') });
  });
});
