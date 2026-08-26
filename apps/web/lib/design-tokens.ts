/**
 * Reads styles/tokens.css and turns it into structured data for the
 * /admin/design-system foundations tab -- P11.S1,
 * docs/decisions/0027-design-system-consolidation.md.
 *
 * SERVER ONLY. It touches node:fs, so it must never be imported from a
 * Client Component. The design-system page is a Server Component that calls
 * getDesignTokens() and passes the plain result down as props.
 *
 * Parsed, not transcribed, on purpose. The obvious alternative -- typing the
 * palette into a TSX table -- produces a documentation page that silently
 * goes stale the first time a token changes. Here a token that changes in
 * tokens.css changes on this page, and a token that is deleted disappears
 * from it. tokens.css stays the single source of truth (CLAUDE.md rule 5);
 * this file is a reader, never a second definition.
 *
 * Contrast ratios are computed from the real hex values by the WCAG 2.x
 * relative-luminance formula, not copied from the ADRs that originally
 * calculated them -- so this page is an independent check on those numbers
 * rather than a restatement of them.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type TokenValue = {
  name: string;
  light: string;
  dark: string;
  /** True when both themes resolve to the same value -- the ramps, and every
   *  non-color token. Lets the page collapse a redundant second column. */
  shared: boolean;
};

export type TokenGroup = {
  id: string;
  title: string;
  note: string;
  tokens: TokenValue[];
};

export type Ramp = {
  id: string;
  title: string;
  note: string;
  steps: { step: string; hex: string }[];
};

export type ContrastPair = {
  label: string;
  fg: string;
  bg: string;
  light: number | null;
  dark: number | null;
  /** WCAG minimum this pair is held to: 4.5 for body text (1.4.3),
   *  3 for non-text UI and focus indicators (1.4.11). `null` = reported for
   *  information only, with no pass/fail claim attached. */
  min: number | null;
  note: string;
};

export type TypeStep = {
  name: string;
  size: string;
  lineHeight: string;
  letterSpacing: string;
};

export type FontFamily = {
  token: string;
  family: string;
  weights: string;
  role: string;
};

export type DesignTokens = {
  ramps: Ramp[];
  groups: TokenGroup[];
  contrast: ContrastPair[];
  typeScale: TypeStep[];
  fonts: FontFamily[];
};

// tokens.css lives at apps/web/styles/tokens.css and next runs with cwd =
// apps/web, for `next dev`, `next build` and `next start` alike.
const TOKENS_PATH = join(process.cwd(), "styles", "tokens.css");
const TAILWIND_CONFIG_PATH = join(process.cwd(), "tailwind.config.js");

/** Strip block comments first: tokens.css is heavily commented, and several
 *  comments contain literal hex values and colons that would otherwise parse
 *  as declarations. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * `[^}]*` is safe here only because neither block nests braces. The one
 * nested rule in the file -- a `:root` inside `@media (min-width: 1024px)`
 * that widens --container-gutter -- sits *after* the top-level `:root`, so
 * taking the FIRST match keeps us on the real one. Deliberately not a full
 * CSS parser: a dependency for one file we control is not worth it.
 */
function readBlock(css: string, selector: RegExp): Record<string, string> {
  const match = selector.exec(css);
  const body = match?.[1];
  if (body === undefined) return {};

  const declarations: Record<string, string> = {};
  const pattern = /--([\w-]+)\s*:\s*([^;]+);/g;
  let decl: RegExpExecArray | null;
  while ((decl = pattern.exec(body)) !== null) {
    const [, name, value] = decl;
    if (name === undefined || value === undefined) continue;
    declarations[name] = value.trim().replace(/\s+/g, " ");
  }
  return declarations;
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Accepts #rgb and #rrggbb. Returns null for anything else -- shadows,
 *  durations, easings and lengths all flow through the same maps. */
function parseHex(value: string): [number, number, number] | null {
  const hex = value.trim().toLowerCase();
  const expanded = /^#[0-9a-f]{3}$/.test(hex)
    ? `#${hex
        .slice(1)
        .split("")
        .map((char) => char + char)
        .join("")}`
    : hex;

  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(expanded);
  if (!match) return null;
  const [, r, g, b] = match;
  if (r === undefined || g === undefined || b === undefined) return null;
  return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)];
}

