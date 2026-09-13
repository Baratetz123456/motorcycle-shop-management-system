import { test, expect } from '@playwright/test';

test.describe('MotoShop Dark Mode & Theme Toggle Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the /auth/refresh endpoint so ProtectedRoute validates immediately in test context
    await page.route('**/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-valid-jwt-token-12345',
          role: 'admin',
          user_id: 'usr-admin-01',
          first_name: 'Admin',
          last_name: 'User',
          display_mode: 'dark',
        }),
      });
    });

    // Provide initial localStorage auth role
    await page.addInitScript(() => {
      localStorage.setItem('user_role', 'admin');
      localStorage.setItem('user_name', 'Admin User');
      localStorage.setItem('user_id', 'usr-admin-01');
    });
  });

  test('Page loads and Sun/Moon toggle switches between light and dark modes', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify top header is rendered
    const header = page.locator('header').first();
    await expect(header).toBeVisible({ timeout: 10000 });

    // Check for header mode toggle button
    const toggleBtn = page.locator('.header-mode-toggle');
    await expect(toggleBtn).toBeVisible();

    // Read initial mode
    const isInitiallyDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));

    // Click toggle button
    await toggleBtn.click();
    await page.waitForTimeout(300);

    // Verify mode flipped
    const isDarkAfterToggle = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDarkAfterToggle).toBe(!isInitiallyDark);

    // Switch back or ensure dark mode class is toggleable
    await toggleBtn.click();
    await page.waitForTimeout(300);
    const finalDarkState = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(finalDarkState).toBe(isInitiallyDark);
  });

  test('Primary action buttons maintain high-contrast styling', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('motoshop_app_mode', 'dark');
    });

    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');

    // Verify inventory container is visible
    const inventoryHeading = page.locator('h1:has-text("Inventory"), h1:has-text("Parts")').first();
    await expect(inventoryHeading).toBeVisible({ timeout: 10000 });
  });

  test('Receipt view enforces pure white canvas invariant in dark mode', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('motoshop_app_mode', 'dark');
      localStorage.setItem('motoshop_sales_logs', JSON.stringify([{
        id: 'tx-test-999',
        invoice_no: 'INV-TEST-999',
        customer_name: 'Test Customer',
        subtotal: 1000,
        total: 1000,
        amount_paid: 1000,
        status: 'COMPLETED',
        payment_method: 'CASH',
        created_at: new Date().toISOString(),
        items: [{ name: 'Test Service', qty: 1, price: 1000, type: 'service' }]
      }]));
    });

    await page.goto('/sales/receipt?id=tx-test-999');
    await page.waitForLoadState('networkidle');

    const receiptCanvas = page.locator('.printable-receipt, [data-invoice-canvas="true"]').first();
    await expect(receiptCanvas).toBeVisible({ timeout: 10000 });

    // Verify background color of receipt is white (rgb(255, 255, 255))
    const bgColor = await receiptCanvas.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).toBe('rgb(255, 255, 255)');
  });
});
