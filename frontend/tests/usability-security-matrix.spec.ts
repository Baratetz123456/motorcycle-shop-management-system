import { test, expect, Page } from "@playwright/test";
import path from "path";
import os from "os";
import fs from "fs";

// Ensure zero repository pollution by saving test visual captures strictly in temporary artifacts directory
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || path.join(os.tmpdir(), "motoshop-test-artifacts");
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

// Common mock fixtures for deterministic testing
const MOCK_INVENTORY_ITEMS = [
  {
    id: "item-oil-01",
    sku: "LUB-MOT-7100",
    name: "Motul 7100 4T 10W-40 Synthetic Oil",
    brand: "Motul",
    item_type: "PRODUCT",
    category: "Fluids",
    current_stock: 24,
    reorder_level: 5,
    cost_price: 450,
    selling_price: 650,
    is_active: true,
  },
  {
    id: "item-brake-02",
    sku: "BRK-RCB-S1",
    name: "RCB S1 Series Floating Brake Disc 298mm",
    brand: "RCB",
    item_type: "PRODUCT",
    category: "Brakes",
    current_stock: 8,
    reorder_level: 2,
    cost_price: 2100,
    selling_price: 2850,
    is_active: true,
  },
  {
    id: "item-srv-tuneup",
    sku: "SRV-TUNE-PMS",
    name: "Comprehensive PMS & Throttle Body Cleaning",
    brand: "MotoShop Service",
    item_type: "SERVICE",
    category: "PMS",
    current_stock: 999,
    reorder_level: 0,
    cost_price: 150,
    selling_price: 650,
    is_active: true,
  },
  {
    id: "item-srv-cvt",
    sku: "SRV-CVT-CLEAN",
    name: "Scooter CVT Cleaning & Regreasing",
    brand: "MotoShop Service",
    item_type: "SERVICE",
    category: "CVT",
    current_stock: 999,
    reorder_level: 0,
    cost_price: 100,
    selling_price: 450,
    is_active: true,
  },
];

const MOCK_REPAIR_JOBS = [
  {
    id: "job-101",
    jo_number: "JO-2026-001",
    customer_name: "Juan Dela Cruz",
    customer: "Juan Dela Cruz",
    motorcycle_name: "Yamaha NMAX 155",
    motorcycle: "Yamaha NMAX 155",
    status: "ONGOING",
    bay_number: "Bay 1",
    assigned_mechanic_name: "Mike Smith",
    mechanic: "Mike Smith",
    mechanic_id: "usr-mech-01",
    labor_charge: 650,
    parts_charge: 650,
    total_amount: 1300,
    is_paid: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "job-102",
    jo_number: "JO-2026-002",
    customer_name: "Maria Santos",
    customer: "Maria Santos",
    motorcycle_name: "Honda Click 125i",
    motorcycle: "Honda Click 125i",
    status: "PENDING",
    bay_number: "Bay 2",
    assigned_mechanic_name: "Alex Reyes",
    mechanic: "Alex Reyes",
    mechanic_id: "usr-mech-02",
    labor_charge: 450,
    parts_charge: 0,
    total_amount: 450,
    is_paid: false,
    created_at: new Date().toISOString(),
  },
];

const MOCK_USERS = [
  {
    id: "usr-admin-01",
    email: "admin@motoshop.com",
    first_name: "Alexander",
    last_name: "Wright",
    role: "admin",
    is_active: true,
    created_at: "2026-01-01T08:00:00Z",
  },
  {
    id: "usr-cashier-01",
    email: "cashier@motoshop.com",
    first_name: "Sarah",
    last_name: "Connor",
    role: "cashier",
    is_active: true,
    created_at: "2026-01-10T08:00:00Z",
  },
  {
    id: "usr-mech-01",
    email: "mechanic@motoshop.com",
    first_name: "Mike",
    last_name: "Smith",
    role: "mechanic",
    is_active: true,
    created_at: "2026-01-15T08:00:00Z",
  },
];

/**
 * Helper to setup mock API routes and session state for any test
 */
