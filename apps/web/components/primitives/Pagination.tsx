import { toPersianDigits } from "schemas/fa-text";
import { cn } from "@/lib/cn";

type Props = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

// Chevrons encode direction and must flip in RTL -- masterPlan.md §7.2.
function PrevIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
      className="rtl:-scale-x-100"
    >
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m15 18-6-6 6-6"
      />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
      className="rtl:-scale-x-100"
    >
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m9 18 6-6-6-6"
      />
    </svg>
  );
}

export function Pagination({ page, pageCount, onPageChange }: Props) {
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    // flex-wrap + shrink-0 on the buttons: without both, a 5-page bar at
    // 360px squeezed every 48px target down to 41px wide, silently breaking
    // masterPlan §10's 44px floor even though the classes said w-12.
    <nav aria-label="Pagination" className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-40"
      >
        <PrevIcon />
      </button>
      {pages.map((pageNumber) => (
        <button
          key={pageNumber}
          type="button"
          onClick={() => onPageChange(pageNumber)}
          aria-current={pageNumber === page ? "page" : undefined}
          className={cn(
            "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-body-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
            pageNumber === page
              ? "bg-brand-solid text-brand-fg"
              : "text-text hover:bg-surface-raised",
          )}
        >
          {toPersianDigits(String(pageNumber))}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-40"
      >
        <NextIcon />
      </button>
    </nav>
  );
}
