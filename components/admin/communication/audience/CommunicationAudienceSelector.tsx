"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Check,
  Mail,
  Plus,
  Search,
  User,
  UserCircle2,
  Users,
  X,
} from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
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
import type { CommunicationAudienceDiscoverCategory } from "@/lib/communication/audience/communication-audience-search-service";

export type CommunicationAudienceSelectorContext = "DIRECT" | "ORGANISATION" | "CAMPAIGN";

export type CommunicationAudienceSelectorFeatures = {
  wholeOrganisation?: boolean;
  orgUnits?: boolean;
  teams?: boolean;
  targetGroups?: boolean;
  roles?: boolean;
  persons?: boolean;
  externalContacts?: boolean;
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
  /** Hides composer heading/summary for embedded use (e.g. Zielgruppen builder). */
  compact?: boolean;
  /** Hides the wide search field trigger; keeps the primary add button. */
  singleAddTrigger?: boolean;
  /** Multi-select in the discover picker; selections apply on confirm. */
  batchDiscoverConfirm?: boolean;
  discoverDialogTitle?: string;
  discoverDialogDescription?: string;
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

type SelectorKind = "team" | "orgUnit" | "role" | "targetGroup" | "person" | "external";

type DiscoverGroup = {
  kind: SelectorKind;
  heading: string;
  options: Array<{ id: string; label: string; description?: string | null }>;
};

const CATEGORY_TABS: { id: CommunicationAudienceDiscoverCategory; label: string }[] = [
  { id: "all", label: "Alle" },
  { id: "orgUnit", label: "Organisation" },
  { id: "team", label: "Teams" },
  { id: "role", label: "Rollen" },
  { id: "person", label: "Personen" },
  { id: "external", label: "Externe" },
  { id: "targetGroup", label: "Zielgruppen" },
];

export type CommunicationAudienceDiscoverPick = {
  kind: SelectorKind;
  id: string;
  label: string;
};

function discoverPickKey(kind: SelectorKind, id: string): string {
  return `${kind}:${id}`;
}

function DiscoverKindIcon({ kind }: { kind: SelectorKind }) {
  if (kind === "orgUnit") return <Building2 className="h-5 w-5" aria-hidden="true" />;
  if (kind === "team") return <Users className="h-5 w-5" aria-hidden="true" />;
  if (kind === "role") return <UserCircle2 className="h-5 w-5" aria-hidden="true" />;
  if (kind === "external") return <Mail className="h-5 w-5" aria-hidden="true" />;
  if (kind === "targetGroup") return <Users className="h-5 w-5" aria-hidden="true" />;
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

export function CommunicationAudienceDiscoverPanel({
  open,
  onOpenChange,
  context,
  disabled,
  enabledFeatures,
  selection,
  onPick,
  dialogTitle = "Empfänger hinzufügen",
  dialogDescription = "Personen, Teams, Rollen oder Zielgruppen auswählen.",
  searchPlaceholder = "Personen, Teams, Organisation oder Rollen suchen …",
  batchConfirm = false,
  onConfirmBatch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: CommunicationAudienceSelectorContext;
  disabled?: boolean;
  enabledFeatures: Required<CommunicationAudienceSelectorFeatures>;
  selection: CommunicationAudienceSelection;
  onPick: (kind: SelectorKind, id: string, label: string) => void;
  dialogTitle?: string;
  dialogDescription?: string;
  searchPlaceholder?: string;
  /** When true, rows toggle pending picks and apply via footer confirm. */
  batchConfirm?: boolean;
  onConfirmBatch?: (picks: CommunicationAudienceDiscoverPick[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CommunicationAudienceDiscoverCategory>("all");
  const [groups, setGroups] = useState<DiscoverGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noAccess, setNoAccess] = useState(false);
  const [pending, setPending] = useState<Map<string, CommunicationAudienceDiscoverPick>>(() => new Map());
  const searchRef = useRef<HTMLInputElement>(null);

  const visibleTabs = useMemo(
    () =>
      CATEGORY_TABS.filter((tab) => {
        if (tab.id === "all") return true;
        if (tab.id === "person") return enabledFeatures.persons;
        if (tab.id === "team") return enabledFeatures.teams;
        if (tab.id === "orgUnit") return enabledFeatures.orgUnits;
        if (tab.id === "role") return enabledFeatures.roles;
        if (tab.id === "targetGroup") return enabledFeatures.targetGroups;
        if (tab.id === "external") return enabledFeatures.externalContacts;
        return false;
      }),
    [enabledFeatures],
  );

  const loadDiscover = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/communication/audience/discover?context=${encodeURIComponent(context)}&category=${encodeURIComponent(category)}&q=${encodeURIComponent(query.trim())}`,
      );
      const data = (await res.json()) as {
        groups?: DiscoverGroup[];
        noAccess?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setGroups([]);
        setError(data.error ?? "Empfänger konnten nicht geladen werden.");
        return;
      }
      setNoAccess(Boolean(data.noAccess));
      setGroups(data.groups ?? []);
    } catch {
      setGroups([]);
      setError("Empfänger konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [category, context, query]);

  useEffect(() => {
    if (!open) return undefined;
    const handle = window.setTimeout(() => {
      void loadDiscover();
    }, query.trim().length >= 2 ? 250 : 0);
    return () => window.clearTimeout(handle);
  }, [loadDiscover, open, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setCategory("all");
      setPending(new Map());
      setError(null);
      setGroups([]);
      return undefined;
    }
    const handle = window.setTimeout(() => searchRef.current?.focus(), 50);
    return () => window.clearTimeout(handle);
  }, [open]);

  function isCommitted(kind: SelectorKind, id: string): boolean {
    if (kind === "person") return selection.personIds.includes(id);
    if (kind === "team") return selection.teamIds.includes(id);
    if (kind === "orgUnit") return selection.orgUnitIds.includes(id);
    if (kind === "role") return selection.roleIds.includes(id);
    if (kind === "external") return selection.externalContactIds.includes(id);
    return selection.targetGroupIds.includes(id);
  }

  function isRowSelected(kind: SelectorKind, id: string): boolean {
    const key = discoverPickKey(kind, id);
    if (batchConfirm) return pending.has(key) || isCommitted(kind, id);
    return isCommitted(kind, id);
  }

  function togglePending(kind: SelectorKind, id: string, label: string) {
    const key = discoverPickKey(kind, id);
    setPending((prev) => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, { kind, id, label });
      return next;
    });
  }

  function handleRowActivate(kind: SelectorKind, id: string, label: string) {
    if (disabled) return;
    if (batchConfirm) {
      if (isCommitted(kind, id)) return;
      togglePending(kind, id, label);
      return;
    }
    if (isCommitted(kind, id)) return;
    onPick(kind, id, label);
  }

  const pendingCount = pending.size;

  function handleConfirm() {
    if (pendingCount === 0) return;
    const picks = [...pending.values()];
    if (onConfirmBatch) {
      onConfirmBatch(picks);
    } else {
      for (const pick of picks) {
        onPick(pick.kind, pick.id, pick.label);
      }
    }
    onOpenChange(false);
  }

  const listContent = (
    <>
      {loading ? (
        <div
          className="space-y-1 py-1"
          aria-busy="true"
          data-testid="communication-audience-loading"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <DiscoverRowSkeleton key={i} />
          ))}
        </div>
      ) : null}
      {error ? (
        <div className="space-y-3 py-2">
          <p className="text-sm text-red-600" role="alert" data-testid="communication-audience-error">
            {error}
          </p>
          <Button type="button" variant="secondary" onClick={() => void loadDiscover()}>
            Erneut versuchen
          </Button>
        </div>
      ) : null}
      {!loading && !error && noAccess ? (
        <p className="py-6 text-sm text-[var(--text-2)]" data-testid="communication-audience-no-access">
          Keine verfügbaren Empfänger.
        </p>
      ) : null}
      {!loading && !error && !noAccess && groups.length === 0 ? (
        <p className="py-6 text-sm text-[var(--text-2)]" data-testid="communication-audience-empty-search">
          Keine passenden Ergebnisse
        </p>
      ) : null}
      {!loading && !error
        ? groups.map((group) => {
            return (
              <div key={group.kind} className="mb-5 last:mb-0">
                <p className="mb-2 border-b border-[var(--border)] pb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {group.heading}
                </p>
                <ul role="listbox" aria-label={group.heading} className="space-y-1">
                  {group.options.map((option) => {
                    const committed = isCommitted(group.kind, option.id);
                    const selected = isRowSelected(group.kind, option.id);
                    const pendingActive =
                      batchConfirm && pending.has(discoverPickKey(group.kind, option.id));
                    const rowDisabled = disabled || (committed && !batchConfirm);
                    const secondary =
                      option.description?.trim() ||
                      (group.kind === "orgUnit"
                        ? "Organisationseinheit"
                        : group.kind === "role"
                          ? "Rolle"
                          : group.kind === "external"
                            ? "Externer Kontakt"
                            : group.kind === "person"
                              ? "Person"
                              : null);
                    return (
                      <li key={`${group.kind}-${option.id}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          disabled={rowDisabled || (batchConfirm && committed)}
                          className={`flex w-full min-h-12 items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] ${
                            selected
                              ? "border-[var(--sce-primary)]/40 bg-[var(--sce-primary)]/5"
                              : "border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-2)]"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                          data-testid={`communication-audience-option-${group.kind}-${option.id}`}
                          onClick={() => handleRowActivate(group.kind, option.id, option.label)}
                        >
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--sce-primary)]"
                            aria-hidden="true"
                          >
                            <DiscoverKindIcon kind={group.kind} />
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
                              pendingActive || (!batchConfirm && committed)
                                ? "border-[var(--sce-primary)] bg-[var(--sce-primary)] text-white"
                                : selected
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
              </div>
            );
          })
        : null}
    </>
  );

  return (
    <Sheet
      open={open}
      onClose={() => onOpenChange(false)}
      title={dialogTitle}
      description={dialogDescription}
      footer={
        batchConfirm ? (
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--foreground)]" data-testid="communication-audience-pending-count">
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
                data-testid="communication-audience-confirm-picks"
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
        data-testid="communication-audience-picker-panel"
      >
        <div className="relative shrink-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            className="fca-input w-full py-2.5 pl-10 text-base"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="communication-audience-unified-search"
            aria-label="Empfänger suchen"
            disabled={disabled}
          />
        </div>
        <div
          className="flex shrink-0 gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Empfängerkategorien"
        >
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={category === tab.id}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] ${
                category === tab.id
                  ? "bg-[var(--sce-primary)] text-white"
                  : "bg-[var(--surface-2)] text-[var(--text-2)] hover:bg-[var(--surface-3)]"
              }`}
              onClick={() => setCategory(tab.id)}
              data-testid={`communication-audience-category-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="min-h-[12rem] flex-1 overflow-y-auto pr-1" aria-live="polite">
          {listContent}
        </div>
      </div>
    </Sheet>
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
  compact = false,
  singleAddTrigger = false,
  batchDiscoverConfirm = false,
  discoverDialogTitle,
  discoverDialogDescription,
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
  const [recipientDetailOpen, setRecipientDetailOpen] = useState(false);
  const [recipientDetail, setRecipientDetail] = useState<
    { personId: string; displayName: string }[] | null
  >(null);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const discoverAnchorRef = useRef<HTMLButtonElement>(null);

  const enabledFeatures = useMemo(
    () => ({
      wholeOrganisation: features?.wholeOrganisation ?? capabilities?.wholeOrganisation ?? true,
      orgUnits: features?.orgUnits ?? capabilities?.orgUnits ?? true,
      teams: features?.teams ?? capabilities?.teams ?? true,
      targetGroups: features?.targetGroups ?? capabilities?.targetGroups ?? true,
      roles: features?.roles ?? capabilities?.roles ?? true,
      persons: features?.persons ?? capabilities?.persons ?? true,
      externalContacts:
        features?.externalContacts ?? capabilities?.externalContacts ?? true,
    }),
    [capabilities, features],
  );

  const selectorFeaturesAvailable = useMemo(
    () =>
      enabledFeatures.persons ||
      enabledFeatures.externalContacts ||
      enabledFeatures.teams ||
      enabledFeatures.orgUnits ||
      enabledFeatures.roles ||
      enabledFeatures.targetGroups,
    [enabledFeatures],
  );

  const capabilitiesLoaded = capabilities !== null || features !== undefined;

  useEffect(() => {
    if (features) return undefined;
    async function loadCapabilities() {
      try {
        const res = await fetch(
          `/api/communication/audience/capabilities?context=${encodeURIComponent(context)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          capabilities?: CommunicationAudienceSelectorFeatures & { externalContacts?: boolean };
        };
        setCapabilities(data.capabilities ?? null);
      } catch {
        /* ignore */
      }
    }
    void loadCapabilities();
  }, [context, features]);

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
  const selectionCount =
    value.orgUnitIds.length +
    value.teamIds.length +
    value.roleIds.length +
    value.targetGroupIds.length +
    value.personIds.length +
    value.externalContactIds.length +
    (value.wholeOrganisation ? 1 : 0);

  useEffect(() => {
    if (!hasSelection) {
      setPreview(null);
      setRecipientDetail(null);
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
          body: JSON.stringify({
            audienceSpec,
            context,
            kind: previewKind,
            includeRecipientDetail: recipientDetailOpen,
          }),
        });
        const data = (await res.json()) as CommunicationAudiencePreviewState & {
          error?: string;
          recipients?: { personId: string; displayName: string }[];
        };
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
          if (recipientDetailOpen && data.recipients) {
            setRecipientDetail(data.recipients);
          }
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
  }, [context, hasSelection, onPreviewChange, previewKind, recipientDetailOpen, value]);

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

  function addExternalContact(id: string, label: string) {
    if (value.wholeOrganisation || value.externalContactIds.includes(id)) return;
    registerLabel("persons", id, label);
    onChange({ ...value, externalContactIds: [...value.externalContactIds, id] });
  }

  function appendPickToSelection(
    base: CommunicationAudienceSelection,
    kind: SelectorKind,
    id: string,
    label: string,
  ): CommunicationAudienceSelection {
    if (base.wholeOrganisation) return base;
    if (kind === "person") {
      if (base.personIds.includes(id)) return base;
      registerLabel("persons", id, label);
      return { ...base, personIds: [...base.personIds, id] };
    }
    if (kind === "external") {
      if (base.externalContactIds.includes(id)) return base;
      registerLabel("persons", id, label);
      return { ...base, externalContactIds: [...base.externalContactIds, id] };
    }
    if (kind === "team") {
      if (base.teamIds.includes(id)) return base;
      registerLabel("teams", id, label);
      return { ...base, teamIds: [...base.teamIds, id] };
    }
    if (kind === "orgUnit") {
      if (base.orgUnitIds.includes(id)) return base;
      registerLabel("orgUnits", id, label);
      return { ...base, orgUnitIds: [...base.orgUnitIds, id] };
    }
    if (kind === "role") {
      if (base.roleIds.includes(id)) return base;
      registerLabel("roles", id, label);
      return { ...base, roleIds: [...base.roleIds, id] };
    }
    if (base.targetGroupIds.includes(id)) return base;
    registerLabel("targetGroups", id, label);
    return { ...base, targetGroupIds: [...base.targetGroupIds, id] };
  }

  function handleDiscoverPick(kind: SelectorKind, id: string, label: string) {
    if (kind === "person") {
      addPerson(id, label);
      return;
    }
    if (kind === "external") {
      addExternalContact(id, label);
      return;
    }
    if (kind === "team") {
      addStructural("teamIds", "teams", id, label);
      return;
    }
    if (kind === "orgUnit") {
      addStructural("orgUnitIds", "orgUnits", id, label);
      return;
    }
    if (kind === "role") {
      addStructural("roleIds", "roles", id, label);
      return;
    }
    addStructural("targetGroupIds", "targetGroups", id, label);
  }

  function handleDiscoverBatchConfirm(picks: CommunicationAudienceDiscoverPick[]) {
    let next = value;
    for (const pick of picks) {
      next = appendPickToSelection(next, pick.kind, pick.id, pick.label);
    }
    if (next !== value) {
      onChange(next);
      onLargeAudienceConfirmedChange?.(false);
    }
  }

  function openDiscover() {
    if (disabled || !selectorFeaturesAvailable) return;
    setDiscoverOpen(true);
  }

  return (
    <section className="space-y-4" data-testid="communication-audience-selector">
      {!compact ? (
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Empfänger</h3>
          <p className="mt-1 text-xs text-[var(--text-2)]">{summary}</p>
        </div>
      ) : null}

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
          {capabilitiesLoaded && !selectorFeaturesAvailable ? (
            <p className="text-sm text-[var(--text-2)]" data-testid="communication-audience-no-access">
              Keine verfügbaren Empfänger.
            </p>
          ) : (
            <div className="space-y-2">
              {!singleAddTrigger ? (
                <button
                  ref={discoverAnchorRef}
                  type="button"
                  disabled={disabled || !selectorFeaturesAvailable}
                  className="flex w-full min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-sm text-[var(--text-2)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
                  onClick={openDiscover}
                  data-testid="communication-audience-open-trigger"
                  aria-expanded={discoverOpen}
                  aria-haspopup="dialog"
                >
                  <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
                  Personen, Teams oder Zielgruppen suchen
                </button>
              ) : null}
              <button
                ref={singleAddTrigger ? discoverAnchorRef : undefined}
                type="button"
                disabled={disabled || !selectorFeaturesAvailable}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-4 py-2.5 text-sm font-semibold text-[var(--sce-primary)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] sm:w-auto"
                onClick={openDiscover}
                data-testid="communication-audience-add-trigger"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {singleAddTrigger ? "+ Empfänger hinzufügen" : "Empfänger hinzufügen"}
              </button>
              <CommunicationAudienceDiscoverPanel
                open={discoverOpen}
                onOpenChange={setDiscoverOpen}
                context={context}
                disabled={disabled}
                enabledFeatures={enabledFeatures}
                selection={value}
                onPick={handleDiscoverPick}
                batchConfirm={batchDiscoverConfirm}
                onConfirmBatch={batchDiscoverConfirm ? handleDiscoverBatchConfirm : undefined}
                dialogTitle={discoverDialogTitle}
                dialogDescription={discoverDialogDescription}
              />
            </div>
          )}

          {hasSelection ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Ausgewählt
              </p>
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
                {value.externalContactIds.map((id) => (
                  <TokenChip
                    key={`external-${id}`}
                    typeLabel="Extern"
                    valueLabel={labels.persons[id] ?? id}
                    disabled={disabled}
                    testId={`communication-audience-token-external-${id}`}
                    onRemove={() =>
                      onChange({
                        ...value,
                        externalContactIds: value.externalContactIds.filter((x) => x !== id),
                      })
                    }
                  />
                ))}
              </div>
              {selectionCount > 0 && preview ? (
                <p className="mt-2 text-xs text-[var(--text-2)]" data-testid="communication-audience-selection-count">
                  {selectionCount} Auswahl{selectionCount === 1 ? "" : "en"} · {preview.effective}{" "}
                  aufgelöste Empfänger
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {!compact && !hasSelection ? (
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
              {preview.effective > 0 ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-[var(--sce-primary)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
                  data-testid="communication-audience-show-recipients"
                  onClick={() => setRecipientDetailOpen((v) => !v)}
                >
                  {recipientDetailOpen ? "Empfänger ausblenden" : "Empfänger anzeigen"}
                </button>
              ) : null}
              {recipientDetailOpen && recipientDetail && recipientDetail.length > 0 ? (
                <ul className="mt-1 max-h-40 overflow-y-auto text-xs" data-testid="communication-audience-recipient-detail">
                  {recipientDetail.map((r) => (
                    <li key={r.personId}>{r.displayName}</li>
                  ))}
                </ul>
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
