import { test, expect } from "@playwright/test";

test("debug page renders and reaches the API", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ParsianStore" })).toBeVisible();
  await expect(page.getByText(/API status: up/)).toBeVisible();
});
