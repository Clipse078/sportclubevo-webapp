"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, UserCheck, X } from "lucide-react";
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

  const showList = open && query.trim().length >= 2;
  const showInlineEmpty =
    open && query.trim().length >= 2 && !pending && filtered.length === 0;

  function handleSelect(userId: string) {
    onSelect(userId);
    setQuery("");
    setOpen(false);
  }

  function openSearch() {
    if (disabled || pending) return;
    setOpen(true);
  }

  if (selected && query.length === 0 && !open) {
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
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]",
          compact ? "px-2 py-1.5" : "px-3 py-2",
          (disabled || pending) && "pointer-events-none opacity-60",
        )}
      >
        <UserCheck className="size-3.5 shrink-0 text-[var(--muted)]" aria-hidden />
        <input
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
              setOpen(false);
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
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
          placeholder={selected ? selectedLabel ?? placeholder : "Noch nicht zugewiesen — suchen"}
          disabled={disabled || pending}
          autoComplete="off"
          className={cn(
            "min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none",
          )}
          aria-label="Verantwortliche Person suchen"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-haspopup="listbox"
        />
        {selected && !query ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => onSelect(null)}
            className="flex size-5 shrink-0 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            aria-label="Zuweisung entfernen"
          >
            <X className="size-3" />
          </button>
        ) : null}
        {pending ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-[var(--muted)]" aria-hidden />
        ) : null}
      </div>

      {open && query.trim().length > 0 && query.trim().length < 2 ? (
        <p className={cn("mt-1 text-[11px]", SCE_MELDUNG_LIGHT_PICKER_MUTED_TEXT)}>
          Mindestens 2 Zeichen eingeben.
        </p>
      ) : null}

      {showInlineEmpty ? (
        <p className={cn("mt-1 text-xs", SCE_MELDUNG_LIGHT_PICKER_MUTED_TEXT)}>
          Keine passende Person gefunden.
        </p>
      ) : null}

      <PopoverContent
        open={showList && filtered.length > 0}
        onOpenChange={setOpen}
        anchorRef={anchorRef}
        id={listboxId}
        surfaceVariant="sce-light"
        matchAnchorWidth
        className="max-h-48 p-1"
      >
        <ul role="listbox" aria-label="Verantwortliche Personen" className="py-0">
          {filtered.map((member, index) => {
            const label = meldungMentionDisplayName(member.firstName, member.lastName);
            return (
              <li key={member.id} role="option" aria-selected={index === listActiveIndex}>
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleSelect(member.id);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-slate-900",
                    sceMeldungLightPickerOptionClass(index === listActiveIndex),
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
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </div>
  );
}