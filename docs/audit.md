# Competitor DOM / UX Audit — P0.S1

**Date:** 2026-07-25
**Scope:** 9 Iranian car spare-parts e-commerce sites, per masterPlan.md §1.2 and Phase 0 / P0.S1 DoD.
**Author:** Research pass by Claude Code agent, ahead of Phase 1 GATE 0→1 human review.

## Methodology

Each site was checked with two independent methods so findings can be graded by confidence:

1. **WebSearch first** — confirmed the real URL, pulled indexed snippets (nav labels, category names, product titles) even where the live page can't be rendered.
2. **WebFetch second** — attempted the homepage, then a product-listing page (PLP) and, where reachable, a product-detail page (PDP), asking the fetch to extract nav/IA, vehicle-finder behavior, PLP filters, PDP anatomy, authenticity claims, and checkout signals.

Where WebFetch returned a real DOM (nav, filters, product cards, prices), the site is marked **live-fetched**. Where only a homepage or only a shop sub-page rendered, it's marked **partial**. Where WebFetch returned an empty shell, an infinite redirect, a maintenance placeholder, or a 404, the finding is attributed to **search-index-only / blocked** and is *not* presented as directly observed DOM.

**Update vs. the masterPlan.md §1.2 note:** the plan's original audit (written before this pass) assumed 4 sites block automated fetching outright and 3 return near-empty JS shells. Re-testing today, most sites are now reachable at the DOM level — access has *improved* since that note was written, with two clear exceptions (`fabricpart.com`, `yadakyar.com`). Checkout flows specifically could not be verified live on any site — all require a populated cart/session, so checkout-step claims below are inferred from cart/shipping copy found on reachable pages, not a walked-through checkout.

`yadakyar` and `mashinno` (named in masterPlan.md §1.2 as wider-market references without confirmed URLs) both resolved to real, matching Iranian car-parts stores — `yadakyar.com` and `mashinno.com` — so no substitution was needed.

---

## Per-site findings

