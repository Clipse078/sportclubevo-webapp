"use client";

import Link from "next/link";
import { useState } from "react";
import { LayoutGrid, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import {
  QuickAccessCustomizer,
  type QuickAccessCustomizeEntry,
} from "./QuickAccessCustomizer";

export type PersonalQuickAccessItem = QuickAccessCustomizeEntry;

type Props = {
  initialItems: PersonalQuickAccessItem[];
  initialActiveKeys: string[];
  customizeCatalog: QuickAccessCustomizeEntry[];
  maxPins: number;
  className?: string;
};

export function PersonalQuickAccess({
  initialItems,
  initialActiveKeys,
  customizeCatalog,
  maxPins,
  className,
}: Props) {
  const t = useTranslations("PersonalDashboard.quickAccess");
  const [items, setItems] = useState(initialItems);
  const [activeKeys, setActiveKeys] = useState(initialActiveKeys);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  if (items.length === 0 && customizeCatalog.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-5",
        className,
      )}
      aria-label={t("sectionAria")}
      data-testid="personal-quick-access"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-2)] text-[var(--sce-primary)]"
            aria-hidden
          >
            <LayoutGrid className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-semibold tracking-tight">{t("title")}</h2>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setCustomizeOpen(true)}
        >
          {t("customize")}
        </Button>
      </div>

      <ul className="-mx-1 flex list-none gap-2 overflow-x-auto px-1 pb-0.5 snap-x snap-mandatory">
        {items.map((item) => (
          <li key={item.key} className="shrink-0 snap-start">
          <Link
            href={item.href}
            className={cn(
              "inline-flex",
              "min-h-[2.75rem] min-w-[7.5rem] max-w-[12rem] items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 no-underline",
              item.kind === "create"
                ? "border-[var(--sce-primary)]/35 bg-[var(--surface)]"
                : "border-[var(--border)] bg-[var(--surface-2)]/60",
              "text-[0.8125rem] font-medium text-[var(--foreground)]",
              "motion-safe:transition-[border-color,background-color] motion-safe:hover:border-[var(--border-strong)] motion-safe:hover:bg-[var(--surface-2)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
            )}
          >
            {item.kind === "create" ? (
              <span className="text-[var(--sce-primary)]" aria-hidden>
                <Plus className="h-3.5 w-3.5" />
              </span>
            ) : null}
            <span className="truncate">{item.label}</span>
          </Link>
          </li>
        ))}
      </ul>

      <QuickAccessCustomizer
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        initialPinnedKeys={activeKeys}
        catalog={customizeCatalog}
        maxPins={maxPins}
        onSaved={({ items: nextItems, activeKeys: nextKeys }) => {
          setItems(nextItems);
          setActiveKeys(nextKeys);
        }}
      />
    </section>
  );
}
