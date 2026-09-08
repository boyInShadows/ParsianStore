import { test, expect, type Page } from "@playwright/test";

/**
 * The header's two overlays must not reopen themselves on a browser FORWARD
 * navigation.
 *
 * The first cut of P14.S6 stored "the route this was opened on" and derived
 * `open = openedOn === pathname`, with nothing but an explicit close ever
 * clearing the stored value. Leaving the route therefore closed the overlay by
 * derivation while the state still said "opened on /faq" -- and coming BACK to
 * /faq made the same derivation true again, so the drawer opened with nobody
 * touching it. Hardware back and edge-swipe forward are ordinary gestures on
 * the phones this whole step is about, so this is a first-session bug, not a
 * corner case.
 *
 * `components/layout/header-overlays.test.ts` pins the state transition. This
 * drives the real thing: real history entries, a real popstate, and the same
 * mounted `Header` throughout -- which the sentinel below proves, because a
 * full page load would remount the component and make the assertions pass for
 * the wrong reason.
 */

const SENTINEL = "__parsianSameDocument";

async function markDocument(page: Page): Promise<void> {
  await page.evaluate((key) => {
    (window as unknown as Record<string, boolean>)[key] = true;
  }, SENTINEL);
}

async function expectSameDocument(page: Page): Promise<void> {
  const survived = await page.evaluate(
    (key) => (window as unknown as Record<string, boolean>)[key] === true,
    SENTINEL,
  );
  expect(survived, "the page reloaded, so Header remounted and this proves nothing").toBe(true);
}

test("the mobile drawer stays closed when history goes back and then forward", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await markDocument(page);

  const drawer = page.getByRole("dialog", { name: "منو" });
  const hamburger = page.getByRole("button", { name: "باز کردن منو" });

  // Get a second history entry in the same document, via a client-side link.
  await hamburger.click();
  await expect(drawer).toBeVisible();
  await page.getByRole("link", { name: "راهنما" }).click();
  await expect(page).toHaveURL(/\/faq$/);
  await expect(drawer).toBeHidden();

  await hamburger.click();
  await expect(drawer).toBeVisible();

  // Back: the route changed, so the drawer must close. This part always worked.
  await page.goBack();
  await expect(page).toHaveURL(/localhost:\d+\/$/);
  await expect(drawer).toBeHidden();

  // Forward: the route returns to the one the drawer was opened on. It must
  // NOT come back with it.
  await page.goForward();
  await expect(page).toHaveURL(/\/faq$/);
  await expectSameDocument(page);
  await expect(drawer).toBeHidden();
});

test("the categories dropdown stays closed when history goes back and then forward", async ({
  page,
}) => {
  // Desktop width -- the dropdown is `md`-and-up only.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await markDocument(page);

  const nav = page.getByRole("navigation", { name: "دسته‌بندی‌ها" });
  const trigger = nav.getByRole("button", { name: "دسته‌بندی‌ها" });
  const firstCategory = nav.getByRole("link").first();

  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const href = await firstCategory.getAttribute("href");
  await firstCategory.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  await page.goBack();
  await expect(page).toHaveURL(/localhost:\d+\/$/);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expectSameDocument(page);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

/**
 * The symptom expander's focus order (P14.S6 review, HIGH 2).
 *
 * The checkbox used to be the FIRST element in the section, before the chip
 * grid, while its visible label sits after it -- so the first Tab into the
 * section landed on a visually-hidden control and painted a focus ring at the
 * bottom of the section, past everything it had skipped. DOM order now matches
 * visual order, which is what this asserts: the six visible chips come first,
 * the toggle last.
 */
test("the symptom expander is the last tab stop in its section, not the first", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const order = await page.evaluate(() => {
    const section = document.querySelector("#symptom-finder");
    if (!section) return null;
    const stops = Array.from(
      section.querySelectorAll<HTMLElement>("a[href], input:not([type=hidden])"),
    );
    return {
      total: stops.length,
      firstIsChip: stops[0]?.tagName === "A",
      lastIsToggle: stops[stops.length - 1]?.id === "symptom-more",
    };
  });

  expect(order).not.toBeNull();
  // Ten chips (four of them display:none on a phone, still in the DOM and in
  // source order) plus the toggle.
  expect(order!.total).toBe(11);
  expect(order!.firstIsChip).toBe(true);
  expect(order!.lastIsToggle).toBe(true);
});

test("the symptom expander still reveals the four hidden chips", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const chips = page.locator("#symptom-finder .symptom-list > li");
  await expect(chips).toHaveCount(10);
  // `:has()` has to reach backwards from the toggle to the list; if it did
  // not, this would be 10 and the toggle would be inert.
  await expect(page.locator("#symptom-finder .symptom-list > li:visible")).toHaveCount(6);

  // The label, not the input: the input is `sr-only`, so a synthetic click on
  // it lands under the sticky header. The label is what a visitor taps anyway.
  await page.locator('#symptom-finder label[for="symptom-more"]').click();
  await expect(page.locator("#symptom-finder .symptom-list > li:visible")).toHaveCount(10);
  await expect(page.locator("#symptom-more")).toBeChecked();
});
