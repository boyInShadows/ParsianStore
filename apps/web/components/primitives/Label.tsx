import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode;
  /** Marks the field as required. Renders a visible asterisk *and* an
   *  off-screen word, because an asterisk alone is punctuation to a screen
   *  reader -- and `aria-required` on the control says the same thing to AT
   *  but nothing at all to a sighted user. */
  required?: boolean;
};

export function Label({ children, required = false, className = "", ...rest }: Props) {
  return (
    <label className={cn("text-body-sm font-medium text-text", className)} {...rest}>
      {children}
      {required ? (
        <>
          <span aria-hidden="true" className="ms-1 text-danger">
            *
          </span>
          <span className="sr-only">(الزامی)</span>
        </>
      ) : null}
    </label>
  );
}
