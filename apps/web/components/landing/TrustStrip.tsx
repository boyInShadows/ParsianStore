import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion";

// masterPlan.md §5 item 02: "Hairline-separated, mono labels, no
// icons-in-circles clichés." divide-x (logical: divide handles both
// directions correctly under dir="rtl" via Tailwind's built-in RTL
// support) draws the hairline separators; no icon glyphs at all.
export async function TrustStrip() {
  const t = await getTranslations("Landing.sections.trustStrip");
  const items = t.raw("items") as string[];

  return (
    <section
      id="trust-strip"
      aria-labelledby="trust-strip-heading"
      className="mx-auto max-w-container px-4 py-8"
    >
      <h2 id="trust-strip-heading" className="sr-only">
        {t("title")}
      </h2>
      <Reveal>
        <ul className="flex flex-col divide-y divide-border border-y border-border sm:flex-row sm:divide-x sm:divide-y-0">
          {items.map((item) => (
            <li key={item} className="flex-1 px-4 py-3 text-center font-mono text-data text-text">
              {item}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
