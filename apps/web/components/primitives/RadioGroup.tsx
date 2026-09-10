import { useId } from "react";
import { cn } from "@/lib/cn";
import { Radio } from "./Radio";

export type RadioOption = {
  value: string;
  label: string;
  /** Sits under the option label -- a delivery method's price and window, a
   *  payment method's caveat. */
  description?: string;
  disabled?: boolean;
};

type Props = {
  /** The shared `name`. Radios are grouped by name, and that grouping is what
   *  gives arrow-key navigation and single-selection for free. */
  name: string;
  legend: string;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  /** Lays the options out side by side. Still wraps. */
  orientation?: "vertical" | "horizontal";
  className?: string;
};

/**
 * A set of mutually exclusive choices, as a real `<fieldset>` with a
 * `<legend>`.
 *
 * The legend is the reason this exists rather than callers stacking `Radio`s:
 * without it a screen reader announces "پرداخت در محل, radio, 1 of 2" and
 * never says what is being chosen. Every hand-rolled radio group in this
 * codebase before now was a `<div>` with a heading, which reads as unrelated
 * text.
 *
 * **No keyboard code here, deliberately.** Native radios sharing a `name`
 * already implement the roving tabindex the ARIA pattern describes: one tab
 * stop for the group, arrows to move and select within it. Writing that by
 * hand would replace working behaviour with a reimplementation of it. The
 * components that genuinely need hand-written keyboard handling are
 * DropdownMenu and Accordion (P11.S4), because no native element does what
 * they do.
 */
export function RadioGroup({
  name,
  legend,
  options,
  value,
  defaultValue,
  onChange,
  error,
  helperText,
  required,
  orientation = "vertical",
  className = "",
}: Props) {
  const generatedId = useId();
  const errorId = `${generatedId}-error`;
  const helperId = `${generatedId}-helper`;
  const describedBy = error ? errorId : helperText ? helperId : undefined;

  return (
    // No `aria-required` here: a <fieldset> maps to role="group", which does
    // not support it -- axe flags it as critical. The requirement is expressed
    // where it actually belongs, on the radios themselves, which also gives
    // native form validation for free.
    <fieldset
      className={cn("flex flex-col gap-2 border-0 p-0", className)}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
    >
      <legend className="mb-1 text-body-sm font-medium text-text">
        {legend}
        {required ? (
          <>
            <span aria-hidden="true" className="ms-1 text-danger">
              *
            </span>
            <span className="sr-only">(الزامی)</span>
          </>
        ) : null}
      </legend>

      <div className={cn("flex gap-3", orientation === "vertical" ? "flex-col" : "flex-wrap")}>
        {options.map((option) => (
          <div key={option.value} className="flex flex-col gap-1">
            <Radio
              name={name}
              value={option.value}
              label={option.label}
              disabled={option.disabled}
              required={required}
              {...(value === undefined
                ? { defaultChecked: defaultValue === option.value }
                : { checked: value === option.value })}
              onChange={(event) => onChange?.(event.target.value)}
            />
            {option.description ? (
              // Indented to the label's text, not the radio -- the description
              // belongs to the option, and starting it under the control reads
              // as a separate item.
              <p className="ms-6 text-body-sm text-text-muted">{option.description}</p>
            ) : null}
          </div>
        ))}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-body-sm text-text-muted">
          {helperText}
        </p>
      ) : null}
    </fieldset>
  );
}