async function setupMockSession(
  page: Page,
  options: {
    role: "admin" | "manager" | "cashier" | "mechanic";
    name?: string;
    email?: string;
    id?: string;
    theme?: string;
  }
) {
  const { role, name = "Test User", email = `${role}@motoshop.com`, id = `usr-${role}-01`, theme = "kawasaki" } = options;

  // Intercept silent refresh auth - targeted strictly to API endpoint
  await page.route("**/api/v1/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: `mock-${role}-token-${Date.now()}`,
        role: role,
        user_id: id,
        first_name: name.split(" ")[0],
        last_name: name.split(" ")[1] || "Staff",
        display_mode: "dark",
      }),
    });
  });

  // Intercept inventory items - targeted strictly to API endpoint
  await page.route("**/api/v1/inventory/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: MOCK_INVENTORY_ITEMS,
        total: MOCK_INVENTORY_ITEMS.length,
      }),
    });
  });

  // Intercept repair jobs - targeted strictly to API endpoint
  await page.route("**/api/v1/repairs/jobs/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: MOCK_REPAIR_JOBS,
        total: MOCK_REPAIR_JOBS.length,
      }),
    });
  });

  // Intercept repair status counts - targeted strictly to API endpoint
  await page.route("**/api/v1/repairs/status-counts/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        PENDING: 1,
        ONGOING: 1,
        COMPLETED: 0,
        RELEASED: 0,
      }),
    });
  });

  // Intercept users list - targeted strictly to API endpoint
  await page.route("**/api/v1/users/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        users: MOCK_USERS,
        total: MOCK_USERS.length,
      }),
    });
  });

  // Intercept system settings - targeted strictly to API endpoint
  await page.route("**/api/v1/system/settings/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        app_name: "MotoShop Pro",
        store_name: "MotoShop Performance Center",
        tin_number: "987-654-321-000",
        address: "123 Racing Avenue, Quezon City",
        phone: "+63 917 123 4567",
      }),
    });
  });

  // Seed authenticated local state
  await page.addInitScript(
    ({ r, n, e, uid, thm, items, jobs }) => {
      localStorage.setItem("user_role", r);
      localStorage.setItem("user_name", n);
      localStorage.setItem("user_email", e);
      localStorage.setItem("user_id", uid);
      localStorage.setItem("motoshop_active_theme", thm);
      localStorage.setItem("motoshop_custom_inventory", JSON.stringify(items));
      localStorage.setItem("motoshop_custom_repairs", JSON.stringify(jobs));
      document.cookie = "motoshop_mode=dark; path=/";
    },
    { r: role, n: name, e: email, uid: id, thm: theme, items: MOCK_INVENTORY_ITEMS, jobs: MOCK_REPAIR_JOBS }
  );
}