| Site | URL | Access status | Key findings |
|---|---|---|---|
| **مستر یدکی (MrYadaki)** | mryadaki.com | **Live-fetched** (homepage + PLP; PDP URL guessed from search snippet returned a real 404 page, confirming site structure but not a live PDP) | Vehicle-finder is a static two-field form (برند خودرو → مدل خودرو + search button), not a live cascading widget. Trust strip: «ضمانت بازگشت | تا ۷ روز پس از خرید», «اصالت کالا | تضمین کیفیت و اصالت», cash/installment/credit payment badge. PLP (Soren/سورن category) has price-range, vehicle brand/model, install-location, electrode-material, category, in-stock and sale-only filters; breadcrumb `مستر یدکی > خودروها > ایران خودرو > سورن`; 428 products, numbered pagination. |
| **اتوموبی (Automoby)** | automoby.ir | **Live-fetched** (homepage + 2 PLP pages) | Positions itself as "Iran's largest online parts marketplace." Authenticity promise is a slogan, not evidence: «ضمانت اصل بودن — اصل نبود، پس بده!» (not original? return it). PLP product cards carry an explicit fitment badge on the card itself: «مناسب سایپا پراید». Filters are brand/manufacturer only on the fetched category (no visible price-range or sort control on that page). Breadcrumb depth is 4–7 levels (brand → model → category → sub-category). No pricing shown on the homepage itself, only inside categories. |
| **یدکی‌جات (Yadakijat)** | yadakijat.com | **Live-fetched** (homepage) | Notably different model: primary vehicle ID is **VIN lookup**, not a make/model/year dropdown — hero copy: «از VIN تا قطعه؛ همه زیر یک سقف», branded "Yadakijat AI × Smart EPC." Specializes in Toyota/Lexus. Prices shown in **Rial** with comma grouping (e.g. "70,470,000 ریال") — the only audited site not defaulting its displayed unit to Toman. |
| **دکتر یدکی (Dr. Yadaki)** | dryadaki.com | **Partial** — homepage itself returns a bare client-side "Redirecting..." shell with no content on direct fetch; `/product-category/all/` (a shop sub-page) rendered fully | Site blends an "academy"/education brand with an ISACO-parts storefront. Fitment info is embedded as plain text inside product titles (e.g. "پژو 405، پارس (پرشیا)، سمند، 206، 207، رانا، دنا") rather than structured filters — readable for SEO/search snippets but not filterable or verdict-bearing. Trust badges: «ضمانت اصالت کالا», «پشتیبانی مشتریان», «ارسال به سراسر کشور», eNamad seal. |
| **فابریک پارت (FabricPart)** | fabricpart.com | **Blocked** — site is currently a WordPress "under construction / maintenance" placeholder page ("Sorry, we're doing some work on the site") with zero storefront content reachable | No nav, no products, no trust content observable today. This is a live production-availability failure at time of audit, not a fetch-tooling limitation — noted honestly per the constraint against overclaiming access. |
| **شجاع پارت (ShojaPart)** | shojapart.com | **Live-fetched** (homepage + PLP) | PLP (Suspension/جلوبندی category) has genuinely rich faceting: bucketed price ranges with implied counts, brand facet with per-brand counts (e.g. "آریا کیان سپهر - AKS (65)"), and a car-model facet — but that facet is nearly empty («پژو 405 (4)», «پژو206 (2)») despite the category clearly stocking parts for many more vehicles, i.e. fitment metadata is thin/inconsistently tagged. Same-city courier promise: «ارسال پیک زیر 2 ساعت در تهران». Product cards show a 0–5 star rating (e.g. "نمره 4.78 از 5"). |
| **یدک کار (YadaCar)** | yadacar.com | **Live-fetched** (homepage + PLP + a real PDP) — the most complete data set obtained | PDP (Xantia Gold brake pad) has a **per-product** "بررسی سازگاری" (check compatibility) modal — user re-selects brand/model/engine/year on *every* PDP, nothing persists across products. The exact product fetched was out of stock («ناموجود») with only a bare "notify me" button — no backorder ETA, no honest stock language. PLP faceting is the deepest observed: 150+ brands, price slider to ₸141M, country-of-origin filter, 8-way sort including a part-number-oriented "Reference A-Z/Z-A" sort. 3,831 items in this one category. |
| **یدک یار (YadakYar)** | yadakyar.com | **Search-index-only / blocked** — the site's HTTPS endpoint 301-redirects to plain HTTP, and the HTTP endpoint redirects straight back to HTTPS, producing an infinite redirect loop for any HTTPS-enforcing fetcher (confirmed on two independent attempts) | From WebSearch snippets only: sells by brand/system category (موتور و اگزوز, برقی, بدنه, گیربکس, ترمز), has a blog ("مجله یدک یار"), and product-category URLs are Latin-slug based. No DOM-level claims are made for this site — everything above is snippet-derived, consistent with the "honesty" constraint. |
| **ماشین نو (Mashinno)** | mashinno.com | **Live-fetched** (homepage only; PLP/PDP not attempted this pass) | Broader positioning than a pure parts shop — branded "Intelligent Car Parts Finder" since 2015, with an insurance product, a "super-app" download push, and **BNPL/credit-gateway partners** (Fadax, DigiPay, Tara 360) surfaced directly in the hero carousel. No make/model/year selector widget and no product prices visible on the homepage itself — navigation is by 28+ brand-logo tiles. |

