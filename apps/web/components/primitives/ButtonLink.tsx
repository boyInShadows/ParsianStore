import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { buttonBase, buttonSizes, buttonVariants } from "./Button";

type Props = {
  href: string;
  variant?: "brand" | "cta" | "ghost" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  children: ReactNode;
  className?: string;
};

// Button renders a <button>, so any call site needing a navigation target
// styled as a button had to re-implement the variant inline -- /cart's
// checkout CTA hand-wrote `rounded-md bg-cta px-4 py-2 ... hover:opacity-90`,
// which then silently drifted from the real `cta` variant.
//
// A sibling component rather than an `as` prop on Button: it keeps Button's
// props honestly typed to ButtonHTMLAttributes, and the two share their
// class strings so they cannot diverge again.
export function ButtonLink({
  href,
  variant = "brand",
  size = "md",
  children,
  className = "",
}: Props) {
  return (
    <Link
      href={href}
      className={`${buttonBase} ${buttonSizes[size]} ${buttonVariants[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
