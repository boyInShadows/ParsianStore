import { getTranslations } from "next-intl/server";
import { WorkshopLoader } from "./WorkshopLoader";

/**
 * What a storefront route shows while it is being fetched (P15.S3).
 *
 * The route-transition loader and the route progress bar in one, because both
 * want exactly the same lifetime: a `loading.tsx` default export.
 *
 * **It renders on four routes, and a route qualifies for it only by resolving
 * its not-found decision in a sibling `layout.tsx`.** Read "How four routes
 * were qualified" below before wiring a fifth — the constraint is measured, and
 * the mechanism is not the one this file originally named.
 *
 * ## Why the progress bar needs no client JavaScript
 *
 * The step's brief expected a client leaf listening for navigation events. It
 * does not need one. The App Router mounts this subtree for exactly the
 * interval a navigation is pending and unmounts it the moment the page
 * arrives — which is precisely the lifecycle a progress bar wants, handed over
 * for free. A CSS animation on a mounted element is the whole mechanism, so
 * the feature costs **zero bytes of JavaScript**.
 *
 * That was not merely the tidier option, it was the only affordable one. A
 * client leaf here would land in the shop chrome, which every shop route pays
 * for — including the landing, which at S3 measured 199.8 kB against a 200 kB
 * hard fail. The real headroom was 0.2 kB, not the 3 kB the chrome layer's own
 * budget suggests. (P15.S8b has since recovered bytes and ratcheted the ceiling
 * down with them — `pnpm check:budget` is the current number, never this line.)
 *
 * ## What a loading boundary costs here, measured rather than assumed
 *
 * This started as one `loading.tsx` at the `(shop)` group root. Two measured
 * costs took it from there to nowhere.
 *
 * **1. On a prerendered route it is a curtain.** With `loading.tsx` at
 * `(shop)/`, the landing sits inside the boundary and Next builds that route
 * as a *streaming shell*: the HTML opens `<!--$?--><template id="B:0">`,
 * paints this loader, and carries the entire real page in a
 * `<div hidden id="S:0">` that one `$RC()` call at the very end of the
 * document reveals. The landing's first paint became a loading screen with the
 * page hidden behind it — the full-page curtain `tasks.md`'s P15 owner
 * decision rules out — and the numbers agree: **FCP 816 → 756 ms while LCP
 * went 872 → 1080 ms.** FCP *improved* because a loader is trivial to paint,
 * which is exactly why web.dev stops trusting FCP once a page shows one.
 *
 * **2. On a dynamic route it destroys the response.** The shell is flushed
 * before the page reaches its `notFound()` or `redirect()`, so the response is
 * already committed. A/B'd on one build pipeline in one session:
 *
 *     route                            with loading.tsx      without
 *     /vehicle/not-a-real-make               200               404
 *     /c/not-a-real-slug                     200               404
 *     /p/not-a-real-slug                     200               404
 *     /brand/not-a-real-brand                200               404
 *     /orders/ABC123 (signed out)      200 + meta refresh   307 + Location
 *
 * Four real 404s become soft 404s on the routes the catalogue's SEO depends
 * on, and the auth redirect degrades to `<meta http-equiv="refresh">` — which
 * axe reports as a live WCAG 2.2.1 violation, so it also fails this step's own
 * "axe 0 violations" gate. `e2e/vehicle-make.spec.ts:41` caught the first half
 * — «an unknown make is a 404, not a degraded page».
 *
 * ## How four routes were qualified — P15.S10, and the fix is not the one
 * that was planned
 *
 * S3 left two proposed routes out of this. **The first one was wrong**, and it
 * is corrected here rather than deleted, because the wrong version was written
 * as fact and would send the next reader down it again:
 *
 * > ~~Move the decision into `generateMetadata`. Next resolves it before it
 * > streams, so a `notFound()` there keeps the 404.~~
 *
 * **It does not, on 15.5.21.** Next 15.2 introduced streaming metadata:
 * `generateMetadata` renders inside a Suspense boundary of its own and is
 * streamed with the page, so it stopped gating the shell. Measured on a
 * production build, a `notFound()` there leaves the route answering **200** —
 * and leaves the visitor on Next's built-in English, LTR 404 rather than a
 * localised one, so it is worse than doing nothing. Googlebot and Twitterbot
 * get the 200 too; the `htmlLimitedBots` blocking-metadata path does not
 * rescue it.
 *
 * **A segment `layout.tsx` does gate it.** `loading.tsx` wraps only its
 * segment's *page* in Suspense; the segment's own layout sits above that
 * boundary, so an `await` there still blocks the first flush and the status is
 * still the page's to set. Measured with `loading.tsx` present:
 * `/c/{unknown}` → **404**, localised and RTL; `/c/engine` → **200**.
 *
 * So four routes now render this component, each with a sibling `layout.tsx`
 * that resolves not-found ahead of the flush: `c/[slug]`, `brand/[slug]`,
 * `p/[slug]`, `vehicle/[make]/[model]/[gen]`. Wiring a fifth is one file
 * (`export { ShopRouteLoader as default } from "@/components/loading";`) plus
 * that layout, and `loading-boundaries.test.ts` fails the moment the loader is
 * added without it.
 *
 * **The boundary must be at the deciding segment, not above it.** A
 * `loading.tsx` at `vehicle/[make]/` puts the `[model]/[gen]` layout *inside*
 * its Suspense boundary; measured, `/vehicle/saipa/pride-111/1999` then
 * answered **200** with the 404 body. That is why `vehicle/[make]` has no
 * loader of its own — and it loses nothing, because its page's only fetch is
 * the one its decision would already have made, so the loader would live for
 * about zero milliseconds.
 *
 * The second of S3's routes — a client leaf in the shop chrome — was not
 * needed and was not built. It would still cost bytes the landing does not
 * have.
 *
 * ## Voice and shape
 *
 * Copy from `fa.json` (`docs/voice.md`): a person went to look, and you are
 * asked to wait a moment. Not «در حال بارگذاری…», which is a computer talking
 * about itself.
 *
 * Not a bordered card either. ADR 0025 counted `rounded-lg border border-border
 * bg-surface p-4` twenty times across this codebase and named it the design
 * debt; a loading state is the last place that box earns its keep. The
 * hierarchy is scale contrast plus one accent rule — the same opening move the
 * hero's own header makes.
 */
