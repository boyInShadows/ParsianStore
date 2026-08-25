import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/primitives/ButtonLink";
import { PageHeader } from "@/components/primitives/PageHeader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Info.about");
  return { title: t("title"), description: t("lead") };
}

type Section = { heading: string; body: string };

/**
 * One of the three information pages the footer can finally stop hiding
 * (fableTasks §7 item 10). Everything on it is a fact this codebase already
 * enforces -- two vehicle makes, a fitment-filtered catalogue, OEM code search,
 * the authenticity record where one exists, guest checkout.
 *
 * The four legal pages beside it (/returns /warranty /privacy /terms) are still
 * absent, deliberately. A returns window and warranty terms are commitments
 * only the owner can make, and a plausible-sounding invented one would be worse
 * than a missing page.
 */
export default async function AboutPage() {
  const t = await getTranslations("Info.about");
  const sections = t.raw("sections") as Section[];

  return (
    <main className="mx-auto flex max-w-container flex-col gap-8 px-4 py-8 lg:px-8">
      <PageHeader code="ABOUT" title={t("title")} />
      <p className="max-w-prose text-body-lg text-text">{t("lead")}</p>

      {/* A ruled list, not a card grid: these are four related statements about
          one shop, and boxing each one would imply they are four things to
          choose between. */}
      <div className="flex flex-col border-t border-rule">
        {sections.map((section, index) => (
          <section
            key={section.heading}
            className="grid gap-2 border-b border-rule py-6 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:gap-8"
          >
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-data text-text-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 className="text-body font-bold text-text">{section.heading}</h2>
            </div>
            <p className="max-w-prose text-body text-text-muted">{section.body}</p>
          </section>
        ))}
      </div>

      <ButtonLink href="/contact" variant="outline" className="w-fit">
        {t("contactCta")}
      </ButtonLink>
    </main>
  );
}
