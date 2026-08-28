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
          <select
            {...field}
            className={cn(
              "pe-9 w-full appearance-none rounded-md border bg-surface py-2 ps-3 text-body text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50",
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
