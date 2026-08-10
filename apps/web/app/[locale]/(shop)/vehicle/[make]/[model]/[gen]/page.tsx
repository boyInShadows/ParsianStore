import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { buildVehicleKey } from "schemas";
import { getMessages, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { absoluteUrl, hreflangAlternates, localizedPath } from "@/lib/seo";
import { fetchCatalogProducts } from "@/lib/fetchers/catalog";
import { fetchVehicleRoute } from "@/lib/fetchers/vehicles";
import { Breadcrumb, EmptyState } from "@/components/primitives";
import { ProductGrid } from "@/components/plp/ProductGrid";

type Props = {
  params: Promise<{
    locale: (typeof routing.locales)[number];
    make: string;
    model: string;
    gen: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, make, model, gen } = await params;
  const vehicle = await fetchVehicleRoute(make, model, gen);
  if (!vehicle.ok) return {};
  const t = await getTranslations({ locale, namespace: "VehiclePage" });
  const name = `${vehicle.data.make.name.fa} ${vehicle.data.model.name.fa}`;
  const path = `/vehicle/${make}/${model}/${gen}`;
  return {
    title: t("metaTitle", { vehicle: name }),
    description: t("metaDescription", { vehicle: name, year: vehicle.data.generation.yearFrom }),
    alternates: {
      canonical: absoluteUrl(localizedPath(locale, path)),
      languages: hreflangAlternates(path),
    },
  };
}

export default async function VehiclePage({ params }: Props) {
  const { locale, make, model, gen } = await params;
  const vehicle = await fetchVehicleRoute(make, model, gen);
  if (!vehicle.ok && vehicle.reason === "not-found") notFound();

  const t = await getTranslations("VehiclePage");
  const messages = await getMessages();
  const catalog = messages.Catalog as {
    breadcrumbHome: string;
    apiDown: { title: string; description: string };
    grid: {
      loadMore: string;
      loading: string;
      emptyTitle: string;
      emptyDescription: string;
      clearFilters: string;
    };
    product: {
      inStock: string;
      outOfStock: string;
      noPhoto: string;
      wholesalePriceBadge: string;
      wishlist: { add: string; remove: string; error: string };
      compare: { add: string; open: string; limit: string };
    };
  };

  if (!vehicle.ok) {
    return (
      <main className="mx-auto max-w-container px-4 py-16">
        <EmptyState
          titleAs="h1"
          title={catalog.apiDown.title}
          description={catalog.apiDown.description}
        />
      </main>
    );
  }

  const { make: makeData, model: modelData, generation } = vehicle.data;
  const vehicleKey = buildVehicleKey({
    makeId: makeData.id,
    modelId: modelData.id,
    genId: generation.id,
    year: generation.yearFrom,
  });
  const products = await fetchCatalogProducts(
    { vehicle: vehicleKey, sort: "newest", limit: 24 },
    (await cookies()).toString(),
  );
  const vehicleName = `${makeData.name.fa} ${modelData.name.fa}`;
  const yearRange = generation.yearTo
    ? t("yearRange", { from: generation.yearFrom, to: generation.yearTo })
    : t("yearFrom", { from: generation.yearFrom });

  if (!products.ok) {
    return (
      <main className="mx-auto max-w-container px-4 py-16">
        <EmptyState
          titleAs="h1"
          title={catalog.apiDown.title}
          description={catalog.apiDown.description}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-container px-4 py-8">
      <Breadcrumb
        items={[
          { label: catalog.breadcrumbHome, href: localizedPath(locale, "/") },
          { label: makeData.name.fa },
          { label: modelData.name.fa },
          { label: generation.name.fa },
        ]}
      />
      <header className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-rule bg-brand-subtle p-6 sm:p-8">
          <p className="font-mono text-caption text-brand">{yearRange}</p>
          <h1 className="mt-2 font-display text-h1 font-black text-text">
            {t("title", { vehicle: vehicleName })}
          </h1>
          <p className="mt-3 max-w-3xl text-body text-text-muted">
            {t("description", { vehicle: vehicleName, generation: generation.name.fa })}
          </p>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-3">
          <div>
            <p className="text-caption text-text-muted">{t("makeLabel")}</p>
            <p className="font-bold text-text">{makeData.name.fa}</p>
          </div>
          <div>
            <p className="text-caption text-text-muted">{t("modelLabel")}</p>
            <p className="font-bold text-text">{modelData.name.fa}</p>
          </div>
          <div>
            <p className="text-caption text-text-muted">{t("generationLabel")}</p>
            <p className="font-bold text-text">{generation.name.fa}</p>
          </div>
        </div>
      </header>

      <section className="mt-8">
        <div className="mb-4 border-b border-rule pb-3">
          <h2 className="font-display text-h2 font-black text-text">{t("productsTitle")}</h2>
          <p className="mt-1 text-body-sm text-text-muted">{t("productsHint")}</p>
        </div>
        <ProductGrid
          clearFiltersHref={`/vehicle/${make}/${model}/${gen}`}
          products={products.data.data}
          nextCursor={products.data.nextCursor}
          filters={{ vehicle: vehicleKey, sort: "newest", limit: 24 }}
          hasActiveFilters={false}
          messages={{
            loadMore: catalog.grid.loadMore,
            loading: catalog.grid.loading,
            emptyTitle: t("emptyTitle"),
            emptyDescription: t("emptyDescription", { vehicle: vehicleName }),
            clearFilters: catalog.grid.clearFilters,
            product: catalog.product,
          }}
        />
      </section>
    </main>
  );
}