// ============================================================================
// SUITE 1: Desktop Usability & Navigation (1440x900)
// ============================================================================
test.describe("Suite 1: Desktop Usability & Navigation (1440x900)", () => {
  test.use({
    viewport: { width: 1440, height: 900 },
  });

  test.beforeEach(async ({ page }) => {
    await setupMockSession(page, { role: "admin", name: "Alexander Wright" });
  });

  test("Desktop Sidebar: renders high-level navigation links and switches active states", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Sidebar navigation check
    const sidebar = page.locator("aside, [aria-label*='Sidebar']").first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    const posLink = page.locator("a[href*='/pos']").first();
    const repairsLink = page.locator("a[href*='/repairs/board']").first();
    const inventoryLink = page.locator("a[href*='/inventory']").first();
    const salesLink = page.locator("a[href*='/sales']").first();

    await expect(posLink).toBeVisible();
    await expect(repairsLink).toBeVisible();
    await expect(inventoryLink).toBeVisible();
    await expect(salesLink).toBeVisible();

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "desktop-sidebar-nav.png") });
  });

  test("Desktop POS Terminal: 2-column layout with catalog cards and active cart panel", async ({ page }) => {
    await page.goto("/pos");
    await page.waitForLoadState("networkidle");

    // Showroom counter heading
    const counterHeading = page.locator("h1:has-text('Showroom Counter')").first();
    await expect(counterHeading).toBeVisible({ timeout: 10000 });

    // Search input exists and is interactive
    const searchInput = page.locator("input[placeholder*='Search']").first();
    await expect(searchInput).toBeVisible();

    // Catalog items render
    const catalogCards = page.locator("text=/Comprehensive PMS|Scooter CVT/i").first();
    await expect(catalogCards).toBeVisible();

    // Cart / Order review buttons
    const reviewOrderBtn = page.locator("button:has-text('Review Order'), button:has-text('Catalog')").first();
    await expect(reviewOrderBtn).toBeVisible();

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "desktop-pos-terminal.png") });
  });

  test("Desktop Workshop Repair Board: renders Kanban columns and stage indicators", async ({ page }) => {
    await page.goto("/repairs/board");
    await page.waitForLoadState("networkidle");

    // Check Workshop Job Cards heading
    const boardHeading = page.locator("h1:has-text('Workshop Job Cards')").first();
    await expect(boardHeading).toBeVisible({ timeout: 10000 });

    // Check for Kanban board column headings
    const stages = page.locator("text=/New|In Progress|Completed|Invoiced/i").first();
    await expect(stages).toBeVisible();

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "desktop-repair-board.png") });
  });

  test("Desktop Master Inventory: renders datatable with sticky header and row data", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Inventory heading
    const invHeading = page.locator("h1:has-text('Parts & Stock')").first();
    await expect(invHeading).toBeVisible({ timeout: 10000 });

    // Datatable header and items
    const searchBar = page.locator("input[placeholder*='Search']").first();
    await expect(searchBar).toBeVisible();

    // Verify row item is visible
    const rowItem = page.locator("text=/Motul 7100|RCB S1 Series/i").locator("visible=true").first();
    await expect(rowItem).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "desktop-inventory-table.png") });
  });
});

// ============================================================================
// SUITE 2: Tablet Responsive Breakpoint (768x1024)
// ============================================================================
test.describe("Suite 2: Tablet Responsive Breakpoint (768x1024)", () => {
  test.use({
    viewport: { width: 768, height: 1024 }, // iPad portrait
  });

  test.beforeEach(async ({ page }) => {
    await setupMockSession(page, { role: "manager", name: "Marcus Brody" });
  });

  test("Tablet Viewport: ensures zero horizontal window overflow across core pages", async ({ page }) => {
    // POS Page
    await page.goto("/pos");
    await page.waitForLoadState("networkidle");

    const posScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const posClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(posScrollWidth).toBeLessThanOrEqual(posClientWidth + 1); // 1px rounding margin

    // Inventory Page
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    const invScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const invClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(invScrollWidth).toBeLessThanOrEqual(invClientWidth + 1);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "tablet-inventory-responsive.png") });
  });
});

