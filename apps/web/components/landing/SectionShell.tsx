import type { ReactNode } from "react";
import { Reveal } from "@/components/motion";

type Props = {
  id: string;
  code: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

// Shared scaffold for every landing section except Hero (own load
// choreography, P4.S2) and Deals (may render nothing at all -- see
// Deals.tsx). Sections 02-14 get their real data-driven content in
// P4.S4/P4.S5; this is the heading-level shell P4.S1 scopes: real Persian
// copy, no fabricated data, ready for each section to fill in `children`.
export function SectionShell({ id, code, title, subtitle, children }: Props) {
  const headingId = `${id}-heading`;

  return (
    <section id={id} aria-labelledby={headingId} className="mx-auto max-w-container px-4 py-12">
      <Reveal className="flex flex-col gap-2">
        <p className="font-mono text-data text-text-muted">{code}</p>
        <h2 id={headingId} className="font-display text-h2 font-black text-text">
          {title}
        </h2>
        {subtitle ? <p className="max-w-2xl text-body text-text-muted">{subtitle}</p> : null}
      </Reveal>
      {children}
    </section>
  );
}
