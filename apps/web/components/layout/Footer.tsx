import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CATALOG_SYSTEMS, toPersianDigits } from "schemas";
import { fetchBrands } from "@/lib/fetchers/brands";
import { fetchMakesSafe } from "@/lib/fetchers/vehicles";
import { CONTACT_CHANNELS, type ContactChannelKind } from "@/lib/contact-info";
import { Disclosure } from "@/components/primitives/Disclosure";

/**
 * The information pages that exist. `/about`, `/contact` and `/faq` shipped
 * with the P9 tail; the four legal pages masterPlan §5 also names --
 * `/returns`, `/warranty`, `/privacy`, `/terms` -- are absent from this list
 * because they are absent from the app.
 *
 * S16's link sweep is what forced the question: the column used to carry all
 * seven and every one of them was a 404, so the owner hid the whole column
 * behind a flag rather than ship dead links. Hiding is no longer the right
 * answer now that three of them are real, and listing the other four still is
 * not. A link appears here when its route does, and the sweep in
 * `e2e/landing.spec.ts` is what keeps that honest.
 */
const POLICY_LINKS = [
  { label: "درباره ما", href: "/about" },
  { label: "تماس با ما", href: "/contact" },
  { label: "سوالات متداول", href: "/faq" },
];

/**
 * One footer column: a heading and its links.
 *
 * P14.S6 makes it a disclosure below `sm`. The four link columns hold 10, 2, 16
 * and 3 links -- 31 rows at 38px each, which on a 390px phone is a footer four
 * screens tall standing between the visitor and nothing at all. Above `sm` the
 * panels are open and the toggle is inert, so the desktop footer is unchanged.
 *
 * `defaultOpen` is false everywhere, brand list included (fableTasks §P14.S6
 * item 8 singles that one out; the same argument applies to all four and a
 * footer where three of four groups are open is not a collapsed footer).
 */
