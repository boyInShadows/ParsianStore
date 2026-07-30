import type { ProductDetailDto } from "schemas";
import { Card } from "@/components/primitives";

export interface AuthenticityMessages {
  title: string;
  supplyRouteLabel: string;
  supplyRoute: Record<ProductDetailDto["authenticity"]["supplyRoute"], string>;
  sourceBrandLabel: string;
  countryLabel: string;
  verificationCodeLabel: string;
  guideLink: string;
}

type Props = {
  authenticity: ProductDetailDto["authenticity"];
  messages: AuthenticityMessages;
};

// Same real Authenticity Record fields as components/landing/
// AuthenticityStory.tsx (P4.S4), rendered in full here rather than as a
// teaser -- verificationCode is genuinely the same value
// GET /authenticity/verify/:code resolves.
export function AuthenticityPanel({ authenticity, messages }: Props) {
  return (
    <Card>
      <h2 className="text-h3 font-semibold text-text">{messages.title}</h2>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        <Field label={messages.verificationCodeLabel} value={authenticity.verificationCode} mono />
        <Field
          label={messages.supplyRouteLabel}
          value={messages.supplyRoute[authenticity.supplyRoute]}
        />
        <Field label={messages.sourceBrandLabel} value={authenticity.sourceBrand} />
        <Field label={messages.countryLabel} value={authenticity.countryOfManufacture} />
      </dl>
      {authenticity.guideUrl ? (
        <a
          href={authenticity.guideUrl}
          className="mt-3 inline-block text-body-sm text-brand hover:underline"
        >
          {messages.guideLink}
        </a>
      ) : null}
    </Card>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="gap-0.5 flex flex-col">
      <dt className="text-caption text-text-muted">{label}</dt>
      <dd className={`text-body-sm text-text ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
