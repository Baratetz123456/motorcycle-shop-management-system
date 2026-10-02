import { test, expect } from '@playwright/test';
import path from 'path';
import os from 'os';
import fs from 'fs';

const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || path.join(os.tmpdir(), "motoshop-test-artifacts");
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

test.describe('Legal Hub (Privacy Policy & Terms of Service) Layout Suite', () => {

  test.describe('Desktop Viewport (1280x800)', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('verifies desktop header, brand logo, tab switching, and search', async ({ page }) => {
      await page.goto('/privacy');
      await page.waitForLoadState('domcontentloaded');

      // 1. Verify desktop header elements
      const backBtn = page.locator('[data-testid="desktop-legal-back-btn"]');
      await expect(backBtn).toBeVisible();

      // Brand Logo & Title
      const heading = page.locator('h1');
      await expect(heading).toContainText(/Privacy/i);

      // Desktop Tab Switcher
      const privacyTab = page.locator('[data-testid="desktop-tab-privacy"]');
      const termsTab = page.locator('[data-testid="desktop-tab-terms"]');
      await expect(privacyTab).toBeVisible();
      await expect(termsTab).toBeVisible();

      // Privacy tab active by default
      await expect(privacyTab).toHaveClass(/bg-emerald-500/);

      // Print Button
      const printBtn = page.locator('[data-testid="desktop-print-btn"]');
      await expect(printBtn).toBeVisible();

      // 2. Switch to Terms of Service
      await termsTab.click();
      await expect(termsTab).toHaveClass(/bg-emerald-500/);
      await expect(heading).toContainText(/Terms/i);

      // 3. Desktop Search Filter
      const searchInput = page.locator('aside input[type="text"]');
      await expect(searchInput).toBeVisible();
      await searchInput.fill('Warranty');
      
      // Verify filtered sections appear
      const warrantyCard = page.locator('main section').filter({ hasText: /Warranty/i }).first();
      await expect(warrantyCard).toBeVisible();

      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'desktop-legal-terms.png') });
    });
  });

  test.describe('Mobile Viewport (375x812 - iPhone X/13)', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('verifies two-tier mobile header, mobile tab switcher, and TOC slide-up drawer', async ({ page }) => {
      await page.goto('/privacy');
      await page.waitForLoadState('domcontentloaded');

      // 1. Verify Tier-1 Mobile Header
      const mobileBackBtn = page.locator('[data-testid="mobile-legal-back-btn"]');
      await expect(mobileBackBtn).toBeVisible();

      const tocTrigger = page.locator('[data-testid="mobile-toc-trigger-btn"]');
      await expect(tocTrigger).toBeVisible();

      const mobilePrintBtn = page.locator('[data-testid="mobile-print-btn"]');
      await expect(mobilePrintBtn).toBeVisible();

      // Desktop header elements must be hidden
      await expect(page.locator('[data-testid="desktop-legal-back-btn"]')).toBeHidden();

      // 2. Verify Tier-2 Mobile Sticky Segmented Subnav
      const mobilePrivacyTab = page.locator('[data-testid="mobile-tab-privacy"]');
      const mobileTermsTab = page.locator('[data-testid="mobile-tab-terms"]');
      await expect(mobilePrivacyTab).toBeVisible();
      await expect(mobileTermsTab).toBeVisible();
      await expect(mobilePrivacyTab).toHaveClass(/bg-emerald-500/);

      // Switch to Terms on Mobile
      await mobileTermsTab.click();
      await expect(mobileTermsTab).toHaveClass(/bg-emerald-500/);
      await expect(page.locator('h1')).toContainText(/Terms/i);

      // 3. Open Mobile Table of Contents Drawer
      await tocTrigger.click();

      const drawer = page.locator('[data-testid="mobile-toc-drawer"]');
      await expect(drawer).toBeVisible();

      // Search in Drawer
      const drawerSearch = page.locator('input[placeholder="Filter clauses..."]');
      await expect(drawerSearch).toBeVisible();
      await drawerSearch.fill('Road Testing');

      const roadTestingItem = drawer.locator('button').filter({ hasText: /Road Testing/i }).first();
      await expect(roadTestingItem).toBeVisible();

      // Click to jump to section
      await roadTestingItem.click();

      // Drawer should close
      await expect(drawer).toBeHidden();

      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile-legal-terms.png') });
    });
  });
});
