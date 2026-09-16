import { test, expect, type Page } from "@playwright/test";
import { contrastRatio } from "../apps/web/lib/design-tokens";

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

/**
 * The theme toggle's glyph must carry the control, not its ring (P13.S11,
 * fixed at P14.S2).
 *
 * The old bug: the toggle painted page tokens inside a header that was
 * `bg-graphite-950` in BOTH themes, so in light mode it was a 12.25:1 ring
 * around a 3.38:1 glyph -- an empty-looking circle, because the outline was
 * the only thing with real contrast. Nothing in the suite touched this
 * control at all before this block.
 *
 * `next-themes` owns `data-theme` and reverts anything set on it by hand
 * after load, so the theme has to be seeded via `localStorage` in an
 * `addInitScript` BEFORE navigation (mirrors `e2e/landing.spec.ts`'s
 * `openLanding`) -- setting the attribute directly measures the same theme
 * twice and silently reports it as two different results.
 */
async function openWithTheme(page: Page, theme: "light" | "dark"): Promise<void> {
  await page.addInitScript((value) => window.localStorage.setItem("theme", value), theme);
  await page.emulateMedia({ colorScheme: theme });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await page.locator("#hero").waitFor();
}

/**
 * Resolves computed colours to `#rrggbb`, compositing translucent colours
 * (the header's `--surface-translucent` is `#ffffffe0` / `#1a222ae0`, alpha
 * ~0.88) over the page's own background -- the header is the first thing in
 * flow at scroll position zero, so that background IS what shows through it.
 * Returning hex lets the assertion reuse `contrastRatio`
 * (lib/design-tokens.ts), the one WCAG relative-luminance formula in this
 * repo, instead of a second copy living in a test file.
 */
function resolveHeaderContrastColours(): { headerHex: string; glyphHex: string } {
  function toRgba(value: string): [number, number, number, number] {
    const parts = value
      .replace(/rgba?\(|\)/g, "")
      .split(",")
      .map((part) => parseFloat(part));
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts.length > 3 ? (parts[3] ?? 1) : 1];
  }
  function toHex([r, g, b]: [number, number, number]): string {
    const channel = (value: number) => Math.round(value).toString(16).padStart(2, "0");
    return `#${channel(r)}${channel(g)}${channel(b)}`;
  }
  function composite(fg: [number, number, number, number], bg: [number, number, number]) {
    const [fr, fgc, fb, fa] = fg;
    const [br, bgc, bb] = bg;
    return [fr * fa + br * (1 - fa), fgc * fa + bgc * (1 - fa), fb * fa + bb * (1 - fa)] as [
      number,
      number,
      number,
    ];
  }

  const header = document.querySelector("header");
  const toggle = header?.querySelector("button[aria-pressed]");
  if (!header || !toggle) throw new Error("header or theme toggle not found");

  const headerBg = toRgba(getComputedStyle(header).backgroundColor);
  const pageBg = toRgba(getComputedStyle(document.body).backgroundColor);
  const glyph = toRgba(getComputedStyle(toggle).color);

  return {
    headerHex: toHex(composite(headerBg, [pageBg[0], pageBg[1], pageBg[2]])),
    // `text-text` (the glyph colour) is a solid token with no alpha, so its
    // computed style already IS the rendered colour -- nothing to composite.
    glyphHex: toHex([glyph[0], glyph[1], glyph[2]]),
  };
}

test.describe("theme toggle contrast and naming (P14.S2)", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`names the feature, reports state via aria-pressed, and clears 3:1 against the header in ${theme} mode`, async ({
      page,
    }) => {
      await openWithTheme(page, theme);

      // Scoped to the real <header>, not the mobile drawer's copy of the same
      // control (Header.tsx renders ThemeToggle twice) -- the drawer sits on
      // its own surface, not the one this guard is about.
      const toggle = page.locator("header").getByRole("button", { name: "حالت تیره" });
      await expect(toggle).toHaveCount(1);

      // The name is the feature ("dark theme"), never the next action. A name
      // that flipped to "switch to light theme" while aria-pressed stayed true
      // is the documented anti-pattern this control already shipped once --
      // asserting the literal Persian string, not just "a name exists", is
      // what would catch that regression coming back.
      await expect(toggle).toHaveAccessibleName("حالت تیره");
      await expect(toggle).toHaveAttribute("aria-pressed", theme === "dark" ? "true" : "false");

      // The icon must not be able to contribute to the name computed above.
      await expect(toggle.locator("svg")).toHaveAttribute("aria-hidden", "true");

      const { headerHex, glyphHex } = await page.evaluate(resolveHeaderContrastColours);
      const ratio = contrastRatio(glyphHex, headerHex);
      // WCAG 1.4.11 (non-text contrast) floor for a UI control against its
      // background. This is the assertion the P14.S2 fix earns: before it, the
      // glyph measured 3.38:1 against a graphite-950 header in light mode --
      // under the floor -- while the ring around it read at 12.25:1 and made
      // the button LOOK fine in a cursory check.
      //
      // The ring itself is deliberately low-contrast (a hairline border, not
      // the control) and is NOT asserted here on purpose: it is decoration,
      // and a future reader who "fixes" it to be more visible would be
      // undoing the P14.S2 read -- the glyph is what has to carry the button.
      expect(ratio, `${theme}: glyph ${glyphHex} vs header ${headerHex}`).not.toBeNull();
      expect(
        ratio ?? 0,
        `${theme}: glyph ${glyphHex} vs header ${headerHex}`,
      ).toBeGreaterThanOrEqual(3);
    });
  }
});
