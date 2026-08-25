import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/primitives/ButtonLink";
import { PageHeader } from "@/components/primitives/PageHeader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Info.faq");
  return { title: t("title"), description: t("lead") };
}

type Item = { question: string; answer: string };

/**
 * Six questions, every answer checkable against behaviour this codebase
 * actually has: two vehicle makes, fitment filtering, OEM code search, guest
 * checkout, weight-and-destination shipping quoted before payment, and reviews
 * gated on a delivered purchase.
 *
 * What is deliberately NOT answered here: returns, warranty terms, and how
 * payment settles. Those are policy rather than behaviour -- the returns window
 * and warranty terms do not exist yet and the live gateway is not activated --
 * so answering them would mean inventing a commitment the shop has not made.
 * They belong to /returns, /warranty and /terms when the owner writes them.
 *
 * `<details>` rather than a JS accordion: collapsible, keyboard operable, and
 * findable by the browser's own in-page search, with no client bundle at all.
 */
export default async function FaqPage() {
  const t = await getTranslations("Info.faq");
  const items = t.raw("items") as Item[];

  return (
    <main className="mx-auto flex max-w-container flex-col gap-8 px-4 py-8 lg:px-8">
      <PageHeader code="FAQ" title={t("title")} />
      <p className="max-w-prose text-body-lg text-text">{t("lead")}</p>

      <div className="flex flex-col border-t border-rule">
        {items.map((item, index) => (
          <details key={item.question} className="group border-b border-rule">
            <summary className="py-5 flex min-h-12 cursor-pointer list-none items-baseline gap-3 text-body font-bold text-text transition-colors duration-fast hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none">
              <span className="font-mono text-data text-text-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="flex-1">{item.question}</span>
              {/* Rotates into a minus when the row opens. Transform only, and
                  the `group-open` variant means no JavaScript decides it. */}
              <span
                aria-hidden="true"
                className="select-none font-mono text-data text-text-muted transition-transform duration-fast group-open:rotate-45 motion-reduce:transition-none"
              >
                +
              </span>
            </summary>
            <p className="pb-5 ps-9 max-w-prose text-body text-text-muted">{item.answer}</p>
          </details>
        ))}
      </div>

      {/* `bg-surface` with a rule rather than `bg-surface-sunken`, which is the
          same value as the page background and would render as no container. */}
      <div className="flex flex-col items-start gap-3 border border-rule bg-surface p-6">
        <h2 className="text-body font-bold text-text">{t("moreTitle")}</h2>
        <p className="max-w-prose text-body text-text-muted">{t("moreBody")}</p>
        <ButtonLink href="/contact" variant="outline">
          {t("moreCta")}
        </ButtonLink>
      </div>
    </main>
  );
}
