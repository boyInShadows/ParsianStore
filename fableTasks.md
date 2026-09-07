# fableTasks.md — Phase 14: mobile-first landing, typography reset, real light mode, hero pacing

**Repo:** `parsian-store` · branch `development` · `apps/web` · landing route only (other pages come in a later phase — owner's instruction)
**Audit date:** 2026-09-07 · live at `http://localhost:3000/`, desktop 1382×847, dark + light, Chrome
**Author:** Fable · **Executor:** Claude CLI agent · **Owner:** Kasra
**Input read:** owner's chat brief (this session) + the CLI agent's summary of `docs/fable-next-phase-brief.md` §2 (what the last audit got wrong) and its invisible-rules list.

---

## 0. Method — read before the tasks

The last audit was partly wrong because I read a rendered page without repo history. I accept the corrections in the brief and this file changes method accordingly:

- Every finding is tagged **[V]** (verified in the browser this session — the proof is named) or **[I]** (inferred — plausible, unproven; the agent verifies before acting and may close it as "not a bug" with a one-line reason).
- **Nothing here invents an artefact.** No new endpoints, flags, slugs or scripts are asserted to exist. Where I want one, it says "add" or "if absent".
- Corrections from the brief that this file honours: the «۳۲ قطعه» counts are real and stay; the empty `alt` on decorative sprites is correct; WCAG 2.2 AA target minimum is 24×24 (this file asks for 44px on *primary mobile* controls as a product choice, not as a compliance claim); the brand wall is a marquee; the truncated SKU is CSS with the full value in the DOM.
- Rules I now assume: Tailwind spacing scale is replaced (never use a bare numeric spacing utility that isn't in the project scale — check `tailwind.config` before writing `gap-5`/`p-11`); physical CSS directions are banned (logical only); hero has **ten** parts, every sprite docks natively at 0,0; `tokens.css` is the sole hex source; JS budget for `/` is at 197KB gz (owner-accepted overage; **do not grow it**); no 3D/GSAP libs; do not touch port 3000 ownership or `.next` under a live server.
- **Mobile was not screenshot-verified.** Chrome's window in this session was maximized and the extension cannot un-maximize it; the owner opened a second small window but the extension can only drive its own tab group. So every mobile item is **[I]** unless it comes from the responsive class list I did read from the DOM. Task S0 makes the agent produce the mobile evidence *before* mobile work starts. Since the owner says most users are on phones, S0 is not optional.

---

## 0.5 CTO amendments — 2026-09-07, after verification

This plan was written from a browser session. Before any of it was built, every
claim was checked against the source and against fresh instrumented evidence
(`docs/shots/p14/`, 85 screenshots, Lighthouse ×5, live `getBoundingClientRect`
reads). **Where this section and §1 disagree, this section wins.**

### Renumbered: this is Phase 14, not Phase 12

Phase 12 **closed 2026-09-05** (`tasks.md`) and Phase 13 is the active phase.
Every `[P12.Sn]` tag collided with commits that already exist, and commitlint
would have accepted them silently. All ten step tags are now `P14.Sn`. The
screenshot harness this plan calls "Phase 11 S0" is **P13.S0** (`pnpm
shots:hero`, `scripts/hero-shots.mjs`).

### Owner decisions

- **Finale holds exploded (S5.3): APPROVED.** This reverses "Gate B", which
  `heroLayout.ts:632` documents and which **three** assertions pin
  (`e2e/landing-hero.spec.ts:515`, `:534`, `:786`). Those assertions are to be
  **rewritten to assert the new ending**, never deleted. Record the reversal in
  `tasks.md` so it is not re-litigated.
- **Type tokens (S1): OPEN.** `display-1` / `h1` / `h2` are *shared* — cart,
  checkout and `PageHeader` all render `text-h1 font-black`. Retuning them for
  Persian metrics retypesets the whole storefront. Awaiting the owner's call
  between one shared scale (recommended) and a landing-only fork.

### Claims that did not survive verification — do not build these

| Claim | Finding |
|---|---|
| V1/V11 car pushed below the fold on mobile | **Refuted at 390×844.** Car sits y546–663, fully visible. What is below the fold is the **job card** (y888–1020). S3's mobile target changes accordingly. The desktop (1440) fold has not been re-measured — do that before S3. |
| V2 "plate renders top-start regardless of the part" | **Half wrong.** The plate alternates top/bottom by `data-band` on purpose — a part that lifted gets a low caption. Only the *leader line* is genuinely absent, and `PartCallout.tsx:24-48` documents why it was removed: a plate in canvas space is magnified 35% by chapter 1's 1.35 push-in and rendered clipped in half. **Re-add the anchor dot and leader; keep the plate in its fixed slot.** |
| V7 light-mode section list | **Wrong in both directions.** `#authenticity` is *already* light (`rgb(238,241,244)`) — do not "fix" it. `#trust-strip` **is** dark and is missing from the plan's list. Verified dark: header, `#hero`, `#find-my-part`, `#trust-strip`, `#interstitial`, `#closing`. |
| V12 "contact links are 24px" | **Stale.** Fixed at P13.S11 to `py-2` (38px). The 22px reading predates that. |
| V13 "section 05 is missing" | **Refuted.** `fa.json` carries `01`–`09` contiguous, `05` = shop-by-vehicle. TrustStrip and Deals deliberately carry no `code`. Not reproducible; a section may have been absent in the audit session (a dead Postgres container silently removes `#shop-by-vehicle`). |
| S9 "counter must say ten" | **Wrong.** Nine rows is correct and pinned (`e2e/landing-hero.spec.ts:752`). The windshield has a callout but no row because the catalogue has no glass route (`manifestData.ts:92`). |
| S9 "note it in `docs/deferred.md`" | **That file does not exist** and was previously flagged as an invented artefact. Deferrals go in `tasks.md`. |

### Confirmed, with the measurements

- **V3 blank slot: real.** Reproduced at p≈0.70–0.76 *and* at p≈0.02–0.11.
  Cause is not a running index — the list was ordered by sprite paint order
  while rows tick in scene order. **FIXED** (rows now sort on `checkInAt`;
  five regression tests, including a p=0→1 sweep asserting the checked set is
  always a prefix of the list).
- **Dead selector, not in the plan: the mobile job card never auto-scrolled.**
  `ManifestCheckIn` guarded scroll-into-view on a class `manifest-chip` that no
  element carries — dead since the P13.S7 merge. **FIXED** (the guard now reads
  the layout off `overflow-x` instead of a hand-synced class).
- **Horizontal overflow at 390, not in the plan.** `scrollWidth` 395 vs 390;
  the vehicle-selector box `#driver-path` (`FindMyPart.tsx:60`) renders 378px
  wide at `left:-5`. Clean at 412 and 1440. **→ S6.**
- **The finale collides on mobile (I4 confirmed).** At 390 the bumper overlaps
  headlight-left by ~11px and headlight-right by ~5px. No `finaleMobile`
  parking table exists. **→ S5.4.**
- **V6 typography: exact.** `display-1` = `clamp(2.5rem,6vw,3.5rem)`,
  `lineHeight 1.1`, `letterSpacing -0.02em` (= −1.12px at 56px), weight 900
  everywhere. The 700 face *is* loaded but used by nothing — dead weight.
- **V9 marquee: confirmed.** 15 real nodes plus **one wrapper** holding the
  duplicate — that asymmetry is the seam.
- **V10 header: confirmed exactly.** At 390 the visible controls are theme,
  account, cart, wordmark, hamburger. Search and the vehicle chip are hidden.

### The number that reorders the plan

| Metric | Median of 5 | Gate |
|---|---|---|
| **TBT** | **474 ms** | ≤200 ms |
| Performance | 0.87 | ≥0.90 |
| Route JS `/` | 197 KB | ≤193 KB |
| LCP | 1.64 s | ≤2.0 s ✓ |
| CLS | 0 | ≤0.05 ✓ |

TBT was last documented at 261ms. It now measures **474ms** — 2.4× the budget —
on a busy dev box, so directional but not flattering. **A TBT attribution pass
runs before S4**, not after S9. S4 (spring, tour mode, idle loop) and S7
(enter-on-view reveals) both add client JS to a route already failing two
budgets; we find and recover the cost first, then spend it deliberately.

### Method note for every agent working from screenshots

**Playwright `fullPage: true` is unreliable on this page.** It renders a
phantom ~75px band above the header that does not exist in a real viewport and
is absent from `getBoundingClientRect`. Judge the fold from a plain viewport
screenshot or from live DOM reads — never from `full-page.png`.

---

## 1. What I saw this time (state of the landing after Phase 13)

The hero is now a real scene. [V] Camera push-in on station 1, headlight bloom, callout plate with «مشاهده» link, job card ticking «۳ از ۹», hood hinge + engine trio, door swing, exploded finale with all parts parked around the body and the marigold «مشاهده همه دسته‌بندی‌ها», prev/next station buttons («قدم قبلی / قدم بعدی»), `hero-sweep` runs once on load. That is a genuinely distinctive landing for a parts store. Everything below is about **pacing, framing, type, theme, mobile, and voice** — not about rebuilding it.

### 1.1 Verified findings [V]

| # | Finding | Proof |
|---|---|---|
| V1 | **Header→car gap.** At scrollY=0 on 1382×847 the stage top is below the fold: headline (56px H1, 2 lines) + subline + the paragraph «این خودرو از همان قطعه‌هایی…» + the job-card header all stack *above* the sticky stage, so the first thing a visitor sees is text and only the car roof. | Screenshot at y=0 and y=300: car roof enters at ~y=630 of 847. |
| V2 | **Callouts float free.** The plate for the active part is rendered at the top-start corner of the stage regardless of where the part is (piston plate top-start while the piston sits bottom-centre; door plate top-start while the door is end-side). No leader line, no anchor dot. | Screenshots y=1500 and y=1900. |
| V3 | **Job-card row gap glitch.** At y≈1900 (door detached, fender not yet) the list shows rows 1–7, then an *empty slot*, then «درب خودرو». Untriggered rows keep their height but are invisible only when a later row has ticked. | Screenshot y=1900. |
| V4 | **Scene ends with the intact car.** When the track un-pins, the frame visible while scrolling into «حالا قطعه‌تان را پیدا کنید» is the *docked* car, not the exploded catalog. The finale state does not persist past un-pin. | Screenshot y=2700 (intact front end scrolling away). [I] whether it re-docks at p=1 or at un-pin — check the transform graph. |
| V5 | **Scroll pacing.** Pinned distance on desktop ≈ track (3265px) − viewport (847) ≈ 2400px for 4 beats → a standard 100px wheel tick moves ≈4% of the story; ~24 ticks for the whole scene; a trackpad flick skips a station. Owner: "really fast". | `#hero` offsetHeight 3265; track class `min-h-[calc(100vh+72rem)] lg:min-h-[calc(100vh+120rem)]`. |
| V6 | **Typography — the font the owner loves is `bodyFont`, not `displayFont`.** «فهرست قطعه‌ها» computes to `bodyFont` 16px/700, `letter-spacing: normal`. Every heading he dislikes is `displayFont` 900 (H1: 56px, line-height 61.6px = **1.10**, letter-spacing **−1.12px**). Negative tracking and 1.1 leading are Latin display habits; on a Persian face they crush the dots/kashida rhythm and clip ascenders at 900 weight. `displayFont 700` is declared but **unloaded** (never used). | `getComputedStyle` on H1 and that H2; `document.fonts` status list. |
| V7 | **No light mode in practice.** With `data-theme="light"`: `body` bg = `rgb(238,241,244)` ✔, but `header` bg = `rgb(14,20,24)`, `#hero` bg = `rgb(14,20,24)`, `#find-my-part`, `#authenticity`, `#closing`, `#interstitial` all render dark. Only trust-strip, best-sellers, shop-by-vehicle, symptom-finder, brand-wall and footer switch. Theme-toggle icon renders as an empty ring in light mode. | Computed backgrounds in light theme; screenshots of hero/find-my-part/authenticity/footer in light. |
| V8 | **No enter-on-view motion anywhere.** Zero elements are in a pre-reveal state (`opacity:0`/`data-reveal`/`whileInView`) below the hero. Sections simply exist. Brand marquee `30s linear infinite` runs from page load whether or not it is on screen. | DOM query for reveal states = 0; `document.getAnimations()` shows `marquee` running while at y=0. |
| V9 | **Marquee loop seam.** Track = 15 brand items + one clone element containing all 15 as a single string (`trackW` 5343 vs parent 1335). Clone is a *single node* while the originals are 15 nodes, so gap/separator rhythm differs at the seam and the `◆` separator is glued to the following word («◆والئو»). Owner sees it as "not infinite". | `.motion-marquee-track` children dump. |
| V10 | **Mobile header hides search.** `FORM hidden md:flex` (search) and `BUTTON hidden sm:inline-flex` (vehicle chip). Below `md` the header is: menu button, logo, account, cart. For a parts store, search + "my car" are the two most-used mobile actions. | Header class dump. |
| V11 | **Mobile hero stacks text above a `sticky top-24` stage** (`DIV sticky top-24 lg:grid-cols-[…]`): the same V1 gap problem, worse on a 390×844 screen — headline + subline + paragraph + job-card header before the car. Track on mobile is `100vh+72rem`. | Hero responsive class dump. (Layout consequence is [I] until S0 shots.) |
| V12 | Footer is `grid-cols-2 sm:grid-cols-5`; the «برندهای قطعه» column has 16 links, so on mobile a 2-column grid becomes one very tall column next to short ones. Contact links (phone, Telegram) are 24px tall. Placeholder اینماد/نشان ملی boxes are still visible. | Footer class dump; bounding boxes; screenshot. |
| V13 | Section numbering now 01,02,03,04,06,07,08,09 — **05 is missing** (shop-by-vehicle lost its number). | Section text dump. |
| V14 | Voice. Current copy is correct and clean but *institutional*: «مخصوص سایپا و ایران‌خودرو. قطعه اصلی، اصالت‌سنجی‌شده و با ارسال سریع.», «هر کالا یک شناسه اصالت دارد…». Nothing on the page sounds like a person who knows cars talking to a person who owns one. | Read every string on `/`. |

### 1.2 Inferred [I] — verify first

- I1 The callout position is a fixed slot (not computed from `anchor`) — likely the `PartCallout` reads `labelSide` but not the anchor for the leader.
- I2 Row visibility in the job card is driven by `activePart` index ≥ row index rather than by each part's own `detachAt`, which would explain V3.
- I3 Un-pin re-dock (V4) is the trailing keyframe of the chapter transform graph, not a separate "finale hold".
- I4 On phones the finale's 10 parked parts + chips will not fit an `aspect-[16/11]` stage at 390px; the parking layout needs a mobile variant.
- I5 iOS Safari: `sticky top-24` inside a track with `overflow-x-clip` on the section is fine, but any ancestor with `overflow:hidden` on the *y* axis kills sticky — check the section wrapper.
- I6 Best-sellers still shows repeated names ( «گریس یاتاقان» ×4, «ضدیخ رادیاتور» ×4 ) — I saw this last time; if the data source is still the seed, the section should be flagged off on `/` until real featured products exist (a *product* call, not a bug report).

---

## 2. Tasks

Every task has **Files / Do / Accept**. Shipping order is in §3. Nothing here adds a dependency.

### P14.S0 — Evidence first: mobile scrub sheet (blocking)

**Do:** Extend the existing hero screenshot script (P13.S0 — reuse, don't rewrite): viewports **390×844** (iPhone-class) and **412×915** (Android-class) plus 1440×900; `p ∈ {0, .05, .12, .2, .28, .38, .46, .55, .66, .74, .82, .9, 1.0}`; both themes; plus full-page shots of `/` and 1× screenshot of the open mobile menu. Also run Lighthouse **mobile** (throttled) on `/` and save the JSON. Commit under `docs/shots/p12/`.
**Accept:** Contact sheets exist before any S4/S5/S6 commit. Each [I] in §1.2 gets a one-line verdict in the PR description ("I1 confirmed / I5 not an issue because …").

### P14.S1 — Typography reset: one family, Persian metrics

**Files:** `tokens.css`, `tailwind.config` (font tokens + type scale), root layout font loader, every `font-display` usage on the landing.
**Do:**
1. Make the family the owner loves the *only* text family: `--font-display` → alias of `--font-body` (keep the token name so nothing breaks; `displayFont` files can be dropped from the loader — that removes one 900-weight woff2 from the critical path). Headings use the variable body face at **700** (H2/H3) and **800** (H1 only). Never 900.
2. Type scale (mobile → desktop, `clamp()` in tokens):
   `display-1` H1: 30px → 48px, **line-height 1.3**, letter-spacing **0**;
   `h2`: 22px → 32px, lh 1.35; `h3`: 18px → 22px, lh 1.4; `body-lg` 17px → 18px, lh 1.75; `body` 15px → 16px, lh 1.75; `body-sm` 14px, lh 1.6; `caption` 12px → 13px, lh 1.5; `data` (mono) 12px → 13px.
   Persian needs 1.3+ on display sizes and ≥1.7 on body — the current 1.10/1.35 is the single biggest reason the headings "look wrong".
3. **Kill all negative tracking** on Persian text (`tracking-tight` etc.). Tracking is allowed only on the Latin/mono spans (codes, SKUs) and only ≥ 0.
4. Codes: every `SYS-xx`, SKU and Latin brand string sits in `<span dir="ltr" class="font-mono">` with `unicode-bidi: isolate` and `margin-inline: .35em` (rule already in the design system? if not, add `.code` utility to tokens layer).
5. Digits policy, enforced: Persian digits for quantities, prices, years and counters inside Persian sentences (`Intl.NumberFormat('fa-IR')`); Latin digits only inside codes/SKUs. Add a unit test that scans `messages/fa.json` for `[0-9]` outside code-typed keys.
6. `text-wrap: balance` on H1/H2; `text-wrap: pretty` on body paragraphs (Chrome ≥117; harmless elsewhere).
**Accept:** Shots of H1 (both viewports) show no clipped dots/ascenders, no tight tracking; `document.fonts` lists only one text family + mono; visual diff of `/` reviewed by the owner (he is the judge of "the font I love" — post the before/after of «فهرست قطعه‌ها» vs the new H1 side by side).

### P14.S2 — Real light mode

**Files:** `tokens.css` (semantic tokens), header, `#hero`, `#find-my-part`, `#authenticity`, `#interstitial`, `#closing`, theme toggle.
**Do:**
1. Audit every `bg-graphite-950/900/…` and `text-graphite-…` literal on the landing and replace with **semantic** tokens (`bg-surface`, `bg-surface-sunken`, `bg-surface-raised`, `text-text`, `text-text-muted`, `border-border`) that flip with `[data-theme]`. Add an ESLint rule (or extend `no-raw-hex`) that forbids `graphite-*` colour utilities outside `tokens.css` and the hero stage.
2. **The hero stage stays dark in both themes** — it is a lit workshop, and the sprites were rendered for a dark ground. But it becomes a *framed stage* in light mode: the section background follows the theme (light), the stage box keeps `graphite-950` with a 1px `border-border` and radius, and the headline/job card outside the stage use theme text tokens. Verify the marigold/steel-blue accents pass 4.5:1 on the light surface (`--color-marigold-600`/`--color-steel-700` variants exist? if not, add them in tokens).
3. Header follows the theme (light surface, dark text) with a `backdrop-blur` + 1px bottom border; the dark header on a light page is what makes the site "have no light mode" at a glance.
4. Theme toggle: fix the icon (`currentColor` / missing sun-moon asset in light); add `meta[name=theme-color]` per theme; respect `prefers-color-scheme` on first visit, persist choice (next-themes already does — confirm `defaultTheme="system"`).
5. Video/interstitial: the `.mp4` plates are dark; in light mode wrap them in the same framed-stage treatment.
**Accept:** Light-mode full-page shot has **no** section with a dark background except the framed stage, the interstitial plate and the authenticity video; Lighthouse a11y contrast audit passes in both themes.

### P14.S3 — Hero framing: kill the gap, car above the fold

**Files:** `HeroV2` layout, `messages/fa.json`.
**Do (desktop ≥ lg):** The sticky block becomes `[headline strip] / [stage | job card]` where the headline strip is **one line H1 (≤ 40 chars) + one subline**, max ~120px tall, and the paragraph «این خودرو از همان قطعه‌هایی ساخته شده…» moves *into the stage* as the beat-0 caption (it is stage narration, not page copy). `top-24` sticky offset stays but the stage must start ≤ 35% of viewport height at scrollY=0 on 1440×900.
**Do (mobile < lg):** Order = H1 (2 lines max at 30px) → stage (sticky, `top-[header height]`) → job-card strip → subline. The subline and the paragraph are *not* above the stage. Stage aspect on mobile: `aspect-[4/3]` (16/11 leaves too little height for the callout + chip). The finale parking layout gets a mobile variant (see S5).
**Accept:** y=0 shots: desktop shows ≥ 60% of the car; 390×844 shows the full car within the first viewport with the H1 above it. No CLS regression.

### P14.S4 — Hero pacing: smooth scrub + soft station snapping + "tour" mode

The owner wants two things that pull in opposite directions: *manual scrolling should feel slow and enjoyable* and *it should also be able to move from one animation to the next by itself*. Do both, without hijacking scroll:

**Files:** `HeroV2` progress hook, station buttons, `cameraRig.ts`.
**Do:**
1. **Smoothed progress.** Wrap the raw `scrollYProgress` in motion's `useSpring(progress, { stiffness: 60, damping: 20, mass: 0.6 })` (tune on device) and drive *every* transform from the spring, not the raw value. A fast flick now plays the whole story over ~1.2s instead of teleporting; a slow scroll feels 1:1. Reduced-motion → no spring (raw value) — the current behaviour.
2. **Longer track, per device.** Desktop `100vh + 160rem`; mobile `100vh + 96rem`. Touch flicks cover 2–3× more distance than a wheel tick, so mobile gets proportionally *more* track, not less. Re-tune station `p` ranges after (they are fractions; only the absolute pixel-per-beat changes).
3. **Soft station snapping.** When scrolling stops (150ms idle, `scrollend` where supported) and the spring's value is within ±0.04 of a station's *dwell point* (front = 0.24, engine = 0.52, body = 0.76, finale = 0.95), `scrollTo({top: stationTop, behavior:'smooth'})`. Outside those bands do nothing — never fight the user mid-scroll. Disable under reduced-motion and when the user is dragging the scrollbar (mouse down on scrollbar / `pointerdown` outside content).
4. **Tour mode.** A small «نمایش خودکار ▶» button beside the existing prev/next: runs a scripted scroll through the four dwell points with `easeInOut` (~2.4s per station, 0.8s hold), pauses on any user input (wheel/touchstart/keydown), resumes never (one shot). This *is* the owner's "one-time use, moves from first animation to second". Implementation is `requestAnimationFrame` + `window.scrollTo` — no library. Also auto-start the tour **once per session on mobile** if the user has not scrolled within 2.5s of the hero being on screen (`sessionStorage` flag; skip under reduced-motion and `saveData`).
5. **Idle life.** When the spring is at rest inside a station for > 1s, add a 6s `p`-independent idle loop: detached parts drift ±3px and the light source breathes (glow opacity 0.5→0.65). Stops on scroll. This is what makes a paused frame feel alive instead of frozen.
6. Keep prev/next; make them keyboard-focusable and add `aria-live="polite"` on the station caption so screen readers hear «ایستگاه ۲ · قلب موتور».
**Accept:** Video capture (screen record, 10s) of a trackpad flick: story plays through smoothly, no jump; slow scroll = 1:1; idle in station 2 shows drift. Mobile shots at the four dwell points after a flick + snap land within ±0.02 of each dwell `p`.

### P14.S5 — Hero story v3: anchor the narrator, keep the ending, use the visitor's car

**Files:** `PartCallout.tsx`, `parts.registry.ts`, `HeroStage.tsx`, `messages/fa.json`.
**Do:**
1. **Anchored callouts (fixes V2).** Each plate gets an anchor dot at the part's *detached* centroid (registry `anchor`) and a 1px leader (SVG line, `stroke-dashoffset` draw-on) to the plate. Plate placement: desktop uses `labelSide` from the registry with a tiny collision table; **mobile uses a single fixed bottom strip** (plate docked to the stage's bottom edge, full width, leader still drawn to the anchor above it). Tapping the part sprite and tapping the plate both navigate.
2. **Job card visibility fix (V3/I2).** Row tick state derives from each part's own `detachAt` vs the spring value, not from a running index; untriggered rows render ghosted (name only, 40%) so the list has a stable height and no blank slots.
3. **Finale holds (V4/I3).** The exploded state is the *resting* state from p=0.9 through un-pin and remains while the section scrolls away; re-dock only on upward scroll below p=0.86.
4. **Mobile finale layout (I4).** A `finaleMobile` parking table in the registry: 10 parts in two rows *above* and *below* a scaled-down (0.7) body, chips as a 2-row wrap under the stage instead of on it.
5. **The visitor's car in the story.** The header already knows the selected vehicle («سایپا شاهین ۲۰۲۰»). When a vehicle is selected, the beat-0 caption and the finale header interpolate it: «این‌ها قطعاتی است که به **شاهین ۲۰۲۰** شما می‌خورد.» / «۹ از ۹ — همه را برای شاهین شما داریم». When none is selected, the finale's secondary CTA «خودرویم را انتخاب می‌کنم» opens the selector *in place* (scroll to `#find-my-part` and focus the first select). This is the cheapest "soul" on the page: it talks about *their* car.
6. **Station captions with a voice** (real copy, replaces the neutral station labels):
   - beat 0: «بیایید خودرو را با هم باز کنیم.»
   - station 1: «اول نور. چراغی که کدر شده، دید شما را کم می‌کند — نه فقط زیبایی را.»
   - station 2: «حالا قلب کار. زیر کاپوت، سه قطعه‌ای که بیشترین تماس‌ها را می‌گیرند.»
   - station 3: «و بدنه. گلگیر و درب، همان‌هایی که بعد از یک تصادف کوچک لازم می‌شوند.»
   - finale: «همه‌اش همین‌جاست. هر کدام را بزنید.»
7. **Light-sweep at every station start** (not only on load): reuse `hero-sweep`, triggered by the station change event, 900ms, masked to the body.
**Accept:** Shots at the four dwell points on both viewports show anchor + leader + plate; no blank job-card slot at any p; y=un-pin+300 shows the exploded car scrolling away; with a vehicle selected the finale header names it.

### P14.S6 — Mobile-first pass on the whole landing [I until S0]

**Files:** header, each landing section, footer.
**Do:**
1. **Header (mobile):** two rows. Row 1: menu · wordmark · account · cart. Row 2 (always visible, not in the drawer): **search input full-width** + the vehicle chip («شاهین ۲۰۲۰ ▾» or «خودرو را انتخاب کنید») as a compact button at its inline-end. Header height ≤ 104px total; collapses to row 1 only after 80px of downward scroll, re-expands on upward scroll (`scroll-direction` hook — you likely have one; if not, 20 lines). All controls ≥ 44px hit area (product choice).
2. **Mobile menu drawer:** current content unknown to me (not captured) — S0 screenshot it. Requirements: categories as a 2-col icon grid (the 10 systems), then «برندها», «راهنما», «تماس»; theme toggle inside; close on route change; focus trap; `inert` on the page behind.
3. **Sticky bottom action bar (mobile only):** appears after the hero un-pins: «جستجوی قطعه» (opens search focused) · «خودروی من» (selector) · phone (tel:) . 56px, `padding-block-end: env(safe-area-inset-bottom)`. Hidden while the hero is pinned so it never covers the callout strip.
4. **Section rhythm:** on mobile, sections are `padding-block: 3rem`; every section opens with the H2 and a ≤ 90-char lead; no section may exceed ~2.5 viewports without a visual break (best-sellers at 1197px desktop → mobile becomes a horizontal snap row of 6 cards, not a 2×4 grid).
5. **Find-my-part:** selects and the code input are ≥ 48px tall; the three selects stack; the «جست‌وجوی کد» button is full-width; system grid is 2 columns with icon + name + count.
6. **Shop-by-vehicle:** two brand cards become an accordion on mobile (Saipa open by default).
7. **Symptom finder:** chips wrap in 2 columns with 44px height; add a «بیشتر…» expander after 6.
8. **Footer:** single column accordion groups on mobile (`<details>`), contact block first (phone as `tel:`, Telegram as `https://t.me/boyinshadows`, both ≥ 44px), brand list collapsed by default; remove the empty اینماد/نشان‌ملی boxes until real assets exist; fix «Ash Tech Group -- پارسیان» → «پارسیان · Ash Tech Group».
**Accept:** 390×844 full-page shot: no horizontal overflow (`document.documentElement.scrollWidth === 390`), search visible in the header at y=0, bottom bar present after hero, footer collapsed; Lighthouse mobile a11y ≥ 95.

### P14.S7 — Motion system: enter-on-view rule + infinite marquee

**Files:** new `components/motion/Reveal.tsx` (thin wrapper over motion's `whileInView`), `MotionMarquee`.
**Do:**
1. **Rule:** every landing section below the hero wraps its heading block and its primary grid in `<Reveal>`: `initial={{opacity:0, y:16}}` → `{opacity:1, y:0}`, `viewport={{ once:true, amount:0.2, margin:'0px 0px -10% 0px' }}`, duration 0.5, `easeOut`, children staggered 60ms (cards, rows, chips). No scale, no blur, no bounce — this is a workshop manual, not a startup deck. Reduced-motion → render final state immediately. Because it is `whileInView` on components you already ship, JS cost ≈ 0.
2. **Marquee (V8/V9):** render the item list **twice as identical node lists** (map the same array twice with `aria-hidden` on the second), separators as their own flex items with `margin-inline` so the seam is invisible; animate `translate3d(0,0,0) → translate3d(50%,0,0)` for RTL (or `-50%` with `direction:ltr` on the track — pick one and test the seam at 0.25× speed); `animation-play-state: paused` until the section is in view (IntersectionObserver toggles a class) and paused again when it leaves; pause on hover/focus-within; duration scales with item count (≈ 3.5s per item). Reduced-motion → static 2-row wrap grid.
3. Trust strip numbers («۰۱ … ۰۴») count in? No — leave; the reveal stagger is enough.
**Accept:** Scroll video shows sections revealing as they enter; marquee has no visible seam over one full loop at both viewports; `document.getAnimations()` at y=0 shows the marquee **paused**.

### P14.S8 — Copy with a voice («استادکار» — the master mechanic)

**Files:** `messages/fa.json`, `docs/voice.md` (new, short).
**Voice rules (write them into `docs/voice.md`):** second person, short sentences, one idea per line, verbs first, no adjectives that can't be checked («بهترین»، «بی‌نظیر» banned), name the car when known, admit limits («اگر نداشتیم، می‌گوییم»). It sounds like the person behind the counter who has done this for twenty years.
**Rewrite (real copy, ready to paste — owner may edit):**
- H1: «قطعه‌ای که به خودروی شما می‌خورد.» · subline: «نه چیزی شبیه آن. اصل، کدخورده، برای سایپا و ایران‌خودرو.»
- find-my-part H2: «بگویید چه دارید، بقیه با ما.» · vehicle card: «خودرویم را می‌شناسم» → lead «مدل و سال را بزنید؛ فقط قطعه‌های سازگار را نشان می‌دهیم.» · code card: «کد قطعه را دارم» → lead «کد روی قطعه یا جعبه را وارد کنید. اگر داریم، همین‌جا می‌بینید.»
- trust strip: «۰۱ می‌گوییم به کدام مدل می‌خورد» / «۰۲ می‌گوییم از کجا آمده» / «۰۳ پول را بعد از تأیید بانک می‌گیریم» / «۰۴ قبل از خرید جواب می‌دهیم — رایگان»
- best-sellers H2: «آنچه بیشتر می‌برند» · lead «پرفروش‌های این ماه، برای مدل‌هایی که بیشتر می‌بینیم.»
- authenticity H2: «اصالت را نشان می‌دهیم، نه ادعا.» · lead «هر قطعه یک کد استعلام دارد: برند، کشور ساخت، مسیر تأمین. خودتان چک کنید.»
- shop-by-vehicle H2: «از خودروی خودتان شروع کنید.» · lead «پراید تا شاهین، سمند تا تارا. مدل را بزنید.»
- symptom H2: «صدایی می‌شنوید؟» · lead «علامت را انتخاب کنید؛ می‌گوییم معمولاً کدام قطعه است — و کدام نیست.»
- interstitial: «هر قطعه جای مشخصی دارد. کاتالوگ ما هم همان‌طور چیده شده.»
- brands H2: «برندهایی که خودمان هم می‌خریم.»
- closing H2: «چهار قدم، بعد قطعه دست شماست.» · steps: «خودرو را انتخاب کنید» / «قطعه را پیدا کنید» / «اصالت و تطبیق را ببینید» / «تحویل بگیرید» · aside: «مطمئن نیستید؟ زنگ بزنید. بیست سال است همین کار را می‌کنیم.» (**only if true** — otherwise «هر روز همین کار را می‌کنیم.»)
- footer tagline under the wordmark: «قطعه اصلی، برای خودروی ایرانی.»
- support hours line: replace «به‌زودی اعلام می‌شود» with the real hours or delete.
**Accept:** No banned adjectives (grep), no English on `/` except codes/brand names, every string ≤ the widths it must fit at 390px (S0 shots), owner sign-off on voice.md.

### P14.S9 — Polish burn-down

- V13 numbering: restore «05» on shop-by-vehicle or drop numbers below the hero (owner's call; my recommendation stands: keep numbers, they're now consistent).
- Job-card counter «۰ از ۹» must say ten if the hero has ten parts (brief says ten; the rail shows nine rows — reconcile: either windshield gets a row or the counter is "۹").
- Hero `overflow` on the stage: during station 1 push-in the rear of the car is hard-clipped at the stage's end edge (visible at y=1100). Either add a soft edge (`mask-image: linear-gradient` 24px on the inline-end) or reduce push-in scale to keep the car inside.
- Station prev/next buttons: on mobile move them to the stage's bottom corners as 44px round icon buttons.
- `hero-sweep` on load runs even when the hero is not the first paint (deep link to `#find-my-part`) — gate it on the stage being in view.
- I6 best-sellers seed data: flag off until real products (product decision — note in `docs/deferred.md`).
- Placeholder trust badges (اینماد/نشان‌ملی): hide until assets exist.
- `suppressHydrationWarning` on `<body>` if not already done (extension attribute noise during shots).

---

## 3. Order of execution

S0 → S1 (type) → S2 (light) → S3 (framing) → S4 (pacing) → S5 (story v3) → **hero PR** → S6 (mobile pass) → S7 (motion rule + marquee) → S8 (copy) → S9 → **landing PR**.

S1 and S2 first because every later screenshot must be judged in the final type and theme; doing them last would mean re-reviewing everything. S3 before S4 because the snap points depend on the final track geometry.

## 4. Definition of done (owner's acceptance frame)

On a phone, at scroll 0, you see the headline and the whole car, with the search box in the header. One thumb-flick plays the story smoothly to the next station and rests there; the part that came off has a dot, a line and a plate you can tap. Stop scrolling and the scene breathes. At the bottom the car is open, ten parts are parked, the card says «همه را برای شاهین شما داریم». Switch to light mode: the page is light, the stage is a dark window inside it. Every heading is the font you like, with air above and below it. Scroll on: each section arrives as you reach it, the brands run forever without a jump, and the footer folds into four rows. Then check the same on a laptop.
