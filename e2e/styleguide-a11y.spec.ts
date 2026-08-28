import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// P1.S7 DoD: "Every primitive on a /styleguide page; axe: 0 violations."
test("styleguide page has zero axe violations", async ({ page }) => {
  await page.goto("/styleguide");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("styleguide page has zero axe violations with a modal open", async ({ page }) => {
  await page.goto("/styleguide");
  await page.getByRole("button", { name: "باز کردن پنجره" }).click();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

// Dark mode was never audited here, and it hid two real contrast failures
// that shipped in Badge: white on `success` (3.30:1 light / 2.27:1 dark) and
// white on `danger` in dark (3.38:1). Both are fixed via --success-fg /
// --danger-fg; this test is what stops them coming back.
test("styleguide page has zero axe violations in dark mode", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("theme", "dark"));
  await page.goto("/styleguide");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

// masterPlan §10's accessibility floor: ">= 44x44px touch targets". This
// caught three real violations the class names alone did not reveal --
// Pagination's buttons said w-12 but flex-shrink squeezed them to 41px, and
// Chip's remove button was 16x16.
test("every styleguide control meets the 44px touch-target floor", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto("/styleguide");
  await page.waitForLoadState("networkidle");

  // Scoped to <main>: Next.js's dev overlay injects its own small buttons.
  const controls = await page.locator("main").getByRole("button").all();
  const undersized: string[] = [];
  for (const control of controls) {
    if (!(await control.isVisible())) continue;
    const box = await control.boundingBox();
    if (!box) continue;
    if (box.height < 44 || box.width < 44) {
      undersized.push(`"${(await control.textContent())?.trim()}" ${box.width}x${box.height}`);
    }
  }
  expect(undersized).toEqual([]);
});

// ---------------------------------------------------------------------------
// P11.S3 — the form primitives. axe covers the static shape; these cover the
// behaviour it cannot see.
// ---------------------------------------------------------------------------

test("the switch is a real switch, and Space toggles it", async ({ page }) => {
  await page.goto("/styleguide");
  const smsToggle = page.getByRole("switch", { name: "اطلاع‌رسانی پیامکی" });

  // role="switch", not a checkbox and not a div: a screen reader announces
  // "on/off" rather than "checked", which is what a settings toggle means.
  //
  // Asserted through the accessibility tree, not a DOM attribute. The state
  // comes from the underlying checkbox being checked, which the browser maps
  // to aria-checked itself -- writing that attribute by hand would mean
  // keeping it in sync in JS, which is exactly the work using a real checkbox
  // avoids.
  await expect(smsToggle).toBeChecked();
  await smsToggle.focus();
  await page.keyboard.press("Space");
  await expect(smsToggle).not.toBeChecked();
});

test("the switch's helper text is announced with it", async ({ page }) => {
  await page.goto("/styleguide");
  const smsToggle = page.getByRole("switch", { name: "اطلاع‌رسانی پیامکی" });
  const describedBy = await smsToggle.getAttribute("aria-describedby");
  expect(describedBy).toBeTruthy();
  await expect(page.locator(`#${describedBy}`)).toHaveText(/پیامک دریافت کنید/);
});

// The whole reason RadioGroup exists: a bare stack of radios announces the
// option but never what is being chosen.
test("a radio group announces its legend, and arrows move within it", async ({ page }) => {
  await page.goto("/styleguide");
  const group = page.getByRole("group", { name: /روش ارسال/ });
  await expect(group).toBeVisible();

  const courier = page.getByRole("radio", { name: "پیک درون‌شهری" });
  await courier.focus();
  await expect(courier).toBeChecked();

  // Native roving tabindex: one tab stop for the group, arrows to move and
  // select inside it. RadioGroup writes no keyboard code — this is the test
  // that says so honestly.
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: "پست پیشتاز" })).toBeChecked();
  await expect(courier).not.toBeChecked();
});

test("a radio group in an error state points at its message", async ({ page }) => {
  await page.goto("/styleguide");
  const group = page.getByRole("group", { name: /نوع ضمانت/ });
  await expect(group).toHaveAttribute("aria-invalid", "true");
  const describedBy = await group.getAttribute("aria-describedby");
  await expect(page.locator(`#${describedBy}`)).toHaveText(/یک گزینه را انتخاب کنید/);
});

test("the search field clears, keeps focus, and hides its clear button again", async ({ page }) => {
  await page.goto("/styleguide");
  const search = page.getByRole("searchbox", { name: /جستجوی قطعه با کد فنی/ });
  const clear = page.getByRole("button", { name: "پاک کردن جستجو" });

  // Nothing to clear yet, so no button to tab past.
  await expect(clear).toBeHidden();

  await search.fill("0K9A03328Z");
  await expect(clear).toBeVisible();
  await clear.click();

  await expect(search).toHaveValue("");
  await expect(clear).toBeHidden();
  // Focus returns to the field: clearing a search is nearly always followed
  // by typing another one.
  await expect(search).toBeFocused();
});

test("a loading button is disabled and marked busy", async ({ page }) => {
  await page.goto("/styleguide");
  const submit = page.getByRole("button", { name: /در حال ثبت سفارش/ });
  await expect(submit).toBeDisabled();
  await expect(submit).toHaveAttribute("aria-busy", "true");
});

// The spinner inside a busy button must not announce its own status -- the
// button already does, and two live regions for one event is one too many.
test("a busy button announces once, not twice", async ({ page }) => {
  await page.goto("/styleguide");
  const submit = page.getByRole("button", { name: /در حال ثبت سفارش/ });
  await expect(submit.getByRole("status")).toHaveCount(0);
});

test("the modal's close button is labelled in Persian", async ({ page }) => {
  await page.goto("/styleguide");
  await page.getByRole("button", { name: "باز کردن پنجره" }).click();
  // Was `aria-label="Close"` -- one English word inside an otherwise Persian
  // dialog, which is what a screen reader user actually heard.
  await expect(page.getByRole("button", { name: "بستن پنجره" })).toBeVisible();
});

// masterPlan §10 floors touch targets at 44px, and the switch reads visually
// as a 48x24 track. The control itself is 48x48 with the track drawn inside
// it, which is the only version that actually works: the first attempt kept a
// small control and tried to overhang its hit region with a transparent
// pseudo-element, and clicking 8px above the track toggled nothing.
test("the switch itself meets the 44px touch-target floor", async ({ page }) => {
  await page.goto("/styleguide");
  const wholesale = page.getByRole("switch", { name: "نمایش قیمت عمده" });

  // Scrolled into view first: boundingBox() reports viewport coordinates, and
  // this card sits well down a long page -- clicking at an off-screen y hits
  // nothing and reads exactly like a broken hit area.
  await wholesale.scrollIntoViewIfNeeded();
  const box = await wholesale.boundingBox();
  if (!box) throw new Error("switch has no bounding box");
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);

  // And the whole box is live, not just the middle of the visible track.
  await expect(wholesale).not.toBeChecked();
  await page.mouse.click(box.x + 4, box.y + 4);
  await expect(wholesale).toBeChecked();
});
