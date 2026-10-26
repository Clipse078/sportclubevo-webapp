"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";
import { searchFinancePublicationDistributionPersonCandidatesAction } from "@/app/(admin)/dashboard/finance/reports/publication-distribution-actions";
import type { FinancePublicationDistributionRecipientInput } from "@/lib/finance/publishing/finance-publication-distribution-contract";

export type FinancePublicationDistributionRecipientPickerLabels = {
  recipientsLabel: string;
  addPerson: string;
  personDialogTitle: string;
  externalEmailLabel: string;
  externalEmailPlaceholder: string;
  addExternal: string;
  externalBadge: string;
  invalidEmail: string;
  searchPlaceholder: string;
  searchLoading: string;
  searchEmpty: string;
};

type Props = {
  labels: FinancePublicationDistributionRecipientPickerLabels;
  value: FinancePublicationDistributionRecipientInput[];
  onChange: (value: FinancePublicationDistributionRecipientInput[]) => void;
  disabled?: boolean;
};

type SelectedChip = {
  key: string;
  label: string;
  description: string;
  input: FinancePublicationDistributionRecipientInput;
};

function buildChips(value: FinancePublicationDistributionRecipientInput[]): SelectedChip[] {
  return value.map((entry) => {
    if (entry.kind === "EXTERNAL") {
      return {
        key: `external:${entry.email}`,
        label: entry.displayName?.trim() || entry.email,
        description: entry.email,
        input: entry,
      };
    }
    return {
      key: `person:${entry.personId}`,
      label: entry.personId,
      description: "",
      input: entry,
    };
  });
}

export function FinancePublicationDistributionRecipientPicker({
  labels,
  value,
  onChange,
  disabled = false,
}: Props) {
  const [knownLabels, setKnownLabels] = useState<Record<string, { label: string; email: string }>>(
    {},
  );
  const [search, setSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<
    Array<{ personId: string; displayName: string; email: string }>
  >([]);
  const [externalDraft, setExternalDraft] = useState("");
  const [externalError, setExternalError] = useState<string | null>(null);

  const chips = useMemo(() => {
    return buildChips(value).map((chip) => {
      if (chip.input.kind === "PERSON") {
        const known = knownLabels[chip.input.personId];
        return {
          ...chip,
          label: known?.label ?? chip.label,
          description: known?.email ?? chip.description,
        };
      }
      return chip;
    });
  }, [knownLabels, value]);

  const runSearch = useCallback(async (query: string) => {
    const term = query.trim();
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    const result = await searchFinancePublicationDistributionPersonCandidatesAction({ query: term });
    setSearchLoading(false);
    if (!result.ok) {
      setSearchResults([]);
      return;
    }
    setSearchResults(result.candidates);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void runSearch(search);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [runSearch, search]);

  const addPerson = (candidate: { personId: string; displayName: string; email: string }) => {
    if (value.some((entry) => entry.kind === "PERSON" && entry.personId === candidate.personId)) {
      return;
    }
    setKnownLabels((prev) => ({
      ...prev,
      [candidate.personId]: { label: candidate.displayName, email: candidate.email },
    }));
    onChange([...value, { kind: "PERSON", personId: candidate.personId }]);
  };

  const removeChip = (key: string) => {
    onChange(
      value.filter((entry) => {
        if (entry.kind === "PERSON") return `person:${entry.personId}` !== key;
        return `external:${entry.email}` !== key;
      }),
    );
  };

  const addExternal = () => {
    const trimmed = externalDraft.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmed)) {
      setExternalError(labels.invalidEmail);
      return;
    }
    setExternalError(null);
    const normalized = trimmed.toLowerCase();
    if (value.some((entry) => entry.kind === "EXTERNAL" && entry.email === normalized)) {
      setExternalDraft("");
      return;
    }
    onChange([
      ...value,
      { kind: "EXTERNAL", email: normalized, displayName: trimmed },
    ]);
    setExternalDraft("");
  };

  return (
    <div className="flex flex-col gap-4" data-finance-publication-distribution-recipients>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[var(--foreground)]">{labels.recipientsLabel}</span>
        <div className="flex flex-wrap gap-1.5" aria-live="polite">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/60 px-2 py-0.5 text-xs"
            >
              <span className="truncate">
                {chip.label}
                {chip.description ? ` · ${chip.description}` : ""}
              </span>
              {!disabled ? (
                <button
                  type="button"
                  className="rounded p-0.5 text-[var(--muted)]"
                  aria-label={`Remove ${chip.label}`}
                  onClick={() => removeChip(chip.key)}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-[var(--sce-surface-border-subtle)] p-3">
        <p className="text-sm font-medium text-[var(--foreground)]">{labels.personDialogTitle}</p>
        <input
          type="search"
          value={search}
          disabled={disabled}
          placeholder={labels.searchPlaceholder}
          onChange={(event) => setSearch(event.target.value)}
          className="min-h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm"
          data-finance-publication-distribution-person-search
        />
        {searchLoading ? (
          <p className="text-xs text-[var(--muted)]">{labels.searchLoading}</p>
        ) : null}
        {!searchLoading && search.trim().length >= 2 && searchResults.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">{labels.searchEmpty}</p>
        ) : null}
        <ul className="max-h-40 space-y-1 overflow-y-auto" role="list">
          {searchResults.map((candidate) => (
            <li key={candidate.personId} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                {candidate.displayName}
                <span className="text-[var(--muted)]"> · {candidate.email}</span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={disabled}
                onClick={() => addPerson(candidate)}
              >
                {labels.addPerson}
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="finance-distribution-external-email">
          {labels.externalEmailLabel}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="finance-distribution-external-email"
            type="email"
            autoComplete="email"
            value={externalDraft}
            disabled={disabled}
            placeholder={labels.externalEmailPlaceholder}
            onChange={(event) => {
              setExternalDraft(event.target.value);
              setExternalError(null);
            }}
            className="min-h-9 min-w-[min(100%,16rem)] flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm"
          />
          <Button type="button" variant="secondary" disabled={disabled} onClick={addExternal}>
            {labels.addExternal}
          </Button>
        </div>
        {externalError ? (
          <p className="text-sm text-destructive" role="alert">
            {externalError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
