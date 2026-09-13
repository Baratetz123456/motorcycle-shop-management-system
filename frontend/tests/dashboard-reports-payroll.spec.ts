import { test, expect } from "@playwright/test";
import path from "path";
import os from "os";
import fs from "fs";

const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || path.join(os.tmpdir(), "motoshop-test-artifacts");
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

test.describe("Executive Dashboard, Reports & Payroll Redesign Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Mock /auth/refresh as admin
    await page.route("**/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "mock-admin-token",
          role: "admin",
          user_id: "usr-admin-01",
          first_name: "Admin",
          last_name: "Commander",
          display_mode: "light",
        }),
      });
    });

    // Mock backend repair jobs, commissions, inventory, and sales
    await page.route("**/repairs/jobs**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: "job-1",
              jo_number: "JO-1001",
              customer_name: "Juan Dela Cruz",
              motorcycle_name: "Yamaha NMAX 155",
              status: "IN_PROGRESS",
              bay_number: "Bay 1",
              assigned_mechanic_name: "Mike Smith",
              created_at: new Date().toISOString(),
              total_amount: 1450,
            },
            {
              id: "job-2",
              jo_number: "JO-1002",
              customer_name: "Maria Santos",
              motorcycle_name: "Honda Click 125i",
              status: "DIAGNOSING",
              bay_number: "Bay 2",
              assigned_mechanic_name: "Alex Reyes",
              created_at: new Date().toISOString(),
              total_amount: 850,
            },
            {
              id: "job-3",
              jo_number: "JO-1003",
              customer_name: "Pedro Penduko",
              motorcycle_name: "Kawasaki Ninja 400",
              status: "WAITING_PARTS",
              bay_number: "Bay 3",
              assigned_mechanic_name: "Mike Smith",
              created_at: new Date().toISOString(),
              total_amount: 3200,
            },
          ],
          total: 3,
        }),
      });
    });

    await page.route("**/repairs/commissions**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "comm-1",
            job_order_id: "job-1",
            jo_number: "JO-1001",
            customer_name: "Juan Dela Cruz",
            motorcycle_name: "Yamaha NMAX 155",
            mechanic_id: "mech-1",
            mechanic_name: "Mike Smith",
            labor_base: 800,
            rate_percentage: 35,
            amount_earned: 280,
            status: "PENDING",
            created_at: new Date().toISOString(),
          },
          {
            id: "comm-2",
            job_order_id: "job-2",
            jo_number: "JO-1002",
            customer_name: "Maria Santos",
            motorcycle_name: "Honda Click 125i",
            mechanic_id: "mech-2",
            mechanic_name: "Alex Reyes",
            labor_base: 500,
            rate_percentage: 30,
            amount_earned: 150,
            status: "PENDING",
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.route("**/sales/transactions**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "sale-1",
            invoice_no: "INV-9001",
            customer_name: "Juan Dela Cruz",
            cashier_name: "Cashier Sarah",
            payment_method: "CASH",
            status: "COMPLETED",
            subtotal: 1200,
            tax: 144,
            total: 1344,
            created_at: new Date().toISOString(),
          },
          {
            id: "sale-2",
            invoice_no: "INV-9002",
            customer_name: "Elena Ramos",
            cashier_name: "Cashier Sarah",
            payment_method: "GCASH",
            status: "COMPLETED",
            subtotal: 2500,
            tax: 300,
            total: 2800,
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.route("**/auth/users**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: "cashier-1",
              email: "sarah@motoshop.com",
              first_name: "Sarah",
              last_name: "Gomez",
              role: "cashier",
              base_wage: 650,
            },
          ],
        }),
      });
    });

    // Seed session
    await page.addInitScript(() => {
      localStorage.setItem("user_role", "admin");
      localStorage.setItem("user_name", "Admin Commander");
      localStorage.setItem("user_id", "usr-admin-01");
      localStorage.setItem("user_email", "admin@motoshop.com");
      localStorage.setItem("motoshop_active_theme", "kawasaki");
      localStorage.setItem(
        "motoshop_custom_inventory",
        JSON.stringify([
          {
            id: "p-1",
            sku: "SKU-OIL-01",
            name: "Yamalube 4T 10W-40 1L",
            brand: "Yamaha",
            category: "Fluids",
            current_stock: 3,
            reorder_level: 5,
            selling_price: 350,
            cost_price: 250,
          },
          {
            id: "p-2",
            sku: "SKU-BRK-02",
            name: "Brembo Ceramic Brake Pad Set",
            brand: "Brembo",
            category: "Brakes",
            current_stock: 1,
            reorder_level: 4,
            selling_price: 1200,
            cost_price: 850,
          },
        ])
      );
    });
  });

  test("1. Executive Command Dashboard (/dashboard) - Desktop & Mobile verification", async ({ page }) => {
    // Desktop Viewport
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Verify Title & Pulse indicator
    await expect(page.locator("h1")).toContainText("Operations Command");
    await expect(page.locator("text=Live Workshop")).toBeVisible();

    // Verify 4-metric KPI Ribbon
    await expect(page.locator("text=Today's Gross Sales")).toBeVisible();
    await expect(page.locator("text=Active Workshop Bays")).toBeVisible();
    await expect(page.locator("text=Stock Reorder Alerts")).toBeVisible();
    await expect(page.locator("text=Unsettled Labor Pay")).toBeVisible();

    // Verify Quick Actions
    await expect(page.locator("button:has-text('New Sale (POS)')")).toBeVisible();
    await expect(page.locator("button:has-text('Job Cards')")).toBeVisible();
    await expect(page.locator("button:has-text('Reports')")).toBeVisible();

    // Take Desktop Screenshot
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "dashboard-desktop.png"), fullPage: true });

    // Mobile Viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Verify mobile tabbed switcher
    const overviewTab = page.locator("button:has-text('Overview')");
    const workshopTab = page.locator("button:has-text('Workshop')");
    const salesTab = page.locator("button:has-text('Recent Sales')");
    const topItemsTab = page.locator("button:has-text('Top Items')");

    await expect(overviewTab).toBeVisible();
    await expect(workshopTab).toBeVisible();
    await expect(salesTab).toBeVisible();
    await expect(topItemsTab).toBeVisible();

    // Click Workshop Tab
    await workshopTab.click();
    await expect(page.locator("text=Workshop Bay Live Status")).toBeVisible();

    // Take Mobile Screenshot
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "dashboard-mobile.png"), fullPage: false });
  });

  test("2. Business Intelligence & Reports (/reports) - Verification", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/reports");
    await page.waitForLoadState("networkidle");

    // Verify Header & Period selector
    await expect(page.locator("h1")).toContainText("Business Intelligence & Reports");
    await expect(page.locator("button:has-text('30 Days')")).toBeVisible();

    // Verify Financial Ribbon
    await expect(page.locator("text=Net Sales Revenue")).toBeVisible();
    await expect(page.locator("text=Est. Operating Margin")).toBeVisible();
    await expect(page.locator("text=Completed Repairs")).toBeVisible();

    // Verify Filter Switch
    await page.locator("button:has-text('7 Days')").click();
    await expect(page.locator("text=+7D")).toBeVisible();

    // Take Desktop Screenshot
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "reports-desktop.png"), fullPage: true });

    // Mobile Viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/reports");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "reports-mobile.png"), fullPage: false });
  });

  test("3. Staff Compensation & Payroll (/payroll) - Verification with Payslip & Safeguards", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/payroll");
    await page.waitForLoadState("networkidle");

    // Verify Header & Confidential Badge
    await expect(page.locator("h1")).toContainText("Staff Compensation & Payroll");
    await expect(page.locator("text=Confidential P&L")).toBeVisible();

    // Verify KPI Ribbon
    await expect(page.locator("text=Total Payroll Liability")).toBeVisible();
    await expect(page.locator("text=Technician Commissions")).toBeVisible();
    await expect(page.locator("text=Cashier Shift Allowances")).toBeVisible();

    // Verify Mechanic Accordion
    await expect(page.locator("text=Mike Smith")).toBeVisible();
    await expect(page.locator("text=35% Comm.")).toBeVisible();

    // Open Payslip Modal
    const payslipBtn = page.locator("button:has-text('Payslip')").first();
    await payslipBtn.click();

    // Verify Modal & TIN Header
    await expect(page.locator("text=Official Staff Compensation Voucher")).toBeVisible();
    await page.waitForTimeout(350);
    await expect(page.locator("text=VERSIKLO MOTORCYCLE PARTS & SERVICES")).toBeVisible();
    await expect(page.locator("text=BIR Registered TIN: 442-891-003-000 Non-VAT")).toBeVisible();
    await expect(page.locator("text=Print Official Payslip")).toBeVisible();

    // Capture Payslip Screenshot
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "payroll-payslip.png") });

    // Close Modal
    await page.locator("button:has-text('Close')").click();

    // Verify Mass Disbursement ConfirmModal Safeguard
    const disburseAllBtn = page.locator("button:has-text('Disburse All Pending')");
    await disburseAllBtn.click();

    // Assert ConfirmModal appears
    await expect(page.locator("text=Confirm Mass Payroll Disbursement")).toBeVisible();
    await expect(page.locator("text=Release Funds")).toBeVisible();
    await page.locator("button:has-text('Cancel')").click();

    // Take Payroll Desktop Screenshot
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "payroll-desktop.png"), fullPage: true });

    // Mobile Viewport Screenshot
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/payroll");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "payroll-mobile.png"), fullPage: false });
  });
});
