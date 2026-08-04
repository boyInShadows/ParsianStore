import { toPersianDigits } from "schemas/fa-text";
import { Link } from "@/i18n/navigation";

type Props = {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
  labels: { previous: string; next: string; status: string };
};

// The link-based sibling of Pagination. Pagination takes an onPageChange
// callback, so it is unusable from a Server Component -- which is exactly
// why /orders and /wishlist each hand-rolled the same 22-line prev/next
// block instead. This is that block, once, with real 44px targets and
// Persian digits.
//
// `labels.status` is a pre-formatted string ("صفحه ۲ از ۵") rather than an
// ICU template, matching the pre-translated-messages-as-props convention.
export function LinkPagination({ page, pageCount, hrefFor, labels }: Props) {
  if (pageCount <= 1) return null;

  const hasPrevious = page > 1;
  const hasNext = page < pageCount;

  const linkBase =
    "inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-md px-4 text-body-sm " +
    "transition-colors duration-fast motion-reduce:transition-none " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

  return (
    <nav aria-label={labels.status} className="flex items-center justify-between gap-4 pt-6">
      {hasPrevious ? (
        <Link href={hrefFor(page - 1)} className={`${linkBase} text-brand hover:bg-surface-raised`}>
          {labels.previous}
        </Link>
      ) : (
        <span className={`${linkBase} text-text-muted opacity-40`} aria-hidden="true">
          {labels.previous}
        </span>
      )}
      <span className="font-mono text-caption text-text-muted">
        {toPersianDigits(String(page))} / {toPersianDigits(String(pageCount))}
      </span>
      {hasNext ? (
        <Link href={hrefFor(page + 1)} className={`${linkBase} text-brand hover:bg-surface-raised`}>
          {labels.next}
        </Link>
      ) : (
        <span className={`${linkBase} text-text-muted opacity-40`} aria-hidden="true">
          {labels.next}
        </span>
      )}
    </nav>
  );
}
