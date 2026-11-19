"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, UserCheck, X } from "lucide-react";
import { PopoverContent } from "@/components/ui/Popover";
import { CoordinatorAvatar } from "@/components/admin/registrations/WaitingListCoordinatorPicker";
import type { ClubMeldungAssignMemberOption } from "@/lib/club-meldungen/assign-lookup";
import { filterClubMeldungAssignMembersBySearch } from "@/lib/club-meldungen/assign-member-search";
import { meldungMentionDisplayName } from "@/lib/club-meldungen/meldung-mention-tokens";
import {
  SCE_MELDUNG_LIGHT_PICKER_MUTED_TEXT,
  sceMeldungLightPickerOptionClass,
} from "@/lib/club-meldungen/meldung-picker-surface";
import { cn } from "@/lib/cn";

type Props = {
  members: ClubMeldungAssignMemberOption[];
  selectedUserId?: string | null;
  onSelect: (userId: string | null) => void;
  disabled?: boolean;
  pending?: boolean;
  compact?: boolean;
  placeholder?: string;
};

const ASSIGN_EMPTY_COPY = "Keine passende Person gefunden.";

export function ClubMeldungAssigneePicker({
  members,
  selectedUserId = null,
  onSelect,
  disabled = false,
  pending = false,
  compact = true,
  placeholder = "Person suchen…",
}: Props) {
  const instanceId = useId();
  const listboxId = `meldung-assignee-listbox-${instanceId}`;
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = useMemo(
    () => members.find((member) => member.id === selectedUserId) ?? null,
    [members, selectedUserId],
  );

  const filtered = useMemo(
    () => filterClubMeldungAssignMembersBySearch(members, query),
    [members, query],
  );

  const selectedLabel = selected
    ? meldungMentionDisplayName(selected.firstName, selected.lastName)
    : null;

  const listActiveIndex =
    filtered.length === 0 ? -1 : Math.min(Math.max(activeIndex, 0), filtered.length - 1);

  const trimmedQuery = query.trim();
  const showPopoverPanel = open;
  const showEmptyState = showPopoverPanel && !pending && filtered.length === 0;
  const showResults = showPopoverPanel && filtered.length > 0;

  function closePicker() {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  function handleSelect(userId: string) {
    onSelect(userId);
    closePicker();
  }

  function openSearch() {
    if (disabled || pending) return;
    setOpen(true);
    setActiveIndex(0);
  }

  useEffect(() => {
    if (!open) return;
    const handle = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(handle);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [trimmedQuery, filtered.length]);

  if (selected && !open) {
    return (
      <button
        type="button"
        disabled={disabled || pending}
        onClick={openSearch}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-left transition hover:border-[var(--border-strong)]",
          compact ? "px-2 py-1.5" : "px-3 py-2",
          (disabled || pending) && "pointer-events-none opacity-60",
        )}
        aria-label="Verantwortliche Person ändern"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
      >
        <CoordinatorAvatar name={selectedLabel ?? "?"} compact />
        <span className="min-w-0 flex-1 truncate text-sm text-[var(--foreground)]">
          {selectedLabel}
        </span>
        {pending ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-[var(--muted)]" aria-hidden />
        ) : (
          <ChevronDown className="size-3.5 shrink-0 text-[var(--muted)]" aria-hidden />
        )}
        {!selected.canOperateCase ? (
          <span className="sr-only">Ohne Bearbeitungsberechtigung für Meldungen</span>
        ) : null}
      </button>
    );
  }

  return (
    <div className="w-full" ref={anchorRef}>
      {selected ? (
        <div
          className={cn(
            "mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-900",
            compact ? "text-sm" : "text-base",
          )}
          data-testid="meldung-assignee-current"
        >
          <CoordinatorAvatar name={selectedLabel ?? "?"} compact />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{selectedLabel}</p>
            <p className="text-[11px] text-slate-600">Aktuelle Zuweisung</p>
          </div>
          {pending ? (
            <Loader2 className="size-3.5 shrink-0 animate-spin text-slate-500" aria-hidden />
          ) : (
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-white hover:text-slate-900"
              aria-label="Zuweisung entfernen"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      ) : null}

      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]",
          compact ? "px-2 py-1.5" : "px-3 py-2",
          (disabled || pending) && "pointer-events-none opacity-60",
        )}
      >
        <UserCheck className="size-3.5 shrink-0 text-[var(--muted)]" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              closePicker();
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((prev) => Math.min(prev + 1, Math.max(filtered.length - 1, 0)));
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((prev) => Math.max(prev - 1, 0));
              return;
            }
            if (event.key === "Enter" && listActiveIndex >= 0 && filtered[listActiveIndex]) {
              event.preventDefault();
              handleSelect(filtered[listActiveIndex].id);
            }
          }}
          placeholder={selected ? placeholder : "Noch nicht zugewiesen — suchen"}
          disabled={disabled || pending}
          autoComplete="off"
          className={cn(
            "min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none",
          )}
          aria-label="Verantwortliche Person suchen"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showPopoverPanel}
          aria-controls={listboxId}
          aria-haspopup="listbox"
        />
        {pending ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-[var(--muted)]" aria-hidden />
        ) : null}
      </div>

      <PopoverContent
        open={showPopoverPanel}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closePicker();
          else setOpen(true);
        }}
        anchorRef={anchorRef}
        id={listboxId}
        surfaceVariant="sce-light"
        matchAnchorWidth
        className="max-h-48 p-1"
      >
        {pending ? (
          <div
            className={cn("flex items-center gap-2 px-2 py-2 text-xs", SCE_MELDUNG_LIGHT_PICKER_MUTED_TEXT)}
            role="status"
          >
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Speichern…
          </div>
        ) : showEmptyState ? (
          <p className={cn("px-2 py-2 text-xs", SCE_MELDUNG_LIGHT_PICKER_MUTED_TEXT)} role="status">
            {ASSIGN_EMPTY_COPY}
          </p>
        ) : showResults ? (
          <ul role="listbox" aria-label="Verantwortliche Personen" className="py-0">
            {filtered.map((member, index) => {
              const label = meldungMentionDisplayName(member.firstName, member.lastName);
              const isSelected = member.id === selectedUserId;
              const isActive = index === listActiveIndex;
              return (
                <li key={member.id} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleSelect(member.id);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-slate-900",
                      sceMeldungLightPickerOptionClass(isActive),
                    )}
                  >
                    <CoordinatorAvatar name={label} compact />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{label}</p>
                      {!member.canOperateCase ? (
                        <p className="truncate text-[11px] text-amber-800">
                          Keine Meldungs-Bearbeitungsberechtigung
                        </p>
                      ) : null}
                    </div>
                    {isSelected ? (
                      <Check className="size-3.5 shrink-0 text-slate-600" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </PopoverContent>
    </div>
  );
}