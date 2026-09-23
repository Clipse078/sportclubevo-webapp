"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export type QuickAccessCustomizeEntry = {
  key: string;
  kind: "navigate" | "create";
  label: string;
  href: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  initialPinnedKeys: string[];
  catalog: QuickAccessCustomizeEntry[];
  maxPins: number;
  onSaved: (payload: {
    items: QuickAccessCustomizeEntry[];
    activeKeys: string[];
  }) => void;
};

export function QuickAccessCustomizer({
  open,
  onClose,
  initialPinnedKeys,
  catalog,
  maxPins,
  onSaved,
}: Props) {
  const t = useTranslations("PersonalDashboard.quickAccess");
  const catalogByKey = useMemo(
    () => new Map(catalog.map((entry) => [entry.key, entry])),
    [catalog],
  );

  const [draftKeys, setDraftKeys] = useState<string[]>(initialPinnedKeys);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraftKeys(initialPinnedKeys);
      setError(null);
    }
  }, [open, initialPinnedKeys]);

  const pinnedEntries = draftKeys
    .map((key) => catalogByKey.get(key))
    .filter((entry): entry is QuickAccessCustomizeEntry => Boolean(entry));

  const availableToAdd = catalog.filter(
    (entry) => !draftKeys.includes(entry.key),
  );

  const move = useCallback((index: number, direction: -1 | 1) => {
    setDraftKeys((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) {
        return prev;
      }
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });
  }, []);

  const remove = useCallback((key: string) => {
    setDraftKeys((prev) => prev.filter((k) => k !== key));
  }, []);

  const add = useCallback(
    (key: string) => {
      setDraftKeys((prev) => {
        if (prev.includes(key) || prev.length >= maxPins) {
          return prev;
        }
        return [...prev, key];
      });
    },
    [maxPins],
  );

  async function handleSave() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/quick-access", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinnedKeys: draftKeys }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? t("saveError"));
        return;
      }
      onSaved({
        items: data.items,
        activeKeys: data.activeKeys,
      });
      onClose();
    } catch {
      setError(t("saveError"));
    } finally {
      setPending(false);
    }
  }

  async function handleReset() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/quick-access", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(t("saveError"));
        return;
      }
      setDraftKeys(data.activeKeys);
      onSaved({
        items: data.items,
        activeKeys: data.activeKeys,
      });
      onClose();
    } catch {
      setError(t("saveError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("customizeTitle")}
      description={t("customizeDescription", { max: maxPins })}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={handleReset} disabled={pending}>
            {t("reset")}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={pending}>
              {t("save")}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {error ? (
          <p className="text-sm text-[var(--destructive)]" role="alert">
            {error}
          </p>
        ) : null}

        <section aria-labelledby="quick-access-pinned-heading">
          <h3 id="quick-access-pinned-heading" className="mb-2 text-sm font-semibold">
            {t("pinnedHeading")} ({pinnedEntries.length}/{maxPins})
          </h3>
          {pinnedEntries.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">{t("pinnedEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pinnedEntries.map((entry, index) => (
                <li
                  key={entry.key}
                  className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.label}</p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {entry.kind === "create" ? t("kindCreate") : t("kindNavigate")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("moveUp")}
                      disabled={index === 0 || pending}
                      onClick={() => move(index, -1)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("moveDown")}
                      disabled={index === pinnedEntries.length - 1 || pending}
                      onClick={() => move(index, 1)}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("remove", { label: entry.label })}
                      disabled={pending}
                      onClick={() => remove(entry.key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="quick-access-add-heading">
          <h3 id="quick-access-add-heading" className="mb-2 text-sm font-semibold">
            {t("addHeading")}
          </h3>
          {availableToAdd.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">{t("addEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {availableToAdd.map((entry) => (
                <li key={entry.key}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-left text-sm",
                      "motion-safe:transition-colors motion-safe:hover:bg-[var(--surface-2)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
                      draftKeys.length >= maxPins && "cursor-not-allowed opacity-50",
                    )}
                    disabled={draftKeys.length >= maxPins || pending}
                    onClick={() => add(entry.key)}
                  >
                    <span className="min-w-0 truncate font-medium">{entry.label}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-[var(--muted)]">
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      {entry.kind === "create" ? t("kindCreate") : t("kindNavigate")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Sheet>
  );
}