export async function ShopRouteLoader() {
  const t = await getTranslations("Loading");

  return (
    <>
      {/* Outside the flow entirely: `position: fixed`, above the sticky
          header, affecting no layout and therefore contributing no CLS. */}
      <div className="route-progress" aria-hidden="true" />

      {/* `min-h-[60vh]`, not `min-h-screen`: the header and the footer belong
          to the layout and do not unmount, so a full screen of nothing here
          would push the footer a viewport down and make the whole page jump
          when the content lands. */}
      <div className="mx-auto flex min-h-[60vh] max-w-container flex-col justify-center gap-6 px-4 py-16 lg:px-8">
        <div className="flex flex-col gap-4">
          {/* The marigold rule the landing's section headers open with. Purely
              decorative, so it is hidden from the accessibility tree rather
              than left as an unnamed graphic. */}
          <span aria-hidden="true" className="h-px w-12 bg-cta-ink" />
          {/* `role="status"` on the sentence and not on the mark: one wait, one
              announcement. `aria-live="polite"` so it never interrupts, and the
              text is real on-screen copy rather than an `sr-only` label — a
              visitor who can see the page and one who cannot are told the same
              thing. */}
          <div role="status" aria-live="polite" className="flex flex-col gap-2">
            <p className="font-display text-h2 font-black text-text">{t("title")}</p>
            <p className="text-body-lg text-text-muted">{t("detail")}</p>
          </div>
        </div>
        <WorkshopLoader />
      </div>
    </>
  );
}