function FooterColumn({
  id,
  title,
  links,
  className = "",
}: {
  id: string;
  title: string;
  links: { label: string; href: string }[];
  className?: string;
}) {
  return (
    <Disclosure id={id} title={title} as="h2" className={className}>
      <ul className="flex flex-col gap-1 pb-2 sm:pb-0">
        {links.map((link) => (
          <li key={link.href}>
            {/* `py-1.5` is not available: the spacing scale is REPLACED with
              0,1,2,3,4,6,8,12,16,20,24,32, so anything off it generates no CSS
              at all. `py-2` takes a 22px link to 38px, clearing WCAG 2.2's
              Target Size (Minimum) of 24x24 -- which these were failing at 22px
              (P13.S11). `inline-flex` because padding on an inline element
              does not grow its box. */}
            <Link
              href={link.href}
              className="inline-flex items-center py-2 text-body-sm text-text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </Disclosure>
  );
}

// masterPlan.md §5 item 15's mega footer. Category and vehicle links now
// come from the real taxonomy/vehicle tree instead of a hand-maintained
// array -- the previous hardcoded lists had drifted out of sync with the
// real data on both counts (found while building this out): category
// hrefs used stale slugs ("/c/brake", "/c/suspension", "/c/body") that
// don't match any real category (the real slugs are "brakes",
// "suspension-steering", "body-exterior" -- packages/schemas/
// catalogSystems.ts), and the vehicle column listed two makes
// ("بهمن‌موتور", "مدیران‌خودرو") that were never real -- the scope was
// narrowed to Saipa + Iran Khodro only in ADR 0004, and the real seeded
// vehicle tree only ever had those two makes to begin with.
export async function Footer() {
  const [brands, makes] = await Promise.all([fetchBrands(), fetchMakesSafe()]);
  // Borrowed from the closing beat's namespace on purpose: the footer and that
  // beat list the same channels, so sharing one set of labels as well as one
  // source of values means the two can never disagree about how to reach the
  // store.
  const t = await getTranslations("Landing.beats.closing.support");
  const channelLabel: Record<ContactChannelKind, string> = {
    phone: t("phone"),
    telegram: t("telegram"),
    whatsapp: t("whatsapp"),
  };

  const categoryLinks = CATALOG_SYSTEMS.map((system) => ({
    label: system.name.fa,
    href: `/c/${system.slug}`,
  }));
  const vehicleLinks = makes.map((make) => ({
    label: make.name.fa,
    href: `/vehicle/${make.slug}`,
  }));
  const brandLinks = brands.map((brand) => ({
    label: brand.name.fa,
    href: `/brand/${brand.slug}`,
  }));

  return (
    <footer className="border-t border-border bg-surface">
      {/* One column on a phone, five from `sm`. Each collapsed group carries
          its own rule below `sm` so the stack reads as a list of groups rather
          than as headings floating in space; above `sm` the rules go and the
          five-column footer is exactly what it was. */}
      <div className="mx-auto grid max-w-container grid-cols-1 gap-2 px-4 py-8 sm:grid-cols-5 sm:gap-6">
        <FooterColumn
          id="footer-categories"
          title="دسته‌بندی‌ها"
          links={categoryLinks}
          className="border-t border-rule pt-2 sm:border-t-0 sm:pt-0"
        />
        <FooterColumn
          id="footer-vehicles"
          title="برندهای خودرو"
          links={vehicleLinks}
          className="border-t border-rule pt-2 sm:border-t-0 sm:pt-0"
        />
        <FooterColumn
          id="footer-brands"
          title="برندهای قطعه"
          links={brandLinks}
          className="border-t border-rule pt-2 sm:border-t-0 sm:pt-0"
        />
        <FooterColumn
          id="footer-policies"
          title="راهنما"
          links={POLICY_LINKS}
          className="border-t border-rule pt-2 sm:border-t-0 sm:pt-0"
        />
        {/* Last in the DOM, first on the screen below `sm`. It is the only
            group that is not a disclosure: a visitor who scrolls to the bottom
            of a parts shop on a phone is usually looking for the phone number,
            and making them tap twice for it would be the opposite of this
            step. `order-first` moves it without moving it in the document, so
            the desktop column order is untouched. */}
        <div className="order-first flex flex-col gap-2 pb-4 sm:order-none sm:pb-0">
          <h2 className="text-body-sm font-semibold text-text">ارتباط با ما</h2>
          <p className="text-body-sm text-text-muted">تهران، ایران</p>
          {/* Every channel contact-info.ts exposes, so the footer cannot fall
              behind the closing beat. WhatsApp is absent from both for the same
              reason: no number exists yet (fableTasks §7 item 7). */}
          <ul className="flex flex-col gap-1">
            {CONTACT_CHANNELS.map((channel) => (
              <li key={channel.kind}>
                {/* `min-h-tap`, not `py-2`: these two are the primary mobile
                    contact actions and P14.S6 puts them on the 44px floor. */}
                <a
                  href={channel.href}
                  dir="ltr"
                  aria-label={`${channelLabel[channel.kind]}: ${channel.display}`}
                  className="inline-flex min-h-tap items-center text-body-sm text-text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:min-h-0 sm:py-2"
                >
                  {channel.display}
                </a>
              </li>
            ))}
          </ul>
          {/* The اینماد / نشان ملی placeholder boxes stood here: two dashed
              squares labelled "pending registration", gated on the
              business/legal registration masterPlan.md §11 flags as a Phase 6
              external blocker. Removed at the owner's call (P14.S6 item 8) --
              an empty box announcing that a trust seal does not exist yet is a
              worse trust signal than no box. The seals come back when the
              assets do; nothing else here has to change for that.

              Real social media accounts do not exist either, and are omitted
              for the same reason. */}
        </div>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-body-sm text-text-muted">
        {/* «·», not «--» (P14.S6 item 8): an em-dash-ish double hyphen between
            a Persian name and a Latin one read as a stray mark at the seam of
            the two scripts. The Latin half is isolated so the bidi algorithm
            cannot reorder it against the year beside it. */}
        © {toPersianDigits(String(new Date().getFullYear()))} پارسیان ·{" "}
        <span dir="ltr">Ash Tech Group</span>
      </div>
    </footer>
  );
}
