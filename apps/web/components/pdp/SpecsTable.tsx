import { toPersianDigits } from "schemas";
import type { ProductDetailDto } from "schemas";
import { Card } from "@/components/primitives";

export interface SpecsMessages {
  title: string;
  weight: string;
  dimensions: string;
  warranty: string;
}

type Props = {
  attributes: ProductDetailDto["attributes"];
  weightGram: number;
  dimensions: ProductDetailDto["dimensions"];
  warranty: ProductDetailDto["warranty"];
  messages: SpecsMessages;
};

export function SpecsTable({ attributes, weightGram, dimensions, warranty, messages }: Props) {
  const dimensionsText = `${toPersianDigits(dimensions.lengthMm)} × ${toPersianDigits(
    dimensions.widthMm,
  )} × ${toPersianDigits(dimensions.heightMm)}`;

  return (
    <Card>
      <h2 className="text-h3 font-semibold text-text">{messages.title}</h2>
      <dl className="mt-3 flex flex-col divide-y divide-border">
        <Row label={messages.weight} value={toPersianDigits(weightGram)} />
        <Row label={messages.dimensions} value={dimensionsText} />
        <Row label={messages.warranty} value={warranty.text} />
        {attributes.map((attribute) => (
          <Row
            key={attribute.key}
            label={attribute.keyLabel}
            value={attribute.unit ? `${attribute.value} ${attribute.unit}` : attribute.value}
          />
        ))}
      </dl>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-body-sm">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-text">{value}</dd>
    </div>
  );
}