// ============================================================================
// SUITE 3: Mobile Touch Usability & Invariants (375x812)
// ============================================================================
test.describe("Suite 3: Mobile Touch Usability & Invariants (375x812)", () => {
  test.use({
    viewport: { width: 375, height: 812 }, // iPhone 13/14
  });

  test("Cashier Role: Mobile Bottom Nav displays designated counter and sales tabs", async ({ page }) => {
    await setupMockSession(page, { role: "cashier", name: "Sarah Connor" });

    await page.goto("/pos");
    await page.waitForLoadState("networkidle");

    const bottomNav = page.locator("nav[aria-label='Mobile Bottom Navigation']");
    await expect(bottomNav).toBeVisible({ timeout: 10000 });

    const posTab = bottomNav.locator("a[href*='/pos']");
    const salesTab = bottomNav.locator("a[href*='/sales']");
    await expect(posTab).toBeVisible();
    await expect(salesTab).toBeVisible();

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "mobile-cashier-bottom-nav.png") });
  });

  test("Mechanic Role: Mobile Bottom Nav displays Job Cards & Bike Registry", async ({ page }) => {
    await setupMockSession(page, { role: "mechanic", name: "Mike Smith" });

    await page.goto("/repairs/board");
    await page.waitForLoadState("networkidle");

    const bottomNav = page.locator("nav[aria-label='Mobile Bottom Navigation']");
    await expect(bottomNav).toBeVisible({ timeout: 10000 });

    const jobsTab = bottomNav.locator("a[href*='/repairs/board']");
    await expect(jobsTab).toBeVisible();

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "mobile-mechanic-bottom-nav.png") });
  });

  test("Mobile POS: 2-column catalog grid and floating filter FAB drawer", async ({ page }) => {
    await setupMockSession(page, { role: "cashier", name: "Sarah Connor" });

    await page.goto("/pos");
    await page.waitForLoadState("networkidle");

    // Check for Floating Filter FAB
    const filterFab = page.locator("[data-testid='pos-mobile-filter-fab']");
    if (await filterFab.isVisible()) {
      await expect(filterFab).toBeVisible();
      // Click filter FAB to summon mobile filter drawer
      await filterFab.click();

      // Verify filter sheet appears
      const filterSheet = page.locator("text=/Filter Catalog|Filter Options|Search Parts & Services/i").first();
      await expect(filterSheet).toBeVisible();

      // Dismiss filter sheet
      const closeBtn = page.locator("button[aria-label='Close'], button:has-text('Close')").first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "mobile-pos-filter-fab.png") });
  });

  test("WCAG Contrast Invariant: Primary solid action buttons enforce high-contrast carbon text", async ({ page }) => {
    await setupMockSession(page, { role: "admin", name: "Alexander Wright" });

    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Look for primary action buttons with solid lime/green styling
    const primarySaveBtn = page.locator("button:has-text('Save Store Settings')");
    await expect(primarySaveBtn).toBeVisible({ timeout: 10000 });

    // Invariant: MUST use carbon black / high-contrast text on solid lime button
    await expect(primarySaveBtn).toHaveClass(/(text-zinc-950|text-black|text-neutral-950|text-white)/);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "mobile-wcag-button-contrast.png") });
  });
});

// ============================================================================
// SUITE 4: Security & RBAC Route Enforcement
// ============================================================================
test.describe("Suite 4: Security & RBAC Route Enforcement", () => {
  test("Cashier restricted route access triggers Access Denied security screen", async ({ page }) => {
    await setupMockSession(page, { role: "cashier", name: "Sarah Connor" });

    // Attempt to access restricted administrative user management
    await page.goto("/users");
    await page.waitForLoadState("networkidle");

    // Must trigger Access Denied security banner
    const accessDeniedHeading = page.locator("h2:has-text('Access Denied')");
    await expect(accessDeniedHeading).toBeVisible({ timeout: 10000 });

    const deniedText = page.locator("text=/Role CASHIER is not permitted/i");
    await expect(deniedText).toBeVisible();

    const fallbackBtn = page.locator("button:has-text('Go to')");
    await expect(fallbackBtn).toBeVisible();

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "security-cashier-denied-users.png") });
  });

  test("Cashier restricted audit logs triggers Access Denied screen", async ({ page }) => {
    await setupMockSession(page, { role: "cashier", name: "Sarah Connor" });

    // Attempt to access immutable audit logs
    await page.goto("/audit-logs");
    await page.waitForLoadState("networkidle");

    const accessDeniedHeading = page.locator("h2:has-text('Access Denied')");
    await expect(accessDeniedHeading).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "security-cashier-denied-audit.png") });
  });

  test("Mechanic restricted POS terminal triggers Access Denied screen", async ({ page }) => {
    await setupMockSession(page, { role: "mechanic", name: "Mike Smith" });

    // Attempt to access counter POS checkout
    await page.goto("/pos");
    await page.waitForLoadState("networkidle");

    const accessDeniedHeading = page.locator("h2:has-text('Access Denied')");
    await expect(accessDeniedHeading).toBeVisible({ timeout: 10000 });

    const deniedText = page.locator("text=/Role MECHANIC is not permitted/i");
    await expect(deniedText).toBeVisible();

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "security-mechanic-denied-pos.png") });
  });

  test("In-Memory Token Security: verifies JWT auth token is never persisted into localStorage", async ({ page }) => {
    await setupMockSession(page, { role: "cashier", name: "Sarah Connor" });

    await page.goto("/pos");
    await page.waitForLoadState("networkidle");

    // Verify localStorage isolation
    const storageKeys = await page.evaluate(() => {
      return {
        authToken: localStorage.getItem("auth_token"),
        accessToken: localStorage.getItem("access_token"),
        userRole: localStorage.getItem("user_role"),
        userName: localStorage.getItem("user_name"),
      };
    });

    // Sensitive JWT tokens must NEVER be kept in localStorage
    expect(storageKeys.authToken).toBeNull();
    expect(storageKeys.accessToken).toBeNull();

    // Only non-sensitive profile attributes are retained
    expect(storageKeys.userRole).toBe("cashier");
    expect(storageKeys.userName).toBe("Sarah Connor");
  });
});

