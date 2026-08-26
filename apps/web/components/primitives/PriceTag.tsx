import { formatToman } from "schemas/fa-text";
import { cn } from "@/lib/cn";

type Size = "sm" | "md" | "lg" | "xl";

type Props = {
  priceRial: number;
  compareAtRial?: number | null;
  isWholesale?: boolean;
  // Passed in rather than read from next-intl: this renders inside client
  // trees (/cart) as well as server pages, and a useTranslations() call here
  // would drag the client i18n runtime into every route that shows a price.
  wholesaleLabel?: string;
  size?: Size;
  className?: string;
};

// Money, in one place. masterPlan §6.3 assigns prices to Marigold, but that
// had never been implemented anywhere: --cta fails WCAG as text (2.12:1 on
// --surface), so every price in the app rendered in --text. --price (§6.8)
// is the contrast-safe Marigold that makes the rule buildable, and this
// component is the only thing that should apply it.
//
// Replaces three copy-pasted price+wholesale-badge blocks (ProductCard,
// CartPageContent, PDP), two of which carried a hardcoded `text-[10px]`
// against CLAUDE.md rule 5.
const sizes: Record<Size, string> = {
  sm: "text-data",
  md: "text-body-lg",
  lg: "text-h3",
  xl: "text-display-2",
};

export function PriceTag({
  priceRial,
  compareAtRial,
  isWholesale = false,
  wholesaleLabel,
  size = "md",
  className = "",
}: Props) {
  const hasCompareAt = typeof compareAtRial === "number" && compareAtRial > priceRial;

  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-2", className)}>
      <span className={cn("font-mono font-medium text-price", sizes[size])}>
        {formatToman(priceRial)}
      </span>
      {hasCompareAt ? (
        <s className="font-mono text-caption text-text-muted">{formatToman(compareAtRial)}</s>
      ) : null}
      {isWholesale && wholesaleLabel ? (
        <span className="rounded-full bg-brand-subtle px-2 py-1 text-caption font-medium leading-none text-brand">
          {wholesaleLabel}
        </span>
      ) : null}
    </span>
  );
}
