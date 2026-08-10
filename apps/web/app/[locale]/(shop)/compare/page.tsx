import type { Metadata } from "next";
import { cookies } from "next/headers";
import { formatToman, type ProductDetailDto } from "schemas";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { fetchProductDetailBySlug } from "@/lib/fetchers/catalog";
import { EmptyState } from "@/components/primitives";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Compare");
  return { title: t("title"), robots: { index: false, follow: false } };
}

function parseSlugs(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value[0] : value;
  return [
    ...new Set(
      (raw ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, 4);
}

function withoutSlug(products: ProductDetailDto[], slug: string): string {
  return products
    .filter((product) => product.slug !== slug)
    .map((product) => product.slug)
    .join(",");
}

export default async function ComparePage({ searchParams }: Props) {
  const t = await getTranslations("Compare");
  const slugs = parseSlugs((await searchParams).items);
  const cookieHeader = (await cookies()).toString();
  const results = await Promise.all(
    slugs.map((slug) => fetchProductDetailBySlug(slug, cookieHeader)),
  );
  const products = results.flatMap((result) => (result.ok ? [result.data] : []));

  if (products.length === 0) {
    return (
      <main className="mx-auto max-w-container px-4 py-16">
        <EmptyState
          titleAs="h1"
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={<Link href="/">{t("browse")}</Link>}
        />
      </main>
    );
  }

  const attributeKeys = [
    ...new Set(products.flatMap((product) => product.attributes.map((item) => item.key))),
  ];

  return (
    <main className="mx-auto max-w-container px-4 py-8">
      <header className="border-b border-rule pb-4">
        <h1 className="font-display text-h1 font-black text-text">{t("title")}</h1>
        <p className="mt-2 text-body text-text-muted">
          {t("description", { count: products.length })}
        </p>
      </header>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
        <table className="min-w-full border-collapse text-body-sm">
          <thead>
            <tr className="border-b border-rule align-top">
              <th
                scope="col"
                className="sticky start-0 z-10 min-w-32 bg-surface p-4 text-start text-text-muted"
              >
                {t("feature")}
              </th>
              {products.map((product) => (
                <th key={product.id} scope="col" className="min-w-56 p-4 text-start font-normal">
                  {product.media[0] ? (
                    <img
                      src={product.media[0]}
                      alt=""
                      className="mb-3 aspect-square w-full rounded-lg object-contain"
                    />
                  ) : null}
                  <Link
                    href={`/p/${product.slug}`}
                    className="font-bold text-brand hover:underline"
                  >
                    {product.name.fa}
                  </Link>
                  <Link
                    href={`/compare?items=${encodeURIComponent(withoutSlug(products, product.slug))}`}
                    className="mt-2 block text-caption text-danger hover:underline"
                  >
                    {t("remove")}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            <CompareRow
              label={t("price")}
              values={products.map((item) => formatToman(item.priceRial))}
            />
            <CompareRow
              label={t("stock")}
              values={products.map((item) => (item.stock > 0 ? t("inStock") : t("outOfStock")))}
            />
            <CompareRow
              label={t("brand")}
              values={products.map((item) => item.brand?.name.fa ?? t("unknown"))}
            />
            <CompareRow
              label={t("category")}
              values={products.map((item) => item.category?.name.fa ?? t("unknown"))}
            />
            <CompareRow label={t("sku")} values={products.map((item) => item.sku)} />
            <CompareRow
              label={t("oem")}
              values={products.map((item) => item.oemNumbers.join("، ") || t("unknown"))}
            />
            <CompareRow label={t("warranty")} values={products.map((item) => item.warranty.text)} />
            <CompareRow
              label={t("weight")}
              values={products.map((item) => t("weightValue", { value: item.weightGram }))}
            />
            {attributeKeys.map((key) => {
              const exemplar = products
                .flatMap((product) => product.attributes)
                .find((item) => item.key === key);
              return (
                <CompareRow
                  key={key}
                  label={exemplar?.keyLabel ?? key}
                  values={products.map((product) => {
                    const attribute = product.attributes.find((item) => item.key === key);
                    return attribute
                      ? `${attribute.value}${attribute.unit ? ` ${attribute.unit}` : ""}`
                      : "—";
                  })}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function CompareRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr>
      <th
        scope="row"
        className="sticky start-0 z-10 bg-surface-sunken p-4 text-start font-medium text-text"
      >
        {label}
      </th>
      {values.map((value, index) => (
        <td key={`${label}-${index}`} className="p-4 text-text">
          {value}
        </td>
      ))}
    </tr>
  );
}