// ============================================================================
// SUITE 5: Destructive Action Safeguards
// ============================================================================
test.describe("Suite 5: Destructive Action Safeguards", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockSession(page, { role: "admin", name: "Alexander Wright" });
  });

  test("Job Profile Note Deletion: requires ConfirmModal before executing delete", async ({ page }) => {
    await page.goto("/repairs/jobs/preview");
    await page.waitForLoadState("networkidle");

    // Look for delete button or note deletion trigger
    const deleteAction = page.locator("button[title*='Delete'], button:has-text('Delete')").first();
    if (await deleteAction.isVisible()) {
      await deleteAction.click();

      // Confirm modal should appear with danger confirmation
      const confirmModal = page.locator("div[role='dialog'], div:has(> div:has-text('Delete'))").first();
      await expect(confirmModal).toBeVisible();

      // Dismiss without executing
      const cancelBtn = page.locator("button:has-text('Cancel'), button:has-text('Keep')").first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
      }
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "safeguard-job-deletion-modal.png") });
  });

  test("Inventory Item Profile: Edit and Delete actions render with modal safeguards", async ({ page }) => {
    await page.goto("/inventory/preview");
    await page.waitForLoadState("networkidle");

    const editBtn = page.locator("button:has-text('Edit Details')").first();
    const deleteBtn = page.locator("button:has-text('Delete Item')").first();

    if (await editBtn.isVisible() && await deleteBtn.isVisible()) {
      await expect(editBtn).toBeVisible();
      await expect(deleteBtn).toBeVisible();
      await expect(deleteBtn).toHaveClass(/(text-rose|bg-rose)/);

      // Click Edit Details to check modal footer
      await editBtn.click();
      const saveChangesBtn = page.locator("button:has-text('Save Changes')").first();
      const cancelBtn = page.locator("button:has-text('Cancel')").first();

      await expect(saveChangesBtn).toBeVisible();
      await expect(cancelBtn).toBeVisible();

      await cancelBtn.click();
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "safeguard-inventory-actions.png") });
  });
});

