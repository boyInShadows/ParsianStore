import { cn } from "@/lib/cn";

type Size = "sm" | "md" | "lg";

const sizes: Record<Size, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  // 8 = 32px. There is no 10 step in this repo's spacing scale.
  lg: "h-8 w-8 border-4",
};

type Props = {
  size?: Size;
  className?: string;
  /**
   * Announced to assistive technology. Pass `null` when the spinner sits
   * inside something that already says it is busy -- a Button with
   * `aria-busy`, say -- so the state is not announced twice.
   */
  label?: string | null;
};

/**
 * A busy indicator.
 *
 * A bordered box with one transparent edge, spun -- not an SVG with an
 * animated stroke. It renders identically at any size without a viewBox to
 * keep in sync, and `border-current` means it inherits the colour of whatever
 * it sits in, so it works on a filled Button and on a plain surface without
 * a variant prop.
 *
 * Under `prefers-reduced-motion` the spin becomes a fade. Dropping the
 * animation entirely would honour the preference and remove the only signal
 * that anything is happening; an opacity pulse is not motion in the sense the
 * preference means. `cn()` resolves the two `animate-*` classes last-wins, so
 * the variant genuinely replaces the spin rather than layering on it.
 */
export function Spinner({ size = "md", className = "", label = "در حال بارگذاری" }: Props) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-hidden={label ? undefined : true}
      className={cn("inline-flex", className)}
    >
      <span
        className={cn(
          "inline-block animate-spin rounded-full border-current border-e-transparent align-[-0.125em]",
          "motion-reduce:animate-pulse",
          sizes[size],
        )}
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
