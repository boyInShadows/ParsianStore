import { getTranslations } from "next-intl/server";
import { toPersianDigits } from "schemas";
import { Reveal } from "@/components/motion";

// masterPlan.md §5 item 11: "Numbering is legitimate here -- it *is* a
// sequence." Real numbered steps (not just visual, actual <ol>), no data
// dependency -- pure process copy.
export async function HowItWorks() {
  const t = await getTranslations("Landing.sections.howItWorks");
  const steps = t.raw("steps") as string[];

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="mx-auto max-w-container px-4 py-12"
    >
      <Reveal className="flex flex-col gap-2">
        <p className="font-mono text-data text-text-muted">{t("code")}</p>
        <h2 id="how-it-works-heading" className="font-display text-h2 font-black text-text">
          {t("title")}
        </h2>
        <p className="max-w-2xl text-body text-text-muted">{t("subtitle")}</p>
      </Reveal>
      <ol className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step} className="flex flex-col gap-2 rounded-lg border border-border p-4">
            <span className="font-mono text-data text-brand">
              {toPersianDigits(String(index + 1).padStart(2, "0"))}
            </span>
            <span className="text-body-sm text-text">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
