import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { toPersianDigits } from "schemas";
import { routing } from "@/i18n/routing";
import { absoluteUrl, hreflangAlternates, localizedPath } from "@/lib/seo";
import { fetchMakeRoute } from "@/lib/fetchers/vehicles";
import { Breadcrumb, EmptyState } from "@/components/primitives";

type Props = {
  params: Promise<{ locale: (typeof routing.locales)[number]; make: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, make } = await params;
  const result = await fetchMakeRoute(make);
  if (!result.ok) return {};

  const t = await getTranslations({ locale, namespace: "VehicleMakePage" });
  const path = `/vehicle/${make}`;
  return {
    title: t("metaTitle", { make: result.data.make.name.fa }),
    description: t("metaDescription", { make: result.data.make.name.fa }),
    alternates: {
      canonical: absoluteUrl(localizedPath(locale, path)),
      languages: hreflangAlternates(path),
    },
  };
}

/**
 * The index for one make -- every model the shop covers, and every generation
 * of it that has a page.
 *
 * It exists because the footer's vehicle column pointed here from the start
 * and nothing answered: `/vehicle/[make]` was never a route, so both entries
 * 404'd (P9.S15, the same class of dead link the 2026-08-14 audit found one
 * level down at `/vehicle/[make]/[model]`).
 *
 * Deliberately not a card grid. A coverage list is what this page is: model on
 * the start side, its generations as mono year links on the end side, ruled
 * rows rather than boxes -- the reader is scanning for their own car and the
 * years are the thing that identifies it. A model whose generations are not
 * seeded yet stays in the list as plain text, because the shop does cover it
 * and a link that 404s would be worse than no link at all.
 */
export default async function VehicleMakePage({ params }: Props) {
  const { locale, make } = await params;
  const result = await fetchMakeRoute(make);
  if (!result.ok && result.reason === "not-found") notFound();

  const t = await getTranslations("VehicleMakePage");
  const tCatalog = await getTranslations("Catalog");

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-container px-4 py-16">
        <EmptyState
          titleAs="h1"
          title={tCatalog("apiDown.title")}
          description={tCatalog("apiDown.description")}
        />
      </main>
    );
  }

  const { make: makeData, models } = result.data;
  const covered = models.filter(({ generations }) => generations.length > 0);
  const generationCount = models.reduce((total, { generations }) => total + generations.length, 0);

  return (
    <main className="mx-auto max-w-container px-4 py-8">
      <Breadcrumb
        items={[
          { label: tCatalog("breadcrumbHome"), href: localizedPath(locale, "/") },
          { label: makeData.name.fa },
        ]}
      />

      <header className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-rule bg-brand-subtle p-6 sm:p-8">
          <p className="font-mono text-caption text-brand">{t("eyebrow")}</p>
          <h1 className="mt-2 font-display text-h1 font-black text-text">
            {t("title", { make: makeData.name.fa })}
          </h1>
          <p className="mt-3 max-w-3xl text-body text-text-muted">
            {t("description", { make: makeData.name.fa })}
          </p>
        </div>
        {/* Two counts, both read off the tree that renders below -- they
            describe this page's own contents rather than making a claim about
            the catalogue that nothing here backs up. */}
        <dl className="grid gap-4 p-6 sm:grid-cols-2">
          <div>
            <dt className="text-caption text-text-muted">{t("modelsLabel")}</dt>
            <dd className="font-bold text-text">{toPersianDigits(String(models.length))}</dd>
          </div>
          <div>
            <dt className="text-caption text-text-muted">{t("generationsLabel")}</dt>
            <dd className="font-bold text-text">{toPersianDigits(String(generationCount))}</dd>
          </div>
        </dl>
      </header>

      <section className="mt-8" aria-labelledby="models-heading">
        <div className="mb-2 border-b border-rule pb-3">
          <h2 id="models-heading" className="font-display text-h2 font-black text-text">
            {t("modelsTitle")}
          </h2>
          <p className="mt-1 text-body-sm text-text-muted">{t("modelsHint")}</p>
        </div>

        {covered.length === 0 ? (
          <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
        ) : (
          <ul>
            {models.map(({ model, generations }) => (
              <li
                key={model.id}
                className="flex flex-col gap-2 border-b border-rule py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
              >
                <h3 className="text-body font-bold text-text">{model.name.fa}</h3>
                {generations.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {generations.map((generation) => (
                      <li key={generation.id}>
                        {/* The year is the route segment and the label both --
                            generations have no slug, so `yearFrom` is the
                            stable natural key (see fetchVehicleRoute). */}
                        <a
                          href={localizedPath(
                            locale,
                            `/vehicle/${makeData.slug}/${model.slug}/${generation.yearFrom}`,
                          )}
                          className="inline-flex min-h-12 items-center gap-2 rounded-md border border-border px-3 text-body-sm text-text-muted transition-colors hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
                        >
                          <span>{generation.name.fa}</span>
                          <span className="font-mono text-caption">
                            {toPersianDigits(String(generation.yearFrom))}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-body-sm text-text-muted opacity-60">{t("noGeneration")}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
