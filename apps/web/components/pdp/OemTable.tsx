import { Card } from "@/components/primitives";

export interface OemTableMessages {
  title: string;
  oemNumbers: string;
  crossRefNumbers: string;
}

type Props = {
  oemNumbers: string[];
  crossRefNumbers: string[];
  messages: OemTableMessages;
};

export function OemTable({ oemNumbers, crossRefNumbers, messages }: Props) {
  if (oemNumbers.length === 0 && crossRefNumbers.length === 0) return null;

  return (
    <Card>
      <h2 className="text-h3 font-semibold text-text">{messages.title}</h2>
      <dl className="mt-3 flex flex-col gap-3">
        {oemNumbers.length > 0 ? (
          <div>
            <dt className="text-caption text-text-muted">{messages.oemNumbers}</dt>
            <dd className="mt-1 flex flex-wrap gap-2 font-mono text-body-sm text-text">
              {oemNumbers.join(" · ")}
            </dd>
          </div>
        ) : null}
        {crossRefNumbers.length > 0 ? (
          <div>
            <dt className="text-caption text-text-muted">{messages.crossRefNumbers}</dt>
            <dd className="mt-1 flex flex-wrap gap-2 font-mono text-body-sm text-text">
              {crossRefNumbers.join(" · ")}
            </dd>
          </div>
        ) : null}
      </dl>
    </Card>
  );
}
