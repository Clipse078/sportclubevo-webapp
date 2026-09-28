"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { PopoverContent } from "@/components/ui/Popover";
import type { CommunicationAudienceSelection } from "@/lib/communication/audience/communication-audience-selection";
import {
  buildCommunicationAudienceSpec,
  communicationAudienceSelectionIsEmpty,
  emptyCommunicationAudienceSelection,
} from "@/lib/communication/audience/communication-audience-selection";
import {
  summarizeCommunicationAudienceSelection,
  type CommunicationAudienceLabelMaps,
} from "@/lib/communication/audience/human-audience-summary";

export type CommunicationAudienceSelectorContext = "DIRECT" | "ORGANISATION" | "CAMPAIGN";

export type CommunicationAudienceSelectorFeatures = {
  wholeOrganisation?: boolean;
  orgUnits?: boolean;
  teams?: boolean;
  targetGroups?: boolean;
  roles?: boolean;
  persons?: boolean;
};

type Props = {
  value: CommunicationAudienceSelection;
  onChange: (value: CommunicationAudienceSelection) => void;
  context?: CommunicationAudienceSelectorContext;
  features?: CommunicationAudienceSelectorFeatures;
  disabled?: boolean;
  onPreviewChange?: (preview: CommunicationAudiencePreviewState | null) => void;
  showInlinePreview?: boolean;
  requireLargeAudienceConfirm?: boolean;
  largeAudienceConfirmed?: boolean;
  onLargeAudienceConfirmedChange?: (confirmed: boolean) => void;
  /** Mitteilungs-Art for preference category in preview (MESSAGE | ANNOUNCEMENT | ALERT). */
  previewKind?: string;
};

export type CommunicationAudiencePreviewState = {
  candidates: number;
  effective: number;
  excluded: number;
  scopeNotice: string | null;
  audienceSummary: string;
  dynamicAudienceNotice: string | null;
  guardianDeliveryCount: number | null;
};

type SelectorKind = "team" | "orgUnit" | "role" | "targetGroup" | "person";

const KIND_LABEL: Record<Exclude<SelectorKind, "person">, string> = {
  team: "Team",
  orgUnit: "Organisationseinheit",
  role: "Rolle",
  targetGroup: "Zielgruppe",
};

const MIN_SEARCH = 2;

