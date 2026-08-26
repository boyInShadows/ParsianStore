import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type Props = {
  // Mono record code -- the docket grammar SectionShell already established
  // for landing sections ("SYS-04 · ترمز"). On an account or commerce page
  // this is the page's own identity ("ORD", "CRT") or, better, a real record
  // number: the order detail page passes the actual order code.
  code?: string;
  title: string;
  titleAs?: "h1" | "h2";
  meta?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  className?: string;
};

// Every storefront page opened with the identical bare
// `font-display text-h2 font-black text-text` <h1> -- 23 files, no eyebrow,
// no meta, no rule, no scale contrast between "the store" and "your order
// PS-1404-04821". This is the missing shell. Title sits a full step up at
// text-h1 so a page heading and a section heading stop competing.
export function PageHeader({
  code,
  title,
  titleAs = "h1",
  meta,
  actions,
  back,
  className = "",
}: Props) {
  const TitleTag = titleAs;

  return (
    <div className={cn("flex flex-col gap-4 border-b border-rule pb-6", className)}>
      {back ? (
        <Link
          href={back.href}
          className="inline-flex w-fit items-center gap-1 text-body-sm text-brand transition-colors duration-fast hover:text-brand-solid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
            {/* Points toward the inline start. The page is RTL by default, so
                the bare glyph already points the right way; it flips for an
                LTR locale, same convention as Pagination's chevrons. */}
            <path
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m9 18 6-6-6-6"
              className="ltr:hidden"
            />
            <path
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m15 18-6-6 6-6"
              className="rtl:hidden"
            />
          </svg>
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          {code ? <p className="font-mono text-data text-text-muted">{code}</p> : null}
          <TitleTag className="font-display text-h1 font-black text-text">{title}</TitleTag>
          {meta ? <div className="flex flex-wrap items-center gap-3">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
