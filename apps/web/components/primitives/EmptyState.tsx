import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
  // "p" (default) when this renders inside a page that already has its own
  // h1 elsewhere (e.g. the PLP's "no results" state, under the category
  // name heading). "h1" when this IS the page's entire content -- a 404 or
  // API-down full-page state has no other heading, and axe's
  // page-has-heading-one catches the gap for real (found building the PLP's
  // own not-found/API-down states, P5.S1).
  titleAs?: "p" | "h1";
};

export function EmptyState({ title, description, action, titleAs = "p" }: Props) {
  const TitleTag = titleAs;
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
      <TitleTag className="text-body font-medium text-text">{title}</TitleTag>
      {description ? <p className="text-body-sm text-text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
