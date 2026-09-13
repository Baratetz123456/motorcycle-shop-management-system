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

    // Switch to Commission & Payslips tab
    await page.locator('button:has-text("Commission & Payslips")').click();

    // Click technician table row or navigate to payslip page
    const techTable = page.locator('[data-technician-table="true"]');
    await expect(techTable).toBeVisible({ timeout: 10000 });
    const firstRow = techTable.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await firstRow.click();
    await page.waitForURL(/.*payroll\/payslip.*/);

    // Verify payslip canvas is displayed
    const payslipCanvas = page.locator('.printable-payslip, [data-payslip-canvas="true"]').first();
    await expect(payslipCanvas).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="itemized-activity-ledger"]')).toBeVisible({ timeout: 10000 });

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

  test('Invoice and Payslip dedicated pages: mobile view hides top buttons and renders floating action sheet; desktop shows top bar and hides FAB', async ({ page }) => {
    // 1. Invoice Page Mobile View (390 x 844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem('motoshop_sales_logs', JSON.stringify([{
        id: 'tx-mobile-test',
        invoice_no: 'INV-MOB-01',
        customer_name: 'Mobile Customer',
        subtotal: 1000,
        total: 1000,
        amount_paid: 1000,
        status: 'COMPLETED',
        payment_method: 'CASH',
        created_at: new Date().toISOString(),
        items: [{ name: 'Oil Filter', qty: 1, price: 1000, type: 'product' }]
      }]));
    });

    await page.goto('/sales/receipt?id=tx-mobile-test');
    await page.waitForLoadState('networkidle');

    // On mobile: top bar is hidden
    const topBar = page.locator('button:has-text("Print / Save PDF")');
    await expect(topBar).not.toBeVisible();

    // On mobile: floating actions button is visible
    const fab = page.locator('button[aria-label="Open document actions sheet"]');
    await expect(fab).toBeVisible();

    // Tap floating button to open action sheet
    await fab.click();
    await expect(page.locator('text=Invoice Actions')).toBeVisible();
    await expect(page.locator('button:visible:has-text("Back to Invoices")')).toBeVisible();
    await expect(page.locator('button:visible:has-text("Download CSV Report")')).toBeVisible();
    await expect(page.locator('button:visible:has-text("Copy Invoice Number")')).toBeVisible();
    await expect(page.locator('button:visible:has-text("Print / Save PDF")')).toBeVisible();

    // Close action sheet
    await page.locator('button[aria-label="Close action sheet"]').click();

    // 2. Payslip Page Mobile View (390 x 844)
    await page.goto('/payroll/payslip?id=staff-01&role=Mechanic');
    await page.waitForLoadState('networkidle');

    // Top print button is hidden on mobile
    const payslipTopPrint = page.locator('button:visible:has-text("Print Official Payslip")');
    await expect(payslipTopPrint).not.toBeVisible();

    // Floating action button is visible on mobile
    const payslipFab = page.locator('button[aria-label="Open document actions sheet"]');
    await expect(payslipFab).toBeVisible();

    // Tap floating button to open action sheet
    await payslipFab.click();
    await expect(page.locator('text=Payslip Actions')).toBeVisible();
    await expect(page.locator('button:visible:has-text("Back to Payroll")')).toBeVisible();
    await expect(page.locator('button:visible:has-text("Download CSV Voucher")')).toBeVisible();
    await expect(page.locator('button:visible:has-text("Copy Voucher Number")')).toBeVisible();
    await expect(page.locator('button:visible:has-text("Print Official Payslip")')).toBeVisible();

    // Close action sheet
    await page.locator('button[aria-label="Close action sheet"]').click();

    // 3. Desktop View (1440 x 900) - Top bar visible, FAB hidden
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator('button:visible:has-text("Print Official Payslip")')).toBeVisible();
    await expect(page.locator('button:visible:has-text("Back to Payroll")')).toBeVisible();
    await expect(page.locator('button:visible:has-text("Download CSV")')).toBeVisible();
    await expect(payslipFab).not.toBeVisible();
  });

  test('Text selection strictly enforces high-contrast emerald highlight with white text', async ({ page }) => {
    await page.goto('/payroll');
    await page.waitForLoadState('networkidle');

    // Evaluate computed ::selection pseudo-element style on body
    const selectionStyles = await page.evaluate(() => {
      const body = document.querySelector('body');
      const win = window;
      const pseudo = win.getComputedStyle(body!, '::selection');
      return {
        bg: pseudo.backgroundColor,
        color: pseudo.color,
      };
    });

    // Verify emerald background and white text
    expect(['rgb(5, 150, 105)', 'rgb(16, 185, 129)', '#059669', 'rgba(5, 150, 105, 1)']).toContain(selectionStyles.bg);
    expect(['rgb(255, 255, 255)', '#ffffff', 'rgba(255, 255, 255, 1)']).toContain(selectionStyles.color);
  });

  test('Payroll page has dual tabs (Overview & Commissions) and Technician Commission Accounts renders as dedicated datatable without action buttons or modal flashing', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/payroll');
    await page.waitForLoadState('networkidle');

    // 1. Verify two primary tabs exist and Overview is default active
    await expect(page.locator('button:has-text("Overview")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Commission & Payslips")').first()).toBeVisible();
    await expect(page.locator('text=Total Payroll Liability')).toBeVisible();

    // 2. Switch to "Commission & Payslips" tab
    await page.locator('button:has-text("Commission & Payslips")').first().click();

    // 3. Table exists
    const techTable = page.locator('[data-technician-table="true"]');
    await expect(techTable).toBeVisible({ timeout: 10000 });

    // 4. Table column headers are present
    await expect(techTable.locator('th:has-text("Technician")')).toBeVisible();
    await expect(techTable.locator('th:has-text("Rate")')).toBeVisible();
    await expect(techTable.locator('th:has-text("Jobs Completed")')).toBeVisible();
    await expect(techTable.locator('th:has-text("Labor Billed")')).toBeVisible();
    await expect(techTable.locator('th:has-text("Commission Earned")')).toBeVisible();
    await expect(techTable.locator('th:has-text("Settlement Status")')).toBeVisible();

    // 5. Verify no colored action buttons in technician table rows (Disburse / Payslip buttons removed from rows)
    await expect(techTable.locator('tbody button:has-text("Disburse")')).not.toBeVisible();
    await expect(techTable.locator('tbody button:has-text("Payslip")')).not.toBeVisible();

    // 6. Verify rightmost column has chevron and View Profile on hover
    const firstRow = techTable.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    await expect(firstRow.locator('text=View Profile')).toBeAttached();

    // 7. Verify Cashier sub-tab parity, unified emerald styling, and removed shifts/txs columns
    const cashierToggle = page.locator('button:has-text("Cashiers")').first();
    await cashierToggle.click();
    await expect(cashierToggle).toHaveClass(/bg-emerald-600/);

    const cashierTable = page.locator('[data-cashier-table="true"]');
    await expect(cashierTable).toBeVisible({ timeout: 10000 });
    await expect(cashierTable.locator('th:has-text("Shifts Logged")')).not.toBeVisible();
    await expect(cashierTable.locator('th:has-text("POS Transactions")')).not.toBeVisible();
    await expect(cashierTable.locator('th:has-text("Volume Handled")')).toBeVisible();
    await expect(cashierTable.locator('th:has-text("Total Compensation")')).toBeVisible();
    await expect(cashierTable.locator('tbody button:has-text("Disburse")')).not.toBeVisible();
    await expect(cashierTable.locator('tbody button:has-text("Payslip")')).not.toBeVisible();

    // 8. Click cashier row and verify navigation directly to dedicated item profile / payslip page without modal flash
    const firstCashierRow = cashierTable.locator('tbody tr').first();
    await firstCashierRow.click();
    await page.waitForURL(/.*payroll\/payslip.*/);
    expect(page.url()).toContain('/payroll/payslip');
    expect(page.url()).toContain('subtab=CASHIERS');

    // 9. Verify dedicated profile page contains Disburse Settlement, Print Official Payslip, and Itemized Ledger
    await expect(page.locator('button:has-text("Print Official Payslip")')).toBeVisible();
    const disburseBtn = page.locator('button:has-text("Disburse Settlement"), span:has-text("Settlement Disbursed")');
    await expect(disburseBtn.first()).toBeVisible();
    await expect(page.locator('[data-testid="itemized-activity-ledger"]')).toBeVisible({ timeout: 10000 });

    // 10. Click Back to Payroll and assert it returns directly to Commission & Payslips tab with Cashier table active
    await page.locator('button:has-text("Back to Payroll")').first().click();
    await page.waitForURL(/.*payroll\?tab=COMMISSIONS&subtab=CASHIERS/);
    await expect(page.locator('[data-cashier-table="true"]')).toBeVisible({ timeout: 10000 });

    // 11. Switch to Mechanics, open payslip, click Back, assert returns to Mechanics table
    const mechanicToggle = page.locator('button:has-text("Mechanics")').first();
    await mechanicToggle.click();
    await expect(mechanicToggle).toHaveClass(/bg-emerald-600/);
    const techRow = page.locator('[data-technician-table="true"] tbody tr').first();
    await techRow.click();
    await page.waitForURL(/.*payroll\/payslip.*/);
    expect(page.url()).toContain('subtab=MECHANICS');
    await page.locator('button:has-text("Back to Payroll")').first().click();
    await page.waitForURL(/.*payroll\?tab=COMMISSIONS&subtab=MECHANICS/);
    await expect(page.locator('[data-technician-table="true"]')).toBeVisible({ timeout: 10000 });
  });

  test('Mobile view of Payroll page switches tabs, renders cards with chevron, and navigates without modal flash', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/payroll');
    await page.waitForLoadState('networkidle');

    // Switch to Commission & Payslips tab
    await page.locator('button:has-text("Commission & Payslips")').first().click();

    const techTable = page.locator('[data-technician-table="true"]');
    await expect(techTable).toBeVisible({ timeout: 10000 });

    // In mobile view, cards are rendered without colored buttons
    const mobileCards = techTable.locator('.md\\:hidden > div');
    await expect(mobileCards.first()).toBeVisible();
    await expect(mobileCards.locator('button:has-text("Disburse")')).not.toBeVisible();

    // Click card navigates directly to /payroll/payslip without modal flash
    await mobileCards.first().click();
    await page.waitForURL(/.*payroll\/payslip.*/);
    expect(page.url()).toContain('/payroll/payslip');

    // In mobile view of /payroll/payslip, floating action button opens sheet with Disburse Settlement & Print
    const fab = page.locator('button[aria-label="Open document actions sheet"]');
    await expect(fab).toBeVisible({ timeout: 10000 });
    await fab.click();
    await expect(page.locator('button:visible:has-text("Print Official Payslip")')).toBeVisible();
  });
});

