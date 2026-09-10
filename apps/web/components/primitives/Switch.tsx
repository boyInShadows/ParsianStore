import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role"> & {
  label: string;
  /** Sits under the label, for the "what does turning this on actually do"
   *  sentence a toggle usually needs. */
  helperText?: string;
};

/**
 * An on/off toggle for a setting that takes effect immediately.
 *
 * A real `<input type="checkbox" role="switch">`, not a `<button>` carrying
 * `aria-checked`. The checkbox is what makes it participate in a form, submit
 * its value, restore on back-navigation and respond to Space without a
 * keydown handler; `role="switch"` is the one thing it does not give, and is
 * a single attribute. A button-based switch has to reimplement all of the
 * above and typically reimplements some of it wrong.
 *
 * **The control is 48x48 and the switch you can see is 48x24 drawn inside
 * it.** masterPlan §10 floors touch targets at 44px, and a bare 24px-tall
 * track misses that. The first attempt kept a small track and tried to
 * enlarge the hit region with a transparent `::before` overhang — which
 * renders but does not extend hit testing on a form control, proven by a test
 * that clicked 8px above the track and toggled nothing. So the input's own
 * box is the target, `::before` is the track, `::after` is the thumb, and the
 * focus ring goes on the track rather than the invisible box around it.
 *
 * Every length below names a step that exists in this repo's spacing scale
 * (4 8 12 16 24 32 48 …). `theme.spacing` is a *replace*, so `w-11` — which
 * this component was first written with — emits no CSS at all and the element
 * silently collapses. Track 48 wide, thumb 16, 8px inset: off at 8, on at 24.
 */
export function Switch({ label, helperText, id, className = "", ...rest }: Props) {
  const generatedId = useId();
  const switchId = id ?? generatedId;
  const helperId = `${switchId}-helper`;

  return (
    <div className="flex items-start gap-2">
      <input
        id={switchId}
        type="checkbox"
        role="switch"
        aria-describedby={helperText ? helperId : undefined}
        className={cn(
          "group relative h-12 w-12 shrink-0 cursor-pointer appearance-none bg-transparent",
          "focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // The track.
          "before:absolute before:inset-x-0 before:top-1/2 before:h-6 before:-translate-y-1/2",
          "before:rounded-full before:border before:border-border before:bg-surface-sunken before:content-['']",
          "before:transition-colors before:duration-fast motion-reduce:before:transition-none",
          "checked:before:border-brand-solid checked:before:bg-brand-solid",
          // The focus ring belongs to the track, not to the 48x48 box -- a
          // ring around the box would float away from the thing it is marking.
          "focus-visible:before:ring-2 focus-visible:before:ring-focus focus-visible:before:ring-offset-2 focus-visible:before:ring-offset-bg",
          // The thumb. `start-*` is logical, so "on" travels left in RTL and
          // right in LTR without a second rule (CLAUDE.md rule 6).
          "after:absolute after:top-1/2 after:h-4 after:w-4 after:-translate-y-1/2 after:rounded-full",
          "after:bg-surface after:shadow-sm after:content-['']",
          "after:transition-[inset-inline-start] after:duration-fast motion-reduce:after:transition-none",
          "after:start-2 checked:after:start-6",
          className,
        )}
        {...rest}
      />
      <div className="flex flex-col gap-1 pt-3">
        <label htmlFor={switchId} className="cursor-pointer text-body text-text">
          {label}
        </label>
        {helperText ? (
          <p id={helperId} className="text-body-sm text-text-muted">
            {helperText}
          </p>
        ) : null}
      </div>
    </div>
  );
}