function SelectorAddPanel({
  kind,
  context,
  disabled,
  onPick,
}: {
  kind: Exclude<SelectorKind, "person">;
  context: CommunicationAudienceSelectorContext;
  disabled?: boolean;
  onPick: (id: string, label: string) => void;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<Array<{ id: string; label: string; description?: string | null }>>(
    [],
  );

  useEffect(() => {
    if (!open) return undefined;
    const term = query.trim();
    if (term.length < MIN_SEARCH) {
      setOptions([]);
      return undefined;
    }
    const handle = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/communication/audience/search?context=${encodeURIComponent(context)}&kind=${kind}&q=${encodeURIComponent(term)}`,
        );
        const data = (await res.json()) as { options?: typeof options; error?: string };
        if (!res.ok) {
          setError(data.error ?? "Suche fehlgeschlagen");
          setOptions([]);
        } else {
          setOptions(data.options ?? []);
        }
      } catch {
        setError("Suche fehlgeschlagen");
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [context, kind, open, query]);

  return (
    <div className="relative inline-block">
      <button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        className="inline-flex min-h-10 items-center gap-1 rounded-md border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid={`communication-audience-add-${kind}`}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {KIND_LABEL[kind]}
      </button>
      <PopoverContent
        open={open}
        onOpenChange={setOpen}
        anchorRef={anchorRef}
        matchAnchorWidth={false}
        maxHeight={320}
        className="w-[min(100vw-2rem,20rem)] p-2"
        role="dialog"
        aria-label={`${KIND_LABEL[kind]} suchen`}
      >
        <input
          className="fca-input mb-2 w-full text-sm"
          placeholder="Suchen…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid={`communication-audience-search-${kind}`}
          aria-label={`${KIND_LABEL[kind]} suchen`}
        />
        {error ? (
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="text-xs text-[var(--muted)]" aria-live="polite">
            Suche…
          </p>
        ) : null}
        <ul className="max-h-52 overflow-y-auto" role="listbox">
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sce-primary)]"
                onClick={() => {
                  onPick(option.id, option.label);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span className="font-medium">{option.label}</span>
                {option.description ? (
                  <span className="mt-0.5 block text-xs text-[var(--text-2)]">{option.description}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </div>
  );
}

function TokenChip({
  typeLabel,
  valueLabel,
  onRemove,
  disabled,
  testId,
}: {
  typeLabel: string;
  valueLabel: string;
  onRemove: () => void;
  disabled?: boolean;
  testId: string;
}) {
  return (
    <div
      className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm"
      data-testid={testId}
    >
      <span className="min-w-0 truncate">
        <span className="sr-only">{typeLabel}: </span>
        {valueLabel}
      </span>
      <button
        type="button"
        className="shrink-0 rounded p-0.5 text-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
        aria-label={`${typeLabel} ${valueLabel} entfernen`}
        disabled={disabled}
        onClick={onRemove}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function CommunicationAudienceSelector({
  value,
  onChange,
  context = "ORGANISATION",
  features,
  disabled,
  onPreviewChange,
  showInlinePreview = true,
  requireLargeAudienceConfirm = false,
  largeAudienceConfirmed = false,
  onLargeAudienceConfirmedChange,
  previewKind,
}: Props) {
  const [labels, setLabels] = useState<CommunicationAudienceLabelMaps>({
    orgUnits: {},
    teams: {},
    roles: {},
    targetGroups: {},
    persons: {},
  });
  const [capabilities, setCapabilities] = useState<CommunicationAudienceSelectorFeatures | null>(
    null,
  );
  const [preview, setPreview] = useState<CommunicationAudiencePreviewState | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const enabledFeatures = useMemo(
    () => ({
      wholeOrganisation: features?.wholeOrganisation ?? capabilities?.wholeOrganisation ?? true,
      orgUnits: features?.orgUnits ?? capabilities?.orgUnits ?? true,
      teams: features?.teams ?? capabilities?.teams ?? true,
      targetGroups: features?.targetGroups ?? capabilities?.targetGroups ?? true,
      roles: features?.roles ?? capabilities?.roles ?? true,
      persons: features?.persons ?? capabilities?.persons ?? true,
    }),
    [capabilities, features],
  );

  useEffect(() => {
    async function loadCapabilities() {
      try {
        const res = await fetch(
          `/api/communication/audience/capabilities?context=${encodeURIComponent(context)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { capabilities?: CommunicationAudienceSelectorFeatures };
        setCapabilities(data.capabilities ?? null);
      } catch {
        /* ignore */
      }
    }
    void loadCapabilities();
  }, [context]);

  const summary = useMemo(
    () => summarizeCommunicationAudienceSelection({ selection: value, labels }),
    [labels, value],
  );

  const registerLabel = useCallback((kind: keyof CommunicationAudienceLabelMaps, id: string, label: string) => {
    setLabels((prev) => ({
      ...prev,
      [kind]: { ...prev[kind], [id]: label },
    }));
  }, []);

  const hasSelection = !communicationAudienceSelectionIsEmpty(value);

  useEffect(() => {
    if (!hasSelection) {
      setPreview(null);
      onPreviewChange?.(null);
      return undefined;
    }
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const audienceSpec = buildCommunicationAudienceSpec(value);
        const res = await fetch("/api/communication/audience/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audienceSpec, context, kind: previewKind }),
        });
        const data = (await res.json()) as CommunicationAudiencePreviewState & { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setPreview(null);
          setPreviewError(data.error ?? "Vorschau nicht verfügbar");
          onPreviewChange?.(null);
        } else {
          const next: CommunicationAudiencePreviewState = {
            candidates: data.candidates,
            effective: data.effective,
            excluded: data.excluded,
            scopeNotice: data.scopeNotice,
            audienceSummary: data.audienceSummary,
            dynamicAudienceNotice: data.dynamicAudienceNotice,
            guardianDeliveryCount: data.guardianDeliveryCount,
          };
          setPreview(next);
          onPreviewChange?.(next);
        }
      } catch {
        if (!cancelled) {
          setPreviewError("Vorschau nicht verfügbar");
          onPreviewChange?.(null);
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [context, hasSelection, onPreviewChange, previewKind, value]);

  function setWholeOrganisation(enabled: boolean) {
    if (enabled) {
      onChange({
        ...emptyCommunicationAudienceSelection(),
        wholeOrganisation: true,
      });
    } else {
      onChange({ ...value, wholeOrganisation: false });
    }
    onLargeAudienceConfirmedChange?.(false);
  }

  function addStructural(
    field: "teamIds" | "orgUnitIds" | "roleIds" | "targetGroupIds",
    labelField: keyof CommunicationAudienceLabelMaps,
    id: string,
    label: string,
  ) {
    if (value.wholeOrganisation) return;
    if (value[field].includes(id)) return;
    registerLabel(labelField, id, label);
    onChange({ ...value, [field]: [...value[field], id] });
    onLargeAudienceConfirmedChange?.(false);
  }

  function addPerson(id: string, label: string) {
    if (value.wholeOrganisation || value.personIds.includes(id)) return;
    registerLabel("persons", id, label);
    onChange({ ...value, personIds: [...value.personIds, id] });
  }

  return (
    <section className="space-y-4" data-testid="communication-audience-selector">
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Empfänger</h3>
        <p className="mt-1 text-xs text-[var(--text-2)]">{summary}</p>
      </div>

      {enabledFeatures.wholeOrganisation ? (
        <label className="flex min-h-10 cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] p-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={value.wholeOrganisation}
            disabled={disabled}
            onChange={(e) => setWholeOrganisation(e.target.checked)}
            data-testid="communication-audience-whole-org"
          />
          <span>
            <span className="font-medium">Gesamter Verein</span>
            <span className="mt-0.5 block text-xs text-[var(--text-2)]">
              Alle aktiven Mitglieder zum Versandzeitpunkt. Bitte besonders sorgfältig prüfen.
            </span>
          </span>
        </label>
      ) : null}

      {!value.wholeOrganisation ? (
        <>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Organisation
            </p>
            <div className="flex flex-wrap gap-2">
              {enabledFeatures.orgUnits ? (
                <SelectorAddPanel
                  kind="orgUnit"
                  context={context}
                  disabled={disabled}
                  onPick={(id, label) => addStructural("orgUnitIds", "orgUnits", id, label)}
                />
              ) : null}
              {enabledFeatures.teams ? (
                <SelectorAddPanel
                  kind="team"
                  context={context}
                  disabled={disabled}
                  onPick={(id, label) => addStructural("teamIds", "teams", id, label)}
                />
              ) : null}
              {enabledFeatures.targetGroups ? (
                <SelectorAddPanel
                  kind="targetGroup"
                  context={context}
                  disabled={disabled}
                  onPick={(id, label) => addStructural("targetGroupIds", "targetGroups", id, label)}
                />
              ) : null}
              {enabledFeatures.roles ? (
                <SelectorAddPanel
                  kind="role"
                  context={context}
                  disabled={disabled}
                  onPick={(id, label) => addStructural("roleIds", "roles", id, label)}
                />
              ) : null}
            </div>
          </div>

          {enabledFeatures.persons ? (
            <PersonAddPanel
              context={context}
              disabled={disabled}
              excludedIds={value.personIds}
              onPick={addPerson}
            />
          ) : null}

          <div className="flex flex-wrap gap-2" aria-label="Ausgewählte Empfänger">
            {value.orgUnitIds.map((id) => (
              <TokenChip
                key={`org-${id}`}
                typeLabel="Organisationseinheit"
                valueLabel={labels.orgUnits[id] ?? id}
                disabled={disabled}
                testId={`communication-audience-token-org-${id}`}
                onRemove={() =>
                  onChange({ ...value, orgUnitIds: value.orgUnitIds.filter((x) => x !== id) })
                }
              />
            ))}
            {value.teamIds.map((id) => (
              <TokenChip
                key={`team-${id}`}
                typeLabel="Team"
                valueLabel={labels.teams[id] ?? id}
                disabled={disabled}
                testId={`communication-audience-token-team-${id}`}
                onRemove={() =>
                  onChange({ ...value, teamIds: value.teamIds.filter((x) => x !== id) })
                }
              />
            ))}
            {value.targetGroupIds.map((id) => (
              <TokenChip
                key={`tg-${id}`}
                typeLabel="Zielgruppe"
                valueLabel={labels.targetGroups[id] ?? id}
                disabled={disabled}
                testId={`communication-audience-token-target-group-${id}`}
                onRemove={() =>
                  onChange({
                    ...value,
                    targetGroupIds: value.targetGroupIds.filter((x) => x !== id),
                  })
                }
              />
            ))}
            {value.roleIds.map((id) => (
              <TokenChip
                key={`role-${id}`}
                typeLabel="Rolle"
                valueLabel={labels.roles[id] ?? id}
                disabled={disabled}
                testId={`communication-audience-token-role-${id}`}
                onRemove={() =>
                  onChange({ ...value, roleIds: value.roleIds.filter((x) => x !== id) })
                }
              />
            ))}
            {value.personIds.map((id) => (
              <TokenChip
                key={`person-${id}`}
                typeLabel="Person"
                valueLabel={labels.persons[id] ?? id}
                disabled={disabled}
                testId={`communication-audience-token-person-${id}`}
                onRemove={() =>
                  onChange({ ...value, personIds: value.personIds.filter((x) => x !== id) })
                }
              />
            ))}
          </div>
        </>
      ) : null}

      {!hasSelection ? (
        <p className="text-sm text-[var(--text-2)]" data-testid="communication-audience-empty">
          Noch keine Empfänger ausgewählt.
        </p>
      ) : null}

      {showInlinePreview && hasSelection ? (
        <div className="text-sm text-[var(--text-2)]" data-testid="communication-audience-preview">
          {previewLoading ? (
            <p aria-live="polite">Empfänger werden berechnet…</p>
          ) : previewError ? (
            <p className="text-red-600" role="alert">
              {previewError}
            </p>
          ) : preview ? (
            <div className="space-y-1">
              <p aria-live="polite">
                <strong>{preview.effective}</strong> zustellbare Personen
                {preview.excluded > 0 ? ` (${preview.excluded} ausgeschlossen)` : ""}
              </p>
              {preview.effective === 0 ? (
                <p className="text-amber-700">
                  Für diese Auswahl wurden keine zustellbaren Empfänger gefunden.
                </p>
              ) : null}
              {preview.scopeNotice ? <p className="text-xs">{preview.scopeNotice}</p> : null}
              {preview.dynamicAudienceNotice ? (
                <p className="text-xs">{preview.dynamicAudienceNotice}</p>
              ) : null}
              {preview.guardianDeliveryCount != null && preview.guardianDeliveryCount > 0 ? (
                <p className="text-xs">
                  Davon {preview.guardianDeliveryCount} Zustellungen über Erziehungsberechtigte
                  (aggregiert).
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {requireLargeAudienceConfirm && (value.wholeOrganisation || (preview?.effective ?? 0) > 50) ? (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={largeAudienceConfirmed}
            disabled={disabled}
            onChange={(e) => onLargeAudienceConfirmedChange?.(e.target.checked)}
            data-testid="communication-audience-large-confirm"
          />
          <span>Ich bestätige den Versand an eine sehr große Empfängergruppe.</span>
        </label>
      ) : null}
    </section>
  );
}

function PersonAddPanel({
  context,
  disabled,
  excludedIds,
  onPick,
}: {
  context: CommunicationAudienceSelectorContext;
  disabled?: boolean;
  excludedIds: string[];
  onPick: (id: string, label: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Array<{ id: string; label: string; description?: string | null }>>(
    [],
  );
  const anchorRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const term = query.trim();
    if (term.length < MIN_SEARCH) {
      setOptions([]);
      return undefined;
    }
    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/communication/audience/search?context=${encodeURIComponent(context)}&kind=person&q=${encodeURIComponent(term)}`,
        );
        const data = (await res.json()) as { options?: typeof options };
        setOptions((data.options ?? []).filter((o) => !excludedIds.includes(o.id)));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [context, excludedIds, open, query]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Personen</p>
      <div className="relative inline-block">
        <button
          ref={anchorRef}
          type="button"
          disabled={disabled}
          className="inline-flex min-h-10 items-center gap-1 rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          onClick={() => setOpen((v) => !v)}
          data-testid="communication-audience-add-person"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Person
        </button>
        <PopoverContent open={open} onOpenChange={setOpen} anchorRef={anchorRef} className="w-[min(100vw-2rem,20rem)] p-2">
          <input
            className="fca-input mb-2 w-full text-sm"
            placeholder="Name, Team oder E-Mail"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="communication-audience-search-person"
          />
          {loading ? <p className="text-xs text-[var(--muted)]">Suche…</p> : null}
          <ul className="max-h-52 overflow-y-auto">
            {options.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className="block w-full px-2 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
                  onClick={() => {
                    onPick(option.id, option.label);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  {option.label}
                  {option.description ? (
                    <span className="block text-xs text-[var(--text-2)]">{option.description}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </div>
    </div>
  );
}
