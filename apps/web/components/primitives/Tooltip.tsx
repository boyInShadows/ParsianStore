import { useId, type ReactElement } from "react";
import { cloneElement } from "react";

type Props = {
  label: string;
  children: ReactElement<{ "aria-describedby"?: string }>;
};

// CSS-only (group-hover/group-focus-within), no positioning library --
// shows on hover AND keyboard focus so it's reachable without a mouse.
export function Tooltip({ label, children }: Props) {
  const tooltipId = useId();

  return (
    <span className="group relative inline-flex">
      {cloneElement(children, { "aria-describedby": tooltipId })}
      <span
        id={tooltipId}
        role="tooltip"
        // `start-1/2` resolves to `right: 50%` under RTL (logical property),
        // which anchors from the opposite physical edge than in LTR -- the
        // centering transform has to flip sign to match (raw `translate`
        // has no logical equivalent in CSS, so this needs an explicit
        // rtl: override; masterPlan.md §7.2).
        className="pointer-events-none absolute bottom-full start-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-graphite-900 px-2 py-1 text-caption text-graphite-0 opacity-0 transition-opacity duration-fast group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none rtl:translate-x-1/2"
      >
        {label}
      </span>
    </span>
  );
}
