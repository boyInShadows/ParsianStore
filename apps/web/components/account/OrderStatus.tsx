import { formatJalali, type OrderStatusDto } from "schemas";
import { Badge } from "@/components/primitives";

// One definition of what an order status looks like. This map was duplicated
// byte-for-byte in orders/page.tsx and orders/[code]/page.tsx.
export const ORDER_STATUS_TONE: Record<OrderStatusDto, "neutral" | "info" | "success" | "danger"> =
  {
    pending: "neutral",
    paid: "info",
    processing: "info",
    shipped: "info",
    delivered: "success",
    cancelled: "danger",
    refunded: "danger",
  };

// The two statuses that END the journey rather than advancing it. The rail
// caps rather than continues at these, which is the difference between "your
// order stopped here" and "your order is still moving".
const TERMINAL_NEGATIVE: ReadonlySet<string> = new Set(["cancelled", "refunded"]);

export function OrderStatusBadge({ status, label }: { status: OrderStatusDto; label: string }) {
  return (
    <Badge tone={ORDER_STATUS_TONE[status]} variant="dot">
      {label}
    </Badge>
  );
}

type HistoryEntry = { status: string; at: string; note?: string | null };

type RailProps = {
  history: HistoryEntry[];
  currentStatus: OrderStatusDto;
  labels: Record<OrderStatusDto, string>;
  // Pre-formatted, pre-translated: this is a Server Component and receives
  // strings, never a t() function.
  currentLabel: string;
};

/**
 * The order timeline, drawn rather than labelled.
 *
 * What this replaces: `<li className="flex gap-3 border-s-2 border-border
 * ps-3">` per entry, which rendered a separate 2px stub beside every row --
 * not a continuous rail, no nodes, and no distinction between what already
 * happened and where the order is now. Seven statuses existed in the schema
 * and the UI expressed them as one gray pill and a stack of disconnected
 * lines.
 *
 * Node shape, not hue, carries the state -- masterPlan §6.3's own principle,
 * the same reason `warning` is outlined rather than filled:
 *   done     -> filled --brand-solid
 *   current  -> filled + a halo ring
 *   stopped  -> --danger, square-capped, and the spine ends
 *
 * Pure CSS, zero client JS: the whole rail is a <ol> of flex columns.
 */
export function OrderStatusRail({ history, currentStatus, labels, currentLabel }: RailProps) {
  const stopped = TERMINAL_NEGATIVE.has(currentStatus);

  return (
    <ol className="flex flex-col">
      {history.map((entry, index) => {
        const isLast = index === history.length - 1;
        const isStopEntry = isLast && stopped;
        const label = labels[entry.status as OrderStatusDto] ?? entry.status;

        // ring-brand-subtle, not `ring-brand-solid/20`: an opacity modifier
        // on these var() colors generates no CSS at all (see tokens.css §6.8).
        const node = isStopEntry
          ? "h-4 w-4 rounded-sm bg-danger"
          : isLast
            ? "h-4 w-4 rounded-full bg-brand-solid ring-4 ring-brand-subtle"
            : "h-4 w-4 rounded-full bg-brand-solid";

        return (
          <li key={`${entry.status}-${index}`} className="flex gap-4">
            <div aria-hidden="true" className="flex flex-col items-center">
              <span className={`mt-1 shrink-0 ${node}`} />
              {isLast ? null : <span className="w-0 flex-1 border-s-2 border-rule" />}
            </div>
            <div className={`flex flex-col gap-1 ${isLast ? "" : "pb-6"}`}>
              <span className="text-body font-medium text-text">
                {label}
                {isLast ? (
                  <span className="ms-2 font-mono text-caption text-text-muted">
                    {currentLabel}
                  </span>
                ) : null}
              </span>
              <time
                dateTime={entry.at}
                className="font-mono text-caption tabular-nums text-text-muted"
              >
                {formatJalali(entry.at, "YYYY/MM/DD - HH:mm")}
              </time>
              {entry.note ? (
                <span className="text-caption text-text-muted">{entry.note}</span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
