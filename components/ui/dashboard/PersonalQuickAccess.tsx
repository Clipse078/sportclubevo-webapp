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
        "border-y border-[color-mix(in_srgb,var(--border)_65%,transparent)] py-2.5 sm:py-3",
        className,
      )}
      aria-label={t("sectionAria")}
      data-testid="personal-quick-access"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--sce-primary)]"
            aria-hidden
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-[0.8125rem] font-semibold tracking-tight text-[var(--foreground)]">
            {t("title")}
          </h2>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-7 px-2 text-[0.75rem]"
          onClick={() => setCustomizeOpen(true)}
        >
          {t("customize")}
        </Button>
      </div>

      <ul className="flex list-none flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className={cn(
                "inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-[var(--radius-md)] border px-2.5 py-1.5 no-underline",
                item.kind === "create"
                  ? "border-[color-mix(in_srgb,var(--sce-primary)_40%,var(--border))] bg-[color-mix(in_srgb,var(--sce-primary)_6%,var(--surface))]"
                  : "border-[var(--border)] bg-[var(--surface)]/80",
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
              <span>{item.label}</span>
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
