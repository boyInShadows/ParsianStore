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
      className="border-y border-graphite-800 bg-graphite-900"
    >
      <h2 id="trust-strip-heading" className="sr-only">
        {t("title")}
      </h2>
      <Reveal>
        <ul className="mx-auto flex max-w-container flex-col divide-y divide-graphite-800 px-4 sm:flex-row sm:divide-x sm:divide-y-0">
          {items.map((item, index) => (
            <li key={item} className="flex flex-1 items-center gap-3 px-4 py-4 text-graphite-100">
              <span className="font-mono text-caption text-marigold-300">0{index + 1}</span>
              <span className="text-body-sm font-medium">{item}</span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
