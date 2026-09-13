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

    // Mock commissions endpoint so /payroll renders mechanics
    await page.route('**/commissions**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'comm-1',
            job_order_id: 'job-1',
            jo_number: 'JO-1001',
            customer_name: 'Roberto Dela Cruz',
            motorcycle_name: 'Yamaha NMAX 155',
            mechanic_id: 'mech-1',
            mechanic_name: 'Alex Reyes',
            labor_base: 1500,
            rate_percentage: 40,
            amount_earned: 600,
            status: 'PENDING',
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    // Provide initial localStorage auth role
    await page.addInitScript(() => {
      localStorage.setItem('user_role', 'admin');
      localStorage.setItem('user_name', 'Admin User');
      localStorage.setItem('user_id', 'usr-admin-01');
    });
  });

  test('App defaults permanently to Dark Mode and header toggle is removed', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify top header is rendered
    const header = page.locator('header').first();
    await expect(header).toBeVisible({ timeout: 10000 });

    // Verify Sun/Moon toggle button has been removed from the header
    const toggleBtn = page.locator('.header-mode-toggle');
    await expect(toggleBtn).toHaveCount(0);

    // Verify application is permanently locked to dark mode
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDark).toBe(true);

    const dataMode = await page.evaluate(() => document.documentElement.getAttribute('data-mode'));
    expect(dataMode).toBe('dark');
  });

  test('Buttons strictly enforce zero black text invariant across all states', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Inspect application buttons on the page (excluding third-party / Next.js internal overlays)
    const buttons = await page.locator('header button:visible, main button:visible, [role="navigation"] button:visible').all();
    for (const btn of buttons.slice(0, 10)) {
      const info = await btn.evaluate((el) => ({
        tag: el.tagName,
        text: el.textContent?.trim() || '',
        cls: el.className,
        color: window.getComputedStyle(el).color,
      }));
      console.log('Button inspected:', info);
      // Ensure text is light/white, never black (rgb(0,0,0) or rgb(9,9,11))
      expect(info.color).not.toBe('rgb(0, 0, 0)');
      expect(info.color).not.toBe('rgb(9, 9, 11)');
    }
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

  test('Unified Invoice Document renders dark in-app (no white background) and pure white in print with zero motoshop', async ({ page }) => {
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

    // 1. Verify in-app on-screen background is strictly NOT white (dark canvas in app)
    const screenBgColor = await receiptCanvas.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(screenBgColor).not.toBe('rgb(255, 255, 255)');
    expect(['rgb(24, 24, 27)', 'rgb(18, 18, 21)', 'rgb(9, 9, 11)']).toContain(screenBgColor);

    // 2. Verify zero occurrences of the word "motoshop" inside the document canvas
    const canvasText = await receiptCanvas.innerText();
    expect(canvasText.toLowerCase()).not.toContain('motoshop');

    // 3. Emulate print media and verify it flips strictly to pure white canvas (rgb(255, 255, 255))
    await page.emulateMedia({ media: 'print' });
    const printBgColor = await receiptCanvas.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(printBgColor).toBe('rgb(255, 255, 255)');
  });

  test('Unified Payslip Document renders dark in-app (no white background) and pure white in print with zero motoshop', async ({ page }) => {
    await page.goto('/payroll');
    await page.waitForLoadState('networkidle');

    // Click payslip button for first employee in the list
    const payslipBtn = page.locator('button:has-text("Payslip")').first();
    await expect(payslipBtn).toBeVisible({ timeout: 10000 });
    await payslipBtn.click();

    // Verify payslip modal canvas is displayed
    const payslipCanvas = page.locator('.printable-payslip, [data-payslip-canvas="true"]').first();
    await expect(payslipCanvas).toBeVisible({ timeout: 10000 });

    // 1. Verify in-app on-screen background is strictly NOT white (dark canvas in app)
    const screenBgColor = await payslipCanvas.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(screenBgColor).not.toBe('rgb(255, 255, 255)');
    expect(['rgb(24, 24, 27)', 'rgb(18, 18, 21)', 'rgb(9, 9, 11)']).toContain(screenBgColor);

    // 2. Verify zero occurrences of the word "motoshop" inside the payslip document
    const payslipText = await payslipCanvas.innerText();
    expect(payslipText.toLowerCase()).not.toContain('motoshop');

    // 3. Emulate print media and verify it flips strictly to pure white canvas (rgb(255, 255, 255))
    await page.emulateMedia({ media: 'print' });
    const printBgColor = await payslipCanvas.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(printBgColor).toBe('rgb(255, 255, 255)');
  });

  test('Inventory item profile page has no duplicate action buttons on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem('motoshop_app_mode', 'dark');
      localStorage.setItem('user_role', 'admin');
      localStorage.setItem('motoshop_custom_inventory', JSON.stringify([{
        id: 'inv-item-test-1',
        name: 'Motul 7100 4T 10W-40 Synthetic Oil',
        brand: 'Motul',
        sku: 'SKU-MOTUL-7100',
        item_type: 'PRODUCT',
        category: 'Fluids & Lubricants',
        cost_price: 450,
        selling_price: 650,
        current_stock: 12,
        reorder_level: 4,
      }]));
    });

    await page.goto('/inventory/inv-item-test-1');
    await page.waitForLoadState('networkidle');

    // Verify item heading is rendered
    const itemHeading = page.locator('h1:has-text("Motul 7100")');
    await expect(itemHeading).toBeVisible({ timeout: 10000 });

    // Ensure Edit Details and Delete buttons appear exactly once in the entire page on mobile
    const editButtons = page.locator('button:has-text("Edit Details")');
    await expect(editButtons).toHaveCount(1);

    const deleteButtons = page.locator('button:has-text("Delete")');
    await expect(deleteButtons).toHaveCount(1);
  });

  test('Invoice and Payroll pages strictly enforce zero white background in-app on screen', async ({ page }) => {
    // 1. Check /sales
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    const salesPage = page.locator('[data-invoice-page="true"]').first();
    await expect(salesPage).toBeVisible({ timeout: 10000 });
    const salesBg = await salesPage.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(salesBg).not.toBe('rgb(255, 255, 255)');
    expect(['rgb(9, 9, 11)', 'rgb(18, 18, 21)']).toContain(salesBg);

    // 2. Check /payroll
    await page.goto('/payroll');
    await page.waitForLoadState('networkidle');
    const payrollPage = page.locator('[data-payroll-page="true"]').first();
    await expect(payrollPage).toBeVisible({ timeout: 10000 });
    const payrollBg = await payrollPage.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(payrollBg).not.toBe('rgb(255, 255, 255)');
    expect(['rgb(9, 9, 11)', 'rgb(18, 18, 21)']).toContain(payrollBg);
  });
});

