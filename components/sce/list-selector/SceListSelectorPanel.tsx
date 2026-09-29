"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  Building2,
  Check,
  Mail,
  Search,
  User,
  UserCircle2,
  Users,
} from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import {
  SCE_SELECTOR_CATEGORY_TABS,
  sceSelectorPresentation,
  sceSelectorTypeToCategoryId,
  type SceSelectorCategoryId,
} from "@/lib/sce/list-selector/entity-presentation";
import {
  useSceListSelectorQuery,
  type SceListSelectorFetchParams,
} from "@/lib/sce/list-selector/use-sce-list-selector-query";
import type {
  SceSelectorPick,
  SceSelectorResultGroup,
  SceSelectorSelectionMode,
  SceSelectorSourceType,
} from "@/lib/sce/list-selector/types";
import { sceSelectorPickKey } from "@/lib/sce/list-selector/types";

function SelectorTypeIcon({ type }: { type: SceSelectorSourceType }) {
  if (type === "ORG_UNIT") return <Building2 className="h-5 w-5" aria-hidden="true" />;
  if (type === "TEAM" || type === "TARGET_GROUP") {
    return <Users className="h-5 w-5" aria-hidden="true" />;
  }
  if (type === "ROLE") return <UserCircle2 className="h-5 w-5" aria-hidden="true" />;
  if (type === "EXTERNAL_CONTACT") return <Mail className="h-5 w-5" aria-hidden="true" />;
  if (type === "USER") return <UserCircle2 className="h-5 w-5" aria-hidden="true" />;
  return <User className="h-5 w-5" aria-hidden="true" />;
}

function DiscoverRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-3">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-[var(--surface-2)]" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-40 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="h-3 w-56 animate-pulse rounded bg-[var(--surface-2)]" />
      </div>
      <div className="h-5 w-5 shrink-0 animate-pulse rounded bg-[var(--surface-2)]" />
    </div>
  );
}

export type SceListSelectorPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  searchPlaceholder?: string;
  enabledTypes: readonly SceSelectorSourceType[];
  mode?: SceSelectorSelectionMode;
  /** Keys `${type}:${id}` already committed in parent state. */
  committedKeys?: ReadonlySet<string>;
  fetchResults: (params: SceListSelectorFetchParams) => Promise<{
    groups: SceSelectorResultGroup[];
    noAccess?: boolean;
    error?: string;
  }>;
  onPick?: (pick: SceSelectorPick) => void;
  onConfirm?: (picks: SceSelectorPick[]) => void;
  disabled?: boolean;
  testIdPrefix?: string;
  getCategoryTestId?: (category: SceSelectorCategoryId) => string;
  getOptionTestId?: (type: SceSelectorSourceType, id: string) => string;
  panelTestId?: string;
  searchTestId?: string;
  confirmTestId?: string;
  emptyStateTestId?: string;
  /** When false, single-select rows apply without closing the sheet (Communication composer). */
  dismissOnSinglePick?: boolean;
};

