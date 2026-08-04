import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

type Tone = "surface" | "sunken";

type SheetProps = {
  tone?: Tone;
  children: ReactNode;
  className?: string;
};

/**
 * Sheet -- the document/list container, deliberately distinct from `Card`.
 *
 * **Card = one entity you could click through to** (a saved vehicle, a
 * product, an address). **Sheet = a document, or a homogeneous list of rows
 * belonging to one document.** Never nest a Card inside a Sheet.Row.
 *
 * This distinction is the fix for the single biggest finding of the design
 * pass: `rounded-lg border border-border bg-surface p-4` appeared 20 times
 * across the storefront -- order rows, address rows, cart lines, checkout
 * options, three different money summaries -- so every list read as N
 * identical boxes with no hierarchy between the container and its contents.
 * A Sheet is ONE bordered container whose rows are separated by --rule, the
 * lighter divider token added in §6.8 for exactly this.
 */
const tones: Record<Tone, string> = {
  surface: "bg-surface border-border",
  sunken: "bg-surface-sunken border-border",
};

export function Sheet({ tone = "surface", children, className = "" }: SheetProps) {
  return (
    <div className={`overflow-hidden rounded-lg border ${tones[tone]} ${className}`}>
      {children}
    </div>
  );
}

type SheetHeaderProps = {
  title: string;
  // Mono record code, the docket grammar SectionShell already established
  // for landing sections (`SYS-04`). Optional -- not every sheet is a record.
  code?: string;
  actions?: ReactNode;
  titleAs?: "h2" | "h3";
};

function SheetHeader({ title, code, actions, titleAs = "h3" }: SheetHeaderProps) {
  const TitleTag = titleAs;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3">
      <div className="flex flex-col gap-1">
        {code ? <span className="font-mono text-caption text-text-muted">{code}</span> : null}
        <TitleTag className="text-h3 font-bold text-text">{title}</TitleTag>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

function SheetRows({ children, className = "" }: { children: ReactNode; className?: string }) {
  // divide-rule, not a border on every child -- one hairline between rows,
  // none above the first or below the last, which is what makes a ruled
  // sheet read as a sheet instead of a stack of boxes.
  return <ul className={`divide-y divide-rule ${className}`}>{children}</ul>;
}

type SheetRowProps = {
  children: ReactNode;
  href?: string;
  className?: string;
};

// The interactive state for every row in the app, defined once. The old
// hand-rolled rows had `hover:border-brand-solid` and nothing else -- no
// focus ring on a card-sized link target, no active state.
const interactiveRow =
  "group relative flex w-full items-center gap-4 px-4 py-3 text-start " +
  "transition-colors duration-fast motion-reduce:transition-none " +
  "hover:bg-surface-raised active:bg-surface-sunken " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus " +
  // Inline-start marker that grows in on hover/focus. Logical inset (start-0)
  // so it lands on the correct edge in RTL without an override.
  "before:absolute before:bottom-0 before:start-0 before:top-0 before:w-0 before:bg-brand-solid " +
  "before:transition-all before:duration-fast motion-reduce:before:transition-none " +
  // w-1 (4px, --space-1), not an arbitrary px value -- CLAUDE.md rule 5
  // covers spacing, not just color.
  "hover:before:w-1 focus-visible:before:w-1";

function SheetRow({ children, href, className = "" }: SheetRowProps) {
  if (href) {
    return (
      <li>
        <Link href={href} className={`${interactiveRow} ${className}`}>
          {children}
        </Link>
      </li>
    );
  }
  return <li className={`flex items-center gap-4 px-4 py-3 ${className}`}>{children}</li>;
}

Sheet.Header = SheetHeader;
Sheet.Rows = SheetRows;
Sheet.Row = SheetRow;
