import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { FormField, fieldBorder } from "./FormField";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  helperText?: string;
};

export function Textarea({ label, error, helperText, id, className = "", ...rest }: Props) {
  return (
    <FormField label={label} error={error} helperText={helperText} id={id} required={rest.required}>
      {(field) => (
        <textarea
          {...field}
          className={cn(
            "min-h-24 rounded-md border bg-surface px-3 py-2 text-body text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50",
            fieldBorder(error),
            className,
          )}
          {...rest}
        />
      )}
    </FormField>
  );
}
