"use client";

import {
  createContext,
  useContext,
  useId,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
  idBase: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) throw new Error(`<Tabs.${component}> must be used inside <Tabs>`);
  return context;
}

type TabsProps = {
  defaultValue: string;
  children: ReactNode;
};

function TabsRoot({ defaultValue, children }: TabsProps) {
  const [value, setValue] = useState(defaultValue);
  const idBase = useId();

  return (
    <TabsContext.Provider value={{ value, setValue, idBase }}>{children}</TabsContext.Provider>
  );
}

function List({ children }: { children: ReactNode }) {
  const { setValue } = useTabsContext("List");

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const triggers = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    );
    const currentIndex = triggers.indexOf(document.activeElement as HTMLButtonElement);
    if (currentIndex === -1) return;

    // Logical previous/next -- masterPlan.md §7.2. In RTL, ArrowRight moves
    // toward the start of the tab order, mirroring reading direction.
    const dir = document.dir === "rtl" ? -1 : 1;
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = currentIndex + dir;
    if (event.key === "ArrowLeft") nextIndex = currentIndex - dir;
    if (nextIndex === null) return;

    event.preventDefault();
    const next = triggers.at(nextIndex % triggers.length);
    next?.focus();
    const nextValue = next?.dataset.value;
    if (nextValue) setValue(nextValue);
  }

  return (
    <div
      role="tablist"
      aria-label="Tabs"
      onKeyDown={handleKeyDown}
      className="flex border-b border-border"
    >
      {children}
    </div>
  );
}

function Trigger({ value, children }: { value: string; children: ReactNode }) {
  const { value: active, setValue, idBase } = useTabsContext("Trigger");
  const selected = active === value;

  return (
    <button
      type="button"
      role="tab"
      id={`${idBase}-tab-${value}`}
      aria-controls={`${idBase}-panel-${value}`}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      data-value={value}
      onClick={() => setValue(value)}
      className={`border-b-2 px-4 py-2 text-body-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none ${
        selected
          ? "border-brand-solid text-text"
          : "border-transparent text-text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function Panel({ value, children }: { value: string; children: ReactNode }) {
  const { value: active, idBase } = useTabsContext("Panel");
  if (active !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${idBase}-panel-${value}`}
      aria-labelledby={`${idBase}-tab-${value}`}
      tabIndex={0}
      className="py-4"
    >
      {children}
    </div>
  );
}

export const Tabs = Object.assign(TabsRoot, { List, Trigger, Panel });
