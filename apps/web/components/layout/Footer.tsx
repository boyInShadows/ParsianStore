import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CATALOG_SYSTEMS, toPersianDigits } from "schemas";
import { fetchBrands } from "@/lib/fetchers/brands";
import { fetchMakesSafe } from "@/lib/fetchers/vehicles";
import { CONTACT_CHANNELS, type ContactChannelKind } from "@/lib/contact-info";

/**
 * Hidden on purpose, not broken -- the same named-flag pattern `GuidesTeaser`
 * and `Newsletter` use, for the same reason.
 *
 * P9.S16's link sweep found every one of these seven 404ing: masterPlan §5
 * names the routes but none has ever been built, so the footer was advertising
 * seven dead ends to real visitors. The column stays absent rather than
 * dead-linked, exactly as WhatsApp is absent from the contact list and Deals
 * renders nothing at all.
 *
 * The four legal pages need copy only the owner can write (returns window,
 * warranty terms, privacy practices, terms of sale) -- that is what this is
 * waiting on, not code. Flip to `false` once the routes exist; the labels and
 * hrefs below are already the right ones.
 */
const POLICY_COLUMN_HIDDEN = true;

const POLICY_LINKS = [
  { label: "درباره ما", href: "/about" },
  { label: "تماس با ما", href: "/contact" },
  { label: "سوالات متداول", href: "/faq" },
  { label: "بازگشت و تعویض", href: "/returns" },
  { label: "ضمانت اصالت کالا", href: "/warranty" },
  { label: "حریم خصوصی", href: "/privacy" },
  { label: "قوانین و مقررات", href: "/terms" },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-body-sm font-semibold text-text">{title}</h2>
      <ul className="flex flex-col gap-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-body-sm text-text-muted hover:text-text">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
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
      <div
        className={`mx-auto grid max-w-container grid-cols-2 gap-6 px-4 py-8 ${
          POLICY_COLUMN_HIDDEN ? "sm:grid-cols-4" : "sm:grid-cols-5"
        }`}
      >
        <FooterColumn title="دسته‌بندی‌ها" links={categoryLinks} />
        <FooterColumn title="برندهای خودرو" links={vehicleLinks} />
        <FooterColumn title="برندهای قطعه" links={brandLinks} />
        {POLICY_COLUMN_HIDDEN ? null : <FooterColumn title="راهنما" links={POLICY_LINKS} />}
        <div className="flex flex-col gap-2">
          <h2 className="text-body-sm font-semibold text-text">ارتباط با ما</h2>
          <p className="text-body-sm text-text-muted">تهران، ایران</p>
          {/* Every channel contact-info.ts exposes, so the footer cannot fall
              behind the closing beat. WhatsApp is absent from both for the same
              reason: no number exists yet (fableTasks §7 item 7). */}
          <ul className="flex flex-col gap-1">
            {CONTACT_CHANNELS.map((channel) => (
              <li key={channel.kind}>
                <a
                  href={channel.href}
                  dir="ltr"
                  aria-label={`${channelLabel[channel.kind]}: ${channel.display}`}
                  className="text-body-sm text-text-muted hover:text-text"
                >
                  {channel.display}
                </a>
              </li>
            ))}
          </ul>
          {/* Trust seals -- both gated on the business/legal registration
              masterPlan.md §11 flags as a Phase 6 external blocker. Real
              social media accounts don't exist yet either -- omitted
              entirely rather than linking to profiles that don't exist,
              same reasoning, no visual slot needed for something that
              isn't a required trust signal the way the two seals are. */}
          <div className="mt-2 flex gap-2">
            <div
              role="img"
              aria-label="جایگاه نماد اعتماد الکترونیکی (در انتظار ثبت)"
              className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-border text-caption text-text-muted"
            >
              اینماد
            </div>
            <div
              role="img"
              aria-label="جایگاه نشان ملی ثبت (در انتظار ثبت)"
              className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-border text-caption text-text-muted"
            >
              نشان ملی
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-body-sm text-text-muted">
        © {toPersianDigits(String(new Date().getFullYear()))} پارسیان -- Ash Tech Group
      </div>
    </footer>
  );
}
