import Link from "next/link";
import { CATALOG_SYSTEMS } from "schemas";
import { fetchBrands } from "@/lib/fetchers/brands";
import { fetchMakesSafe } from "@/lib/fetchers/vehicles";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "@/lib/contact-info";

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
      <div className="mx-auto grid max-w-container grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-5">
        <FooterColumn title="دسته‌بندی‌ها" links={categoryLinks} />
        <FooterColumn title="برندهای خودرو" links={vehicleLinks} />
        <FooterColumn title="برندهای قطعه" links={brandLinks} />
        <FooterColumn title="راهنما" links={POLICY_LINKS} />
        <div className="flex flex-col gap-2">
          <h2 className="text-body-sm font-semibold text-text">ارتباط با ما</h2>
          <p className="text-body-sm text-text-muted">تهران، ایران</p>
          <a
            href={`tel:${CONTACT_PHONE_TEL}`}
            dir="ltr"
            className="text-body-sm text-text-muted hover:text-text"
          >
            {CONTACT_PHONE_DISPLAY}
          </a>
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
        © {new Date().getFullYear()} پارسیان -- Ash Tech Group
      </div>
    </footer>
  );
}
