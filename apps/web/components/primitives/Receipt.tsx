import type { ReactNode } from "react";
import { DataRow } from "./DataRow";

type Props = {
  title: string;
  code?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * Receipt -- the money surface.
 *
 * Before this, the same conceptual object was styled three different ways:
 * a naked `border-t` on /cart, a `rounded-lg border p-4` box on /checkout,
 * and a third variant on the order detail page. None of them looked like
 * money, and none of them looked like each other.
 *
 * Recessed (--surface-sunken, §6.8) rather than raised: a total is the
 * bottom of a document, not a card floating above it. Internal divisions
 * use --rule; the grand total is the one place --price appears at h2.
 */
export function Receipt({ title, code, children, footer, className = "" }: Props) {
  return (
    <section
      aria-label={title}
      className={`rounded-lg border border-border bg-surface-sunken ${className}`}
    >
      <div className="flex flex-col gap-1 border-b border-rule px-6 py-4">
        {code ? <span className="font-mono text-caption text-text-muted">{code}</span> : null}
        <h2 className="text-h3 font-bold text-text">{title}</h2>
      </div>
      <div className="flex flex-col gap-3 px-6 py-4">{children}</div>
      {footer ? <div className="border-t border-rule px-6 py-4">{footer}</div> : null}
    </section>
  );
}

// Re-exported so a call site reads as the document it is building:
// <Receipt.Line label=… value=… /> then <Receipt.Total label=… value=… />.
Receipt.Line = DataRow;

function ReceiptTotal({ label, value }: { label: ReactNode; value: ReactNode }) {
  return <DataRow label={label} value={value} emphasis="total" />;
}

Receipt.Total = ReceiptTotal;
