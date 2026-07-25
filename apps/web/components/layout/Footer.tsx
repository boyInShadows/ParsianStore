import Link from "next/link";

const CATEGORY_LINKS = [
  { label: "موتوری", href: "/c/engine" },
  { label: "جلوبندی", href: "/c/suspension" },
  { label: "برقی", href: "/c/electrical" },
  { label: "بدنه", href: "/c/body" },
  { label: "ترمز", href: "/c/brake" },
];

const VEHICLE_LINKS = [
  { label: "ایران‌خودرو", href: "/vehicle/iran-khodro" },
  { label: "سایپا", href: "/vehicle/saipa" },
  { label: "بهمن‌موتور", href: "/vehicle/bahman-motor" },
  { label: "مدیران‌خودرو", href: "/vehicle/mvm" },
];

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

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-container grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-4">
        <FooterColumn title="دسته‌بندی‌ها" links={CATEGORY_LINKS} />
        <FooterColumn title="برندهای خودرو" links={VEHICLE_LINKS} />
        <FooterColumn title="راهنما" links={POLICY_LINKS} />
        <div className="flex flex-col gap-2">
          <h2 className="text-body-sm font-semibold text-text">ارتباط با ما</h2>
          <p className="text-body-sm text-text-muted">تهران، ایران</p>
          <a
            href="tel:02100000000"
            dir="ltr"
            className="text-body-sm text-text-muted hover:text-text"
          >
            021-00000000
          </a>
          {/* e-Namad seal -- gated on the business/legal registration
              masterPlan.md §11 flags as a Phase 6 external blocker. This
              stays an honest, labeled empty slot rather than a fabricated
              certificate image until that's real. */}
          <div
            role="img"
            aria-label="جایگاه نماد اعتماد الکترونیکی (در انتظار ثبت)"
            className="mt-2 flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-border text-caption text-text-muted"
          >
            اینماد
          </div>
        </div>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-body-sm text-text-muted">
        © {new Date().getFullYear()} پارسیان -- Ash Tech Group
      </div>
    </footer>
  );
}
