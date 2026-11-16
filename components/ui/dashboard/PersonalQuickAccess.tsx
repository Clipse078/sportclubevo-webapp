"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { NavDestinationSceIcon } from "@/components/nav/NavDestinationSceIcon";
import {
  getQuickAccessNavItemKey,
  getQuickAccessSceIconName,
} from "@/lib/nav/nav-destination-sce-icons";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import SceWorkspaceSectionShell from "@/components/sce/workspace/SceWorkspaceSectionShell";
import { SCE_WORKSPACE_RECORD_ROW_CLASS } from "@/lib/sce/sce-workspace-surface-styles";
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
  /** Canonical global + Erstellen (SceActivityCreateMenu) — not a parallel create shortcut. */
  createMenu?: ReactNode;
  className?: string;
};

export function PersonalQuickAccess({
  initialItems,
  initialActiveKeys,
  customizeCatalog,
  maxPins,
  createMenu,
  className,
}: Props) {
  const t = useTranslations("PersonalDashboard.quickAccess");
  const [items, setItems] = useState(initialItems);
  const [activeKeys, setActiveKeys] = useState(initialActiveKeys);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const navigationItems = items.filter((item) => item.kind === "navigate");

  if (navigationItems.length === 0 && !createMenu && customizeCatalog.length === 0) {
    return null;
  }

  const customizeControl = (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="h-7 px-2 text-[0.75rem]"
      onClick={() => setCustomizeOpen(true)}
      data-testid="personal-quick-access-customize"
    >
      {t("customize")}
    </Button>
  );

  return (
    <SceWorkspaceSectionShell
      title={t("areasTitle")}
      headerAside={customizeControl}
      testId="personal-quick-access"
      bodyClassName="p-5"
    >
      <div
        className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3", className)}
        aria-label={t("sectionAria")}
      >
        {navigationItems.map((item) => {
          const sceIconName = getQuickAccessSceIconName(item.key);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                SCE_WORKSPACE_RECORD_ROW_CLASS,
                "flex items-center justify-between gap-3 no-underline",
              )}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {sceIconName ? (
                  <span className="inline-flex shrink-0 text-[var(--sce-primary)]" aria-hidden>
                    <NavDestinationSceIcon
                      navItemKey={getQuickAccessNavItemKey(item.key) ?? ""}
                      size={20}
                    />
                  </span>
                ) : null}
                <span className="text-sm font-semibold text-[var(--foreground)] truncate">
                  {item.label}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
            </Link>
          );
        })}
        {createMenu ? (
          <div className="sm:col-span-2 xl:col-span-3" data-testid="personal-quick-access-create">
            {createMenu}
          </div>
        ) : null}
      </div>

      <QuickAccessCustomizer
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        initialPinnedKeys={activeKeys}
        catalog={customizeCatalog.filter((entry) => entry.kind === "navigate")}
        maxPins={maxPins}
        onSaved={({ items: nextItems, activeKeys: nextKeys }) => {
          setItems(nextItems.filter((entry) => entry.kind === "navigate"));
          setActiveKeys(nextKeys);
        }}
      />
    </SceWorkspaceSectionShell>
  );
}