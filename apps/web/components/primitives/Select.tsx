import type { ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { FormField, fieldBorder } from "./FormField";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  helperText?: string;
  children: ReactNode;
};

export function Select({ label, error, helperText, id, className = "", children, ...rest }: Props) {
  return (
    <FormField label={label} error={error} helperText={helperText} id={id} required={rest.required}>
      {(field) => (
        // The wrapper is why FormField is a render prop rather than something
        // that clones its child: the control is not the outermost element here.
        <div className="relative">
          {/* `pe-9` stood here and generated NO CSS: the spacing scale is
              REPLACED (0 1 2 3 4 6 8 12 16 20 24 32), so `9` is not a step and
              the utility silently compiled to nothing -- leaving the chevron,
              which is absolutely positioned at `end-3`, sitting on top of the
              option text of every select in the app. `pe-8` is 32px, which
              clears the 16px glyph plus its 12px inset.

              `min-h-12` is 48px: P14.S6 asks for a 48px control on the
              find-my-part path, and `py-2` + a 16px/1.75 line box only reached
              44. Applied here rather than at the call site so the vehicle
              selector in the header modal gets it too. */}
          <select
            {...field}
            className={cn(
              "min-h-12 w-full appearance-none rounded-md border bg-surface py-2 pe-8 ps-3 text-body text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50",
              fieldBorder(error),
              className,
            )}
            {...rest}
          >
            {children}
          </select>
          <ChevronIcon className="pointer-events-none absolute inset-y-0 end-3 my-auto text-text-muted" />
        </div>
      )}
    </FormField>
  );
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}