**Tally:** 7 of 9 sites live-fetched at the DOM level (mryadaki, automoby, yadakijat, dryadaki\*, shojapart, yadacar, mashinno — \*dryadaki's shop sub-page, not its homepage). 2 of 9 blocked for direct fetch (fabricpart — maintenance placeholder; yadakyar — redirect loop), backed by WebSearch-only data instead.

---

## What we steal

Patterns worth matching or deliberately learning from — each is something a live competitor does that a buyer would miss if we shipped without it.

| # | Pattern | Persian phrase | Why it matters | masterPlan.md ref |
|---|---|---|---|---|
| 1 | Fitment badge printed directly on the PLP product card, not just the PDP | «مناسب سایپا پراید» | Buyers filter visually while scrolling a grid; a fitment answer that only appears after a click is too late. Confirms our own plan already puts this on the PLP. | §3.4 My Garage — PLP fitment chip |
| 2 | Deep, faceted PLP filtering: brand (150+), price slider, country of origin, in-stock/sale toggles, part-number-aware sort | «برند», «قیمت», «ساخت کشور», «مرجع، الف تا ی» | This is the Mechanic persona's tool — someone who knows the part number wants to sort/filter by it, not browse pretty cards. yadacar.com does this best of all 9 sites audited. | §1.1 The Mechanic; §9 `/catalog/facets`, `/catalog/products` filters |
| 3 | Faceted filter *counts* shown per option (e.g. "AKS (65)") | — | Tells the buyer before they click whether a filter combination is worth trying — avoids the classic "0 results" dead end. | §9 `GET /catalog/facets` — "filter counts for the active query" |
| 4 | Plain-language, crawlable fitment text embedded in product titles/descriptions in addition to structured data | «پژو 405، پارس (پرشیا)، سمند، 206، 207، رانا، دنا» | Good for SEO snippet capture and for shoppers who search by model name rather than using a filter. We should mirror this in generated SEO copy even though fitment itself is structured in the `Fitment` model. | §3.2 Product/Fitment model; §10 SEO |
| 5 | Hierarchical brand→model URL structure driving both nav and SEO (`/cb-saipa/cm-pride/`) | — | Confirms the value of `/vehicle/[make]/[model]` as "SEO gold" — competitors already rank on this pattern. | §3.1 `/vehicle/[make]/[model]` |
| 6 | Concrete, time-bound service promises in the trust strip (7-day returns, sub-2-hour in-city courier) rather than vague "fast shipping" language | «ضمانت بازگشت تا ۷ روز», «ارسال پیک زیر ۲ ساعت در تهران» | Specific numbers read as more credible than generic badges — directly reinforces why our Authenticity Record needs to be evidence-shaped, not sloganeering. | §5 section 02 Trust strip; §3.5 Authenticity Record |
| 7 | Star ratings surfaced directly on PLP cards, not just the PDP | «نمره ۴.۷۸ از ۵» | Social proof visible during browsing shortens the path to add-to-cart; matches our `Product.rating{avg,count}` field, which should render on the ProductCard, not only the PDP. | §3.2 Product model `rating{avg,count}`; §3.1 `components/shop/ProductCard` |
| 8 | VIN-based part lookup as an *additional* identification path alongside make/model | «از VIN تا قطعه؛ همه زیر یک سقف» | Some buyers (especially the Mechanic, or a Driver holding their registration card) know their VIN but not their trim/generation. Worth a future-phase input option feeding the same Garage/fitment engine — not a scope change now, just a validated demand signal. | §3.4 My Garage (future enhancement, not required for Phase 0–4) |
| 9 | BNPL / credit-gateway partners surfaced prominently in the hero, not buried in checkout | Fadax, DigiPay, Tara 360 | Validates that "اقساط" isn't just a checkbox — it's a homepage-level trust/conversion lever for this market, consistent with our Phase 9 installment placeholder becoming a real priority sooner rather than later. | §3.6 Checkout — payment step; §13 Phase 9 |

## What we beat

Weaknesses actually observed live (not assumed) — and the specific masterPlan.md mechanism that already prevents each one.

| # | Weakness observed | Site | What ParsianStore does instead | masterPlan.md ref |
|---|---|---|---|---|
| 1 | Fitment check is a **per-product** modal — the buyer re-enters make/model/engine/year on every single PDP with nothing persisted | yadacar.com | A persistent, saved, URL-addressable **Garage** (`?v=<vehicleKey>`) set once and carried across every PLP/PDP visit | §3.4 My Garage |
| 2 | Out-of-stock PDP shows a bare "notify me" button with zero backorder context — no ETA, no honest stock language | yadacar.com | Real inventory state with **honest backorder language**, not "call us" / silence | §1.2 weaknesses table; §3.2 `Product.stock`/`backorderable` |
| 3 | Authenticity claim is a one-line slogan badge with no evidence, batch data, or verification mechanism | mryadaki.com, dryadaki.com | Per-item **Authenticity Record**: supply route, source brand/country, hologram/batch code, and a public `GET /api/authenticity/verify/:code` endpoint | §3.5 Authenticity Record |
| 4 | "Not original? Return it" is a marketing promise, not proof, and requires the buyer to already have bought a fake to test it | automoby.ir | Evidence shown **before** purchase on the PDP itself, mono-set codes and hairline rules, "not a glowing badge" | §3.5 Authenticity Record |
| 5 | Fitment metadata is thin/inconsistent — a suspension category's own vehicle-model facet lists only 2 models with single-digit counts despite obviously wider coverage | shojapart.com | **Fitment Manager** coverage report — "which vehicles have thin part coverage" is a first-class admin tool, not a silent gap | §3.7 Fitment Manager — Coverage report |
| 6 | Displayed currency unit is inconsistent with the rest of the market — prices shown in raw Rial with comma grouping ("70,470,000 ریال") while every other audited site uses Toman | yadakijat.com | **One** formatter, `formatToman(rial)`, used everywhere; money is stored as integer Rial and converted at render time only — never inconsistent, never mixed units | §3.2 Money rule; §7.5 `formatToman(rial)` |
| 7 | Homepage itself is an empty client-rendered redirect shell on direct fetch — no crawlable content without executing JS | dryadaki.com | Server Components by default; landing route hits an LCP budget of ≤2.0s on throttled mobile and is meaningfully renderable without client JS | §10 Performance budgets; §1.2 "WooCommerce/WordPress stacks; heavy, slow" |
| 8 | Entire storefront unreachable — replaced by a generic "under construction" placeholder in production | fabricpart.com | N/A directly, but this is the strongest available evidence for the plan's own bet against agency WordPress/WooCommerce stacks in this market — a self-hosted Next.js deploy behind Docker on Liara/ArvanCloud is the explicit alternative | §1.2 Universal weaknesses; §11 Environments & deployment |
| 9 | HTTPS/HTTP redirect misconfiguration causes an infinite loop for any HTTPS-enforcing client | yadakyar.com | Basic web hygiene the plan already assumes via a proper Next.js/Nginx deploy target — no equivalent redirect trap possible under the locked hosting approach | §11 Environments & deployment |
| 10 | No audited site exposes a persistent "active vehicle" indicator in global header chrome — vehicle context resets between page loads/categories rather than following the user | all 7 live-fetched sites | Header shows the **active vehicle as a compact chip** at all times; tap to switch; global Zustand state persisted and reflected in the URL | §3.4 My Garage — "Header shows the active vehicle as a compact chip" |
| 11 | Checkout flow could not be completed or observed live on any of the 9 sites (all require a populated cart/session; direct checkout URLs 404 or bounce to login) — buyers can't evaluate friction before committing to an account/cart | all 9 | **3-step, one-page, no-account-required** checkout is specified up front and independently verifiable in our own build, rather than inherited sight-unseen from a competitor's flow | §3.6 Checkout |

---

**Total distinct findings: 20** (9 "what we steal" + 11 "what we beat"), each mapped to a specific masterPlan.md section. Exceeds the P0.S1 DoD minimum of 15.

## Honesty notes for human review

- No checkout flow was walked through end-to-end on any competitor site — checkout claims in §3.6 of the plan are therefore *not* competitively re-validated by this pass, only carried forward from the original plan. If a human reviewer has already completed a real checkout on any of these 9 sites, that should supersede the "could not verify" note above (finding #11).
- `fabricpart.com` and `yadakyar.com` findings are explicitly weaker-confidence (search-index-derived or placeholder-only) and are flagged as such in the per-site table — they should not be treated as DOM-verified.
- Mobile-specific UI (bottom nav, drawer behavior, touch target sizing) could not be assessed by WebFetch, which returns a text/DOM extraction rather than a rendered viewport screenshot. No mobile-specific claims are made in this document; masterPlan.md §5's "mobile-first" mandate stands on its own merits, not on a mobile-observed competitor weakness.