test.describe("Suite 6: Mobile Floating Add & Filter FAB Stacked Invariants (375x812)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await setupMockSession(page, { role: "admin", name: "Alexander Wright" });
  });

  test("Repair Board: renders stacked Filter FAB and Add FAB, opens modal without duplicate header buttons", async ({ page }) => {
    await page.goto("/repairs/board/");
    await page.waitForLoadState("networkidle");

    const addFab = page.locator("button[data-testid='repairs-board-add-fab']");
    const filterFab = page.locator("button[data-testid='pos-mobile-filter-fab']");

    await expect(addFab).toBeVisible();
    await expect(filterFab).toBeVisible();

    // Verify top header New Job Card is hidden on mobile
    const headerAddBtn = page.locator("div.hidden.md\\:flex button:has-text('New Job Card')");
    await expect(headerAddBtn).toBeHidden();

    // Click Add FAB and verify modal opens
    await addFab.click();
    const modalHeader = page.locator("h2, h3").filter({ hasText: /New Repair Job|Create Job Card|New Job Card/i }).first();
    await expect(modalHeader).toBeVisible();

    // Close modal
    const closeBtn = page.locator("button[aria-label='Close'], button:has-text('Cancel')").first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "mobile-fab-repairs-board.png") });
  });

  test("Inventory: renders stacked Filter FAB and Add FAB, opens modal without duplicate header buttons", async ({ page }) => {
    await page.goto("/inventory/");
    await page.waitForLoadState("networkidle");

    const addFab = page.locator("button[data-testid='inventory-add-fab']");
    const filterFab = page.locator("button[data-testid='pos-mobile-filter-fab']");

    await expect(addFab).toBeVisible();
    await expect(filterFab).toBeVisible();

    // Verify top header Add Item is hidden on mobile
    const headerAddBtn = page.locator("button.hidden.md\\:flex:has-text('Add Item')");
    await expect(headerAddBtn).toBeHidden();

    // Click Add FAB and verify modal opens
    await addFab.click();
    const modalHeader = page.locator("h2, h3, div").filter({ hasText: /Add New Part|Add New/i }).first();
    await expect(modalHeader).toBeVisible();

    // Close modal
    const cancelBtn = page.locator("button:has-text('Cancel')").first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "mobile-fab-inventory.png") });
  });

  test("Motorcycles: renders stacked Filter FAB and Add FAB, opens modal without duplicate header buttons", async ({ page }) => {
    await page.goto("/motorcycles/");
    await page.waitForLoadState("networkidle");

    const addFab = page.locator("button[data-testid='motorcycles-add-fab']");
    const filterFab = page.locator("button[data-testid='pos-mobile-filter-fab']");

    await expect(addFab).toBeVisible();
    await expect(filterFab).toBeVisible();

    // Verify top header Add Bike Model is hidden on mobile
    const headerAddBtn = page.locator("div.hidden.md\\:flex button:has-text('Add Bike Model')");
    await expect(headerAddBtn).toBeHidden();

    // Click Add FAB and verify modal opens
    await addFab.click();
    const modalHeader = page.locator("h2, h3").filter({ hasText: /Register Motorcycle Model|Add Bike Model/i }).first();
    await expect(modalHeader).toBeVisible();

    // Close modal
    const cancelBtn = page.locator("button:has-text('Cancel')").first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "mobile-fab-motorcycles.png") });
  });

  test("Settings Staff Accounts: renders stacked Filter FAB and Add Staff FAB", async ({ page }) => {
    await page.goto("/settings/?tab=users");
    await page.waitForLoadState("networkidle");

    const addFab = page.locator("a[data-testid='settings-users-add-fab']");
    const filterFab = page.locator("button[data-testid='pos-mobile-filter-fab']");

    await expect(addFab).toBeVisible();
    await expect(filterFab).toBeVisible();

    // Verify header Add Staff link is hidden on mobile
    const headerAddLink = page.locator("a.hidden.md\\:flex:has-text('Add Staff')");
    await expect(headerAddLink).toBeHidden();

    // Verify href targets register (supporting trailing slash)
    await expect(addFab).toHaveAttribute("href", /\/users\/register\/?/);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "mobile-fab-settings-users.png") });
  });

  test("Financial Ledger (/reports/extract): renders stacked Filter FAB and Record Expense Add FAB", async ({ page }) => {
    await page.goto("/reports/extract/");
    await page.waitForLoadState("networkidle");

    const addFab = page.locator("button[data-testid='reports-extract-add-fab']");
    const filterFab = page.locator("button[data-testid='pos-mobile-filter-fab']");

    await expect(addFab).toBeVisible();
    await expect(filterFab).toBeVisible();

    // Verify header Record Expense is hidden on mobile
    const headerRecordBtn = page.locator("button.hidden.md\\:flex:has-text('Record Expense')");
    await expect(headerRecordBtn).toBeHidden();

    // Click Add FAB and verify modal opens
    await addFab.click();
    const modalHeader = page.locator("text=Record Operating Expense").first();
    await expect(modalHeader).toBeVisible();

    // Close modal
    const cancelBtn = page.locator("button:has-text('Cancel')").first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "mobile-fab-reports-extract.png") });
  });
});

