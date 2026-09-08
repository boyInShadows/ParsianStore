import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  /** Stable, unique id -- becomes the checkbox id the label points at. */
  id: string;
  title: string;
  /** Heading level the title renders as. Pick the one the document needs. */
  as?: "h2" | "h3";
  /** Expanded on first paint below `sm`. Above `sm` the panel is always open. */
  defaultOpen?: boolean;
  /** Extra classes on the heading text, so a caller can set its own scale. */
  titleClassName?: string;
  className?: string;
  children: ReactNode;
};

/**
 * A group that collapses on phones and is always open from `sm` up.
 *
 * ## Why this is a checkbox and not `<details>`
 *
 * `<details>` is the better element and it cannot do this job. The open state
 * is an HTML *attribute*, so it is fixed at render time -- and this page is
 * statically prerendered once for every viewport. There is no CSS that
 * force-opens a closed `<details>` across the browsers this shop has to run
 * in: the pre-`::details-content` engines hide the non-summary children in the
 * UA's own rendering, where author CSS cannot reach. `::details-content` would
 * work on current Chrome, Safari and Firefox and would quietly ship a
 * permanently-collapsed desktop footer to everything older -- including the
 * Android WebViews this audience is disproportionately on.
 *
 * The alternative is a client component reading a media query, which is
 * JavaScript spent on a purely presentational rule, on a route already 6KB
 * over its First Load budget (P14.S6). `:checked` is the oldest trick in CSS
 * and it costs nothing.
 *
 * ## What a screen reader hears
 *
 * A heading, then a checkbox with the same name. Operable by Tab + Space, its
 * state announced. Not the `aria-expanded` a scripted disclosure would give,
 * which is the price of the byte count -- and above `sm` the toggle is inert
 * (`pointer-events: none`) with the panel open, so a desktop reader meets a
 * plain heading followed by its content.
 *
 * The behaviour lives in `styles/globals.css` under `.disclosure`, next to the
 * breakpoint it is keyed to.
 */
export function Disclosure({
  id,
  title,
  as: Heading = "h2",
  defaultOpen = false,
  titleClassName = "",
  className = "",
  children,
}: Props) {
  return (
    <div className={cn("disclosure flex flex-col", className)}>
      {/* Order is load-bearing: the panel and the heading are both later
          siblings of the input, which is what lets `:checked ~` reach them. */}
      <input
        type="checkbox"
        id={id}
        defaultChecked={defaultOpen}
        // `sm:hidden` as well as `sr-only`: an `sr-only` checkbox is still a
        // tab stop, and above `sm` this one controls nothing. Taking it out of
        // the layout takes it out of the tab order.
        className="disclosure-input peer sr-only sm:hidden"
      />
      <Heading className={cn("text-body-sm font-semibold text-text", titleClassName)}>
        <label
          htmlFor={id}
          className="disclosure-heading flex min-h-tap w-full cursor-pointer items-center justify-between gap-2 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus sm:min-h-0 sm:cursor-auto"
        >
          {title}
          <ChevronIcon />
        </label>
      </Heading>
      <div className="disclosure-panel">{children}</div>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
      className="disclosure-chevron shrink-0 text-text-muted"
    >
      <path stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}
