import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("opens the bundled Form 1040 and exposes all workspace modes", async ({
  page,
}) => {
  await expect(page.getByText("Form Studio", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Annotate" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText("2025 Form 1040")).toBeVisible();

  await page.getByRole("button", { name: "Data" }).click();
  await expect(page.getByRole("heading", { name: "Taxpayer data" })).toBeVisible();
  await expect(page.getByText("/income/w2s/0/wages")).toBeVisible();

  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByRole("button", { name: "Preview" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("edits a binding and exports template JSON", async ({ page }) => {
  await page.getByText("Wages, salaries, tips").first().click();
  const pointer = page.getByLabel("JSON Pointer");
  await pointer.fill("/income/interest");
  await expect(pointer).toHaveValue("/income/interest");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON" }).click();
  await expect((await download).suggestedFilename()).toContain("template.json");
});