export function SceListSelectorPanel({
  open,
  onOpenChange,
  title,
  description,
  searchPlaceholder = "Suchen …",
  enabledTypes,
  mode = "single",
  committedKeys,
  fetchResults,
  onPick,
  onConfirm,
  disabled,
  testIdPrefix = "sce-list-selector",
  getCategoryTestId,
  getOptionTestId,
  panelTestId,
  searchTestId,
  confirmTestId,
  emptyStateTestId,
  dismissOnSinglePick = true,
}: SceListSelectorPanelProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const statusId = useId();
  const [pending, setPending] = useState<Map<string, SceSelectorPick>>(() => new Map());
  const [focusIndex, setFocusIndex] = useState(0);

  const enabledSet = useMemo(() => new Set(enabledTypes), [enabledTypes]);

  const visibleTabs = useMemo(
    () =>
      SCE_SELECTOR_CATEGORY_TABS.filter((tab) => {
        if (tab.type === "all") return true;
        return enabledSet.has(tab.type);
      }),
    [enabledSet],
  );

  const resetPending = useCallback(() => setPending(new Map()), []);
  const queryState = useSceListSelectorQuery({
    open,
    enabledTypes,
    fetchResults,
    onReset: resetPending,
  });

  const flatOptions = useMemo(() => {
    const items: Array<{ pick: SceSelectorPick; groupIndex: number; optionIndex: number }> = [];
    queryState.groups.forEach((group, groupIndex) => {
      group.items.forEach((item, optionIndex) => {
        items.push({
          pick: {
            type: item.type,
            id: item.id,
            label: item.label,
            description: item.description,
            metadata: item.metadata,
          },
          groupIndex,
          optionIndex,
        });
      });
    });
    return items;
  }, [queryState.groups]);

  useEffect(() => {
    if (!open) return undefined;
    const handle = window.setTimeout(() => searchRef.current?.focus(), 50);
    return () => window.clearTimeout(handle);
  }, [open]);

  useEffect(() => {
    // Reset keyboard focus when the result set changes (APG listbox guidance).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional focus reset on new results
    setFocusIndex(0);
  }, [queryState.category, queryState.query, queryState.groups]);

  function isCommitted(type: SceSelectorSourceType, id: string): boolean {
    return committedKeys?.has(sceSelectorPickKey(type, id)) ?? false;
  }

  function isSelected(type: SceSelectorSourceType, id: string): boolean {
    const key = sceSelectorPickKey(type, id);
    if (mode === "multiple") {
      return pending.has(key) || isCommitted(type, id);
    }
    return isCommitted(type, id);
  }

  function togglePending(pick: SceSelectorPick) {
    const key = sceSelectorPickKey(pick.type, pick.id);
    setPending((prev) => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, pick);
      return next;
    });
  }

  function handleRowActivate(pick: SceSelectorPick) {
    if (disabled) return;
    if (isCommitted(pick.type, pick.id)) return;
    if (mode === "multiple") {
      togglePending(pick);
      return;
    }
    onPick?.(pick);
    if (dismissOnSinglePick) {
      onOpenChange(false);
    }
  }

  const pendingCount = pending.size;

  function handleConfirm() {
    if (pendingCount === 0) return;
    onConfirm?.([...pending.values()]);
    onOpenChange(false);
  }

  function handleCategoryKeyDown(event: KeyboardEvent, tabs: typeof visibleTabs) {
    const currentIndex = tabs.findIndex((tab) => {
      const categoryId: SceSelectorCategoryId =
        tab.id === "all" ? "all" : sceSelectorTypeToCategoryId(tab.type as SceSelectorSourceType);
      return queryState.category === categoryId;
    });
    if (currentIndex < 0) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const next = tabs[(currentIndex + 1) % tabs.length];
      if (!next) return;
      const categoryId: SceSelectorCategoryId =
        next.id === "all" ? "all" : sceSelectorTypeToCategoryId(next.type as SceSelectorSourceType);
      queryState.setCategory(categoryId);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      const prev = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
      if (!prev) return;
      const categoryId: SceSelectorCategoryId =
        prev.id === "all" ? "all" : sceSelectorTypeToCategoryId(prev.type as SceSelectorSourceType);
      queryState.setCategory(categoryId);
    }
  }

  function handleListKeyDown(event: KeyboardEvent) {
    if (flatOptions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setFocusIndex((i) => Math.min(i + 1, flatOptions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocusIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setFocusIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setFocusIndex(flatOptions.length - 1);
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      const target = flatOptions[focusIndex];
      if (target) handleRowActivate(target.pick);
    }
  }

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-sce-selector-option-index="${focusIndex}"]`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [focusIndex]);

  let flatCursor = 0;

  const listContent = (
    <>
      {queryState.loading ? (
        <div
          className="space-y-1 py-1"
          aria-busy="true"
          data-testid={`${testIdPrefix}-loading`}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <DiscoverRowSkeleton key={i} />
          ))}
        </div>
      ) : null}
      {queryState.error ? (
        <div className="space-y-3 py-2">
          <p className="text-sm text-red-600" role="alert" data-testid={`${testIdPrefix}-error`}>
            {queryState.error}
          </p>
          <Button type="button" variant="secondary" onClick={queryState.retry}>
            Erneut versuchen
          </Button>
        </div>
      ) : null}
      {!queryState.loading && !queryState.error && queryState.noAccess ? (
        <p className="py-6 text-sm text-[var(--text-2)]" data-testid={`${testIdPrefix}-no-access`}>
          Keine verfügbaren Empfänger.
        </p>
      ) : null}
      {!queryState.loading && !queryState.error && !queryState.noAccess && queryState.groups.length === 0 ? (
        <p
          className="py-6 text-sm text-[var(--text-2)]"
          data-testid={emptyStateTestId ?? `${testIdPrefix}-empty`}
        >
          {queryState.query.trim().length >= 2
            ? `Keine Ergebnisse für „${queryState.query.trim()}“`
            : "Keine Einträge vorhanden."}
        </p>
      ) : null}
      {queryState.loadingMore ? (
        <p className="py-2 text-sm text-[var(--text-2)]" data-testid={`${testIdPrefix}-loading-more`}>
          Weitere Einträge werden geladen …
        </p>
      ) : null}
      {!queryState.loading && !queryState.error
        ? queryState.groups.map((group) => (
            <div key={group.type} className="mb-5 last:mb-0">
              <p className="mb-2 border-b border-[var(--border)] pb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {group.heading}
              </p>
              <ul
                role="listbox"
                aria-multiselectable={mode === "multiple"}
                aria-label={group.heading}
                className="space-y-1"
              >
                {group.items.map((option) => {
                  const committed = isCommitted(option.type, option.id);
                  const selected = isSelected(option.type, option.id);
                  const pendingActive =
                    mode === "multiple" && pending.has(sceSelectorPickKey(option.type, option.id));
                  const rowDisabled = disabled || (committed && mode === "single");
                  const presentation = sceSelectorPresentation(option.type);
                  const secondary =
                    option.description?.trim() || presentation.typeLabel;
                  const optionIndex = flatCursor;
                  flatCursor += 1;
                  const isFocused = optionIndex === focusIndex;
                  return (
                    <li key={`${option.type}-${option.id}`}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        disabled={rowDisabled || (mode === "multiple" && committed)}
                        data-sce-selector-option-index={optionIndex}
                        className={`flex w-full min-h-12 items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] ${
                          selected
                            ? "border-[var(--sce-primary)]/40 bg-[var(--sce-primary)]/5"
                            : isFocused
                              ? "border-[var(--border)] bg-[var(--surface-2)]"
                              : "border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-2)]"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                        data-testid={
                          getOptionTestId?.(option.type, option.id) ??
                          `${testIdPrefix}-option-${option.type}-${option.id}`
                        }
                        onClick={() =>
                          handleRowActivate({
                            type: option.type,
                            id: option.id,
                            label: option.label,
                          })
                        }
                      >
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--sce-primary)]"
                          aria-hidden="true"
                        >
                          <SelectorTypeIcon type={option.type} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-[var(--foreground)]">
                            {option.label}
                          </span>
                          {secondary ? (
                            <span className="mt-0.5 block truncate text-sm text-[var(--text-2)]">
                              {secondary}
                            </span>
                          ) : null}
                          {committed ? (
                            <span className="mt-0.5 block text-xs text-[var(--muted)]">
                              Bereits hinzugefügt
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                            pendingActive || (mode === "single" && committed) || selected
                              ? "border-[var(--sce-primary)] bg-[var(--sce-primary)] text-white"
                              : "border-[var(--border-strong)] bg-[var(--surface)]"
                          }`}
                          aria-hidden="true"
                        >
                          {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {group.hasMore ? (
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={disabled || queryState.loadingMore}
                    data-testid={`${testIdPrefix}-load-more-${group.type}`}
                    onClick={() => queryState.loadMore(group.type)}
                  >
                    Mehr anzeigen
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        : null}
    </>
  );

  return (
    <Sheet
      open={open}
      onClose={() => onOpenChange(false)}
      title={title}
      description={description}
      footer={
        mode === "multiple" ? (
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <p
              className="text-sm font-medium text-[var(--foreground)]"
              data-testid={`${testIdPrefix}-pending-count`}
            >
              {pendingCount} ausgewählt
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={pendingCount === 0 || disabled}
                data-testid={confirmTestId ?? `${testIdPrefix}-confirm`}
                onClick={handleConfirm}
              >
                {pendingCount === 1 ? "1 übernehmen" : `${pendingCount} übernehmen`}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex w-full justify-end">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Schliessen
            </Button>
          </div>
        )
      }
    >
      <div
        className="flex min-h-0 flex-1 flex-col gap-4"
        data-testid={panelTestId ?? `${testIdPrefix}-panel`}
      >
        <div className="relative shrink-0">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            type="search"
            autoComplete="off"
            className="fca-input fca-search-input w-full text-base"
            placeholder={searchPlaceholder}
            value={queryState.query}
            onChange={(e) => queryState.setQuery(e.target.value)}
            data-testid={searchTestId ?? `${testIdPrefix}-search`}
            aria-label="Suche"
            disabled={disabled}
          />
        </div>
        <div
          className="flex shrink-0 gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Kategorien"
          onKeyDown={(event) => handleCategoryKeyDown(event, visibleTabs)}
        >
          {visibleTabs.map((tab) => {
            const categoryId: SceSelectorCategoryId =
              tab.id === "all"
                ? "all"
                : sceSelectorTypeToCategoryId(tab.type as SceSelectorSourceType);
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={queryState.category === categoryId}
                className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] ${
                  queryState.category === categoryId
                    ? "bg-[var(--sce-primary)] text-white"
                    : "bg-[var(--surface-2)] text-[var(--text-2)] hover:bg-[var(--surface-3)]"
                }`}
                onClick={() => queryState.setCategory(categoryId)}
                data-testid={
                  getCategoryTestId?.(categoryId) ??
                  `${testIdPrefix}-category-${categoryId}`
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <p id={statusId} className="sr-only" aria-live="polite">
          {queryState.statusMessage}
        </p>
        <div
          ref={listRef}
          className="min-h-[12rem] flex-1 overflow-y-auto pr-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          tabIndex={0}
          aria-live="polite"
          aria-busy={queryState.loading || queryState.loadingMore}
          onKeyDown={handleListKeyDown}
        >
          {listContent}
        </div>
      </div>
    </Sheet>
  );
}
