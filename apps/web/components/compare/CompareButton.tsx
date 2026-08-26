"use client"; // persists cross-page compare picks and opens their shareable URL

import { useState, type MouseEvent } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/primitives";

const STORAGE_KEY = "parsian-compare-products";
const MAX_ITEMS = 4;

export type CompareButtonMessages = {
  add: string;
  open: string;
  limit: string;
};

type Props = { slug: string; messages: CompareButtonMessages };

function readItems(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function CompareButton({ slug, messages }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState(false);
  const [atLimit, setAtLimit] = useState(false);

  function handleClick(event: MouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    event.stopPropagation();
    const items = readItems();
    if (items.includes(slug)) {
      router.push(`/compare?items=${encodeURIComponent(items.join(","))}`);
      return;
    }
    if (items.length >= MAX_ITEMS) {
      setAtLimit(true);
      return;
    }
    const next = [...items, slug];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSelected(true);
    setAtLimit(false);
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={handleClick}
      aria-label={atLimit ? messages.limit : undefined}
      className="w-full border-t border-rule"
    >
      {atLimit ? messages.limit : selected ? messages.open : messages.add}
    </Button>
  );
}
