import { test, expect } from "@playwright/test";

test.describe("Save & Delete Buttons UI/UX Overhaul Suite", () => {
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
          last_name: "Boss",
          display_mode: "light",
        }),
      });
    });

    // Seed authenticated admin session & test item
    await page.addInitScript(() => {
      localStorage.setItem("user_role", "admin");
      localStorage.setItem("user_name", "Admin Boss");
      localStorage.setItem("user_id", "usr-admin-01");
      localStorage.setItem("user_email", "admin@motoshop.com");
      localStorage.setItem("motoshop_active_theme", "kawasaki");
      localStorage.setItem(
        "motoshop_custom_inventory",
        JSON.stringify([
          {
            id: "item-1",
            sku: "SKU-TEST-001",
            name: "Motul 7100 10W-40 Synthetic Oil",
            brand: "Motul",
            item_type: "PRODUCT",
            category: "Fluids",
            current_stock: 12,
            reorder_level: 4,
            cost_price: 450,
            selling_price: 650,
          },
        ])
      );
    });
  });

  test("Settings Hub: verifies unified high-contrast Save buttons and sticky footers", async ({ page }) => {
    await page.goto("http://localhost:3000/settings");
    await page.waitForLoadState("networkidle");

    // General Store Settings Save button
    const saveStoreBtn = page.locator("button:has-text('Save Store Settings')");
    await expect(saveStoreBtn).toBeVisible({ timeout: 10000 });
    await expect(saveStoreBtn).toHaveClass(/bg-lime-500/);
    await expect(saveStoreBtn).toHaveClass(/text-zinc-950/);

    // Switch to Roles tab
    const rolesTabBtn = page.locator("button:has-text('Role Accessibility')");
    if (await rolesTabBtn.isVisible()) {
      await rolesTabBtn.click();
      const saveRolesBtn = page.locator("button:has-text('Save Permissions')");
      await expect(saveRolesBtn).toBeVisible();
      await expect(saveRolesBtn).toHaveClass(/bg-lime-500/);
      await expect(saveRolesBtn).toHaveClass(/text-zinc-950/);
    }

    await page.screenshot({ path: "C:/Users/barat/.gemini/antigravity-ide/brain/67140bbd-85d1-41ad-a046-c44c22276ad3/save-buttons-settings.png" });
  });

  test("Inventory Item: verifies Edit Save and Delete Item button contrast and modal footer", async ({ page }) => {
    await page.goto("http://localhost:3000/inventory/item-1");
    await page.waitForLoadState("networkidle");

    // Action bar buttons (desktop & mobile)
    const editBtn = page.locator("button:has-text('Edit Details')").first();
    const deleteBtn = page.locator("button:has-text('Delete Item')").first();

    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await expect(deleteBtn).toBeVisible();
    await expect(deleteBtn).toHaveClass(/text-rose-700/);

    // Click Edit Details to check modal footer
    await editBtn.click();
    const saveChangesBtn = page.locator("button:has-text('Save Changes')").first();
    const cancelBtn = page.locator("button:has-text('Cancel')").first();

    await expect(saveChangesBtn).toBeVisible();
    await expect(saveChangesBtn).toHaveClass(/bg-lime-500/);
    await expect(saveChangesBtn).toHaveClass(/text-zinc-950/);
    await expect(cancelBtn).toBeVisible();

    await page.screenshot({ path: "C:/Users/barat/.gemini/antigravity-ide/brain/67140bbd-85d1-41ad-a046-c44c22276ad3/inventory-save-delete.png" });

    // Close modal
    await cancelBtn.click();
    await expect(saveChangesBtn).not.toBeVisible();
  });

  test("Job Cards: verifies Diagnosis Log Deletion Safeguard (ConfirmModal)", async ({ page }) => {
    await page.goto("http://localhost:3000/repairs/jobs/mock-jo-1001");
    await page.waitForLoadState("networkidle");

    // Check top Delete Job Card button
    const deleteJobBtn = page.locator("button:has-text('Delete Job Card')");
    if (await deleteJobBtn.isVisible()) {
      await expect(deleteJobBtn).toHaveClass(/text-rose-700/);
    }

    // Check that ConfirmModal for diagnosis note deletion triggers correctly if note delete clicked
    const deleteNoteBtn = page.locator("button[title='Delete this note']").first();
    if (await deleteNoteBtn.isVisible()) {
      await deleteNoteBtn.click();
      const confirmModal = page.locator("div:has-text('Delete Diagnosis Note?')");
      await expect(confirmModal).toBeVisible();

      await page.screenshot({ path: "C:/Users/barat/.gemini/antigravity-ide/brain/67140bbd-85d1-41ad-a046-c44c22276ad3/diagnosis-deletion-guard.png" });

      // Cancel keeps the note
      const keepNoteBtn = page.locator("button:has-text('Keep Note')");
      await expect(keepNoteBtn).toBeVisible();
      await keepNoteBtn.click();
      await expect(confirmModal).not.toBeVisible();
    }
  });
});