/** WCAG 2.x relative luminance. */
function luminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function contrastRatio(foreground: string, background: string): number | null {
  const fg = parseHex(foreground);
  const bg = parseHex(background);
  if (!fg || !bg) return null;
  const first = luminance(fg);
  const second = luminance(bg);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  // Rounded to 2dp so the page reports a stable number rather than a float
  // tail that differs from the ADRs' own quoted ratios by 1e-15.
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

const RAMP_SPECS = [
  {
    id: "steel",
    prefix: "color-steel-",
    title: "فولادی (Steel Blue)",
    note: "هویت، ناوبری، وضعیت سیستم. هرگز برای دکمهٔ خرید.",
  },
  {
    id: "marigold",
    prefix: "color-marigold-",
    title: "همیشه‌بهار (Marigold)",
    note: "فقط پول و کنش خرید. هرگز برای ناوبری یا لینک.",
  },
  {
    id: "graphite",
    prefix: "color-graphite-",
    title: "گرافیت (Graphite)",
    note: "خنثی‌ها با ته‌رنگ سرد؛ زمینهٔ کارگاهی.",
  },
] as const;

const GROUP_SPECS = [
  {
    id: "surfaces",
    title: "زمینه و سطح‌ها",
    note: "چهار پلهٔ ارتفاع. در تم تیره سایه‌ای وجود ندارد و ارتفاع فقط با همین پله‌ها ساخته می‌شود.",
    names: ["bg", "surface", "surface-raised", "surface-sunken"],
  },
  {
    id: "ink",
    title: "متن و خط",
    note: "«border» لبهٔ ظرف است و «rule» خط جداکنندهٔ داخل آن — همیشه یک پله روشن‌تر.",
    names: ["text", "text-muted", "border", "rule"],
  },
  {
    id: "accents",
    title: "دو لهجهٔ رنگی",
    note: "انضباط دو-لهجه‌ای (§۶.۳): فولادی صاحب ناوبری است و همیشه‌بهار صاحب پول.",
    names: ["brand", "brand-solid", "brand-fg", "brand-subtle", "cta", "cta-fg", "price", "focus"],
  },
  {
    id: "status",
    title: "رنگ‌های وضعیت",
    note: "هر رنگ پرشده جفت متنِ کنتراست-امن خودش را دارد؛ سفید روی «موفق» در هیچ تمی قبول نمی‌شود.",
    names: [
      "color-success",
      "color-warning",
      "color-danger",
      "color-info",
      "success-fg",
      "danger-fg",
      "info-fg",
    ],
  },
  {
    id: "radius",
    title: "شعاع گوشه",
    note: "پنج پله. یکسان‌بودن شعاع در همهٔ اجزا خودش یک ایراد طراحی است (ADR 0025).",
    names: ["radius-sm", "radius-md", "radius-lg", "radius-xl", "radius-full"],
  },
  {
    id: "space",
    title: "مقیاس فاصله",
    note: "پایهٔ ۴ پیکسل. tailwind.config.js مقیاس را جایگزین می‌کند، پس پله‌ای بیرون این فهرست اصلاً CSS تولید نمی‌کند.",
    names: [
      "space-1",
      "space-2",
      "space-3",
      "space-4",
      "space-6",
      "space-8",
      "space-12",
      "space-16",
      "space-20",
      "space-24",
      "space-32",
    ],
  },
  {
    id: "shadow",
    title: "سایه",
    note: "در تم تیره هر سه به none می‌رسند — ارتفاع از پله‌های سطح می‌آید، نه از سایه.",
    names: ["shadow-sm", "shadow-md", "shadow-lg"],
  },
  {
    id: "motion",
    title: "حرکت",
    note: "هر انیمیشنی باید prefers-reduced-motion را رعایت کند.",
    names: ["duration-fast", "duration-base", "duration-slow", "ease-out", "ease-in-out"],
  },
  {
    id: "layout",
    title: "چیدمان",
    note: "breakpointها اینجا فقط مرجع‌اند: CSS custom property نمی‌تواند شرط @media را بسازد، پس tailwind.config.js همان اعداد را دستی نگه می‌دارد.",
    names: [
      "container-max",
      "container-gutter",
      "rail-card",
      "breakpoint-sm",
      "breakpoint-md",
      "breakpoint-lg",
      "breakpoint-xl",
      "breakpoint-2xl",
    ],
  },
] as const;

/**
 * Every pair is checked in BOTH themes. `min` encodes which WCAG rule the
 * pair is held to; the informational rows (min: null) are container edges,
 * which 1.4.11 does not govern on their own -- a card is still identifiable
 * without its border, so claiming a 3:1 failure there would be a false
 * finding, and claiming a pass would be meaningless.
 */
const CONTRAST_SPECS: {
  label: string;
  fg: string;
  bg: string;
  min: number | null;
  note: string;
}[] = [
  { label: "متن روی زمینه", fg: "text", bg: "bg", min: 4.5, note: "متن اصلی صفحه" },
  { label: "متن روی سطح", fg: "text", bg: "surface", min: 4.5, note: "متن داخل کارت" },
  {
    label: "متن روی سطح برجسته",
    fg: "text",
    bg: "surface-raised",
    min: 4.5,
    note: "متن داخل سطح برجسته",
  },
  {
    label: "متن روی سطح فرورفته",
    fg: "text",
    bg: "surface-sunken",
    min: 4.5,
    note: "متن روی رسید",
  },
  { label: "متن کم‌رنگ روی سطح", fg: "text-muted", bg: "surface", min: 4.5, note: "متن ثانویه" },
  { label: "متن کم‌رنگ روی زمینه", fg: "text-muted", bg: "bg", min: 4.5, note: "متن ثانویه" },
  { label: "برند روی سطح", fg: "brand", bg: "surface", min: 4.5, note: "لینک داخل کارت" },
  {
    label: "برند روی زمینهٔ ملایم برند",
    fg: "brand",
    bg: "brand-subtle",
    min: 4.5,
    note: "چیپ یا ردیف انتخاب‌شده",
  },
  {
    label: "متن روی برند پرشده",
    fg: "brand-fg",
    bg: "brand-solid",
    min: 4.5,
    note: "دکمهٔ brand",
  },
  { label: "متن روی CTA", fg: "cta-fg", bg: "cta", min: 4.5, note: "دکمهٔ افزودن به سبد" },
  { label: "قیمت روی سطح", fg: "price", bg: "surface", min: 4.5, note: "قیمت داخل کارت" },
  { label: "قیمت روی زمینه", fg: "price", bg: "bg", min: 4.5, note: "قیمت روی زمینهٔ صفحه" },
  {
    label: "متن روی «موفق»",
    fg: "success-fg",
    bg: "color-success",
    min: 4.5,
    note: "چیپ پرشدهٔ موفق",
  },
  {
    label: "متن روی «خطر»",
    fg: "danger-fg",
    bg: "color-danger",
    min: 4.5,
    note: "چیپ پرشدهٔ خطر",
  },
  {
    label: "متن روی «اطلاع»",
    fg: "info-fg",
    bg: "color-info",
    min: 4.5,
    note: "چیپ پرشدهٔ اطلاع",
  },
  {
    label: "حلقهٔ فوکوس روی زمینه",
    fg: "focus",
    bg: "bg",
    min: 3,
    note: "شاخص فوکوس، معیار غیرمتنی ۱.۴.۱۱",
  },
  {
    label: "حلقهٔ فوکوس روی سطح",
    fg: "focus",
    bg: "surface",
    min: 3,
    note: "شاخص فوکوس، معیار غیرمتنی ۱.۴.۱۱",
  },
  {
    label: "لبهٔ ظرف روی سطح",
    fg: "border",
    bg: "surface",
    min: null,
    note: "فقط برای اطلاع — ۱.۴.۱۱ لبهٔ تزئینی ظرف را الزام نمی‌کند",
  },
  {
    label: "خط جداکننده روی سطح",
    fg: "rule",
    bg: "surface",
    min: null,
    note: "فقط برای اطلاع — جداکنندهٔ درون‌سطحی",
  },
];

/**
 * The type scale is the one part of the system that does NOT live in
 * tokens.css: `fontSize` steps carry a line-height and letter-spacing
 * alongside the size, which is a Tailwind-config shape, not a single CSS
 * custom property. Read it from the config itself for the same
 * never-goes-stale reason the colors are read from tokens.css.
 */
function readTypeScale(): TypeStep[] {
  // Read as TEXT, not require()'d, for two reasons. First, `require(<an
  // expression>)` is not statically analyzable, and webpack emits a real
  // "Critical dependency" warning for it. Second, tailwind.config.js
  // require()s its own plugins at module scope, so importing it would drag
  // tailwindcss-logical and @tailwindcss/typography into this route's server
  // bundle to read ten numbers. Same technique as tokens.css above: this
  // file stays a reader, and the config stays the single definition.
  const source = stripComments(readFileSync(TAILWIND_CONFIG_PATH, "utf8"));

  // Narrow to the fontSize block first so the entry pattern below cannot
  // wander into `screens`, `boxShadow`, or any other map of string values.
  const block = /fontSize:\s*\{([\s\S]*?)\n\s{6}\},/.exec(source)?.[1];
  if (block === undefined) return [];

  // Each entry is `key: ["<size>", { ...meta }]`, the key optionally quoted
  // and the array optionally spread over several lines.
  const entry = /["']?([\w-]+)["']?\s*:\s*\[\s*["']([^"']+)["']\s*,\s*\{([^}]*)\}/g;
  const steps: TypeStep[] = [];
  let match: RegExpExecArray | null;
  while ((match = entry.exec(block)) !== null) {
    const [, name, size, meta] = match;
    if (name === undefined || size === undefined || meta === undefined) continue;
    steps.push({
      name,
      size,
      lineHeight: /lineHeight:\s*["']([^"']+)["']/.exec(meta)?.[1] ?? "—",
      // Only display-1, caption and data set one; the rest inherit normal.
      letterSpacing: /letterSpacing:\s*["']([^"']+)["']/.exec(meta)?.[1] ?? "normal",
    });
  }
  return steps;
}

/**
 * Self-hosted via next/font/local (lib/fonts.ts) -- no CDN, WOFF2 only,
 * subset to Basic Latin + Arabic. Described here rather than derived
 * because the loader's return value is a hashed class name at build time,
 * not a readable family name.
 */
const FONTS: FontFamily[] = [
  {
    token: "--font-display",
    family: "Estedad",
    weights: "700 · 900",
    role: "تیترهای نمایشی و سرتیترها",
  },
  {
    token: "--font-body",
    family: "Vazirmatn Variable",
    weights: "100–900",
    role: "متن اصلی و رابط کاربری",
  },
  {
    token: "--font-mono",
    family: "JetBrains Mono",
    weights: "500",
    role: "کد قطعه، شمارهٔ سفارش، ارقام مرجع",
  },
];

export function getDesignTokens(): DesignTokens {
  const css = stripComments(readFileSync(TOKENS_PATH, "utf8"));
  const light = readBlock(css, /:root\s*\{([^}]*)\}/);
  const darkOverrides = readBlock(css, /\[data-theme="dark"\]\s*\{([^}]*)\}/);
  // The dark block only lists what it changes, so it layers over light --
  // exactly how the cascade resolves it in the browser.
  const dark = { ...light, ...darkOverrides };

  const toToken = (name: string): TokenValue => ({
    name,
    light: light[name] ?? "—",
    dark: dark[name] ?? "—",
    shared: (light[name] ?? "—") === (dark[name] ?? "—"),
  });

  const ramps: Ramp[] = RAMP_SPECS.map((spec) => ({
    id: spec.id,
    title: spec.title,
    note: spec.note,
    // entries(), not keys() -- indexing back into the map would reintroduce
    // a `string | undefined` the tuple already rules out.
    steps: Object.entries(light)
      .filter(([name]) => name.startsWith(spec.prefix))
      .map(([name, hex]) => ({ step: name.slice(spec.prefix.length), hex }))
      .sort((a, b) => Number(a.step) - Number(b.step)),
  }));

  const groups: TokenGroup[] = GROUP_SPECS.map((spec) => ({
    id: spec.id,
    title: spec.title,
    note: spec.note,
    tokens: spec.names.map(toToken),
  }));

  const contrast: ContrastPair[] = CONTRAST_SPECS.map((spec) => ({
    label: spec.label,
    fg: spec.fg,
    bg: spec.bg,
    min: spec.min,
    note: spec.note,
    light: contrastRatio(light[spec.fg] ?? "", light[spec.bg] ?? ""),
    dark: contrastRatio(dark[spec.fg] ?? "", dark[spec.bg] ?? ""),
  }));

  return { ramps, groups, contrast, typeScale: readTypeScale(), fonts: FONTS };
}
