import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Label } from "./Label";

/** What a field hands its control: the id its label points at, and the ARIA
 *  that ties the control to whichever message is currently showing. */
export type FieldControlProps = {
  id: string;
  "aria-invalid": boolean | undefined;
  "aria-describedby": string | undefined;
  required: boolean | undefined;
};

type Props = {
  label: string;
  error?: string;
  helperText?: string;
  id?: string;
  required?: boolean;
  className?: string;
  /** Renders the control. Spread the argument onto it -- that is the whole
   *  point of this component. */
  children: (control: FieldControlProps) => ReactNode;
};

/**
 * Label, message, and the ARIA wiring between them and the control.
 *
 * Input, Select and Textarea each carried their own copy of this: generate an
 * id, derive `${id}-error` and `${id}-helper`, join whichever exist into
 * `aria-describedby`, set `aria-invalid`, then render the error *or* the
 * helper. Three copies of a rule with no single place to fix, and the kind
 * that fails quietly -- a field that forgets `aria-describedby` looks
 * completely normal and simply never announces its error.
 *
 * A render prop rather than a wrapper that clones its child: cloning has to
 * guess which element is the control, and gets it wrong the moment a field
 * needs a wrapper div (Select's chevron already does).
 *
 * Error takes precedence over helper text deliberately -- showing both puts
 * the reason a field is rejected next to advice that may now be wrong, and
 * the error is the thing that has to be read.
 */
export function FormField({
  label,
  error,
  helperText,
  id,
  required,
  className = "",
  children,
}: Props) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;
  const describedBy = error ? errorId : helperText ? helperId : undefined;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label htmlFor={fieldId} required={required}>
        {label}
      </Label>
      {children({
        id: fieldId,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        required,
      })}
      {error ? (
        <p id={errorId} role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-body-sm text-text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

/** The border every text-entry control shares, so "this field is wrong" looks
 *  the same whichever control it is. */
export function fieldBorder(error: string | undefined): string {
  return error ? "border-danger" : "border-border";
}
