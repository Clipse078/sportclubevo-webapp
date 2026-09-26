"use client";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Loader2,
  Monitor,
  Save,
  Shirt,
  Volleyball,
  X,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/Badge";
import { SectionCard } from "@/components/ui/page/SectionCard";
import {
  withRequiredCodes,
  type FacilityResourceOption,
} from "@/lib/facilities/resource-options";
import { useFacilityAvailability } from "@/hooks/use-facility-availability";
import { formatAvailabilitySuffix } from "@/components/admin/training/FacilityResourceSelector";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { formatOperationalHistoryLabel } from "@/lib/matchcenter/operational-history";
import { PlanningSingleResourceAssignment } from "@/components/admin/shared/planning/PlanningSingleResourceAssignment";
import { PlanningMatchDressingRoomAssignments } from "@/components/admin/shared/planning/PlanningMatchDressingRoomAssignments";
import { useTranslations } from "next-intl";
import TrainingRecordSection from "@/components/admin/training/record/TrainingRecordSection";
import { assessMatchOperationalState } from "@/lib/matchcenter/operational-state";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type MatchOperationalActionsBinding = {
  save: () => Promise<void>;
  isDirty: boolean;
  saving: boolean;
};

export type MatchcenterDetailOperationalProps = {
  matchId: string;
  homeAway: string | null;
  homeDisplayName: string;
  awayDisplayName: string;
  homeIsOwnTeam: boolean;
  awayIsOwnTeam: boolean;
  /** Current teamId on Event (the internal FC Allschwil team) */
  currentTeamId: string | null;
  /** Current pitch code */
  currentPitchCode: string | null;
  /** Current home dressing room code */
  currentHomeDressingRoomCode: string | null;
  /** Current away dressing room code */
  currentAwayDressingRoomCode: string | null;
  /** Current website visibility */
  currentWebsiteVisible: boolean;
  /** Current infoboard visibility */
  currentInfoboardVisible: boolean;
  currentWochenplanVisible?: boolean;
  currentHomepageVisible?: boolean;
  currentTeamPageVisible?: boolean;
  /** ISO date string for infoboard preview link */
  matchDateIso: string;
  /**
   * RESOURCE-AVAILABILITY-UX-01 — the match's own end (ISO), used together
   * with matchDateIso (start) to show live Frei/Belegt availability for
   * the pitch/dressing-room selectors below. This match's own existing
   * allocation is excluded server-side (excludeEventId=matchId) so editing
   * a match never flags its own booking as a conflict with itself.
   */
  matchEndAtIso?: string | null;
  canManage: boolean;
  /**
   * MASTERDATA-CONSISTENCY-02 — canonical, tenant-scoped, active pitch/hall
   * FacilityResource options (PITCH_HALL group), resolved server-side via
   * getActiveResourceOptionsForTenant(). Replaces the static
   * FCA_PITCH_ALLOCATIONS registry as the source of truth for new
   * assignments. Defaults to an empty list; the currently assigned code (if
   * any) is always kept selectable via withRequiredCodes() below, even when
   * it is archived/renamed and therefore absent from this list.
   */
  pitchOptions?: FacilityResourceOption[];
  /**
   * Canonical, tenant-scoped, active dressing-room FacilityResource options
   * (DRESSING_ROOM type), shared by both the home and away selectors.
   * Replaces the static FCA_DRESSING_ROOMS registry.
   */
  dressingRoomOptions?: FacilityResourceOption[];
  /**
   * PLANNING-RESOURCE-UX-01 — when provided, pitch/hall visual card pickers
   * replace the legacy code-based <select>. The same availability data is
   * reused; resources are keyed by their canonical code since Match still
   * persists pitchCode / dressingRoomCode on Event.
   */
  pitchHallFacilityGroups?: FacilityGroup[];
  /**
   * PLANNING-RESOURCE-UX-01 — when provided, dressing-room visual card
   * pickers replace the legacy code-based <select>.
   */
  dressingRoomFacilityGroups?: FacilityGroup[];
  /**
   * Canonical operational cutoff — when false, no editable facility planning
   * or readiness workflow is shown. Historical allocations may render read-only.
   */
  isOperationallyActionable?: boolean;
  layout?: "default" | "record";
  hideFooterActions?: boolean;
  /** When true, publication toggles render outside this component (e.g. record right rail). */
  suppressPublicationUI?: boolean;
  publicationValues?: {
    websiteVisible: boolean;
    infoboardVisible: boolean;
    homepageVisible: boolean;
    wochenplanVisible: boolean;
    teamPageVisible: boolean;
  };
  onPublicationChange?: (
    patch: Partial<NonNullable<MatchcenterDetailOperationalProps["publicationValues"]>>,
  ) => void;
  onActionsBinding?: (binding: MatchOperationalActionsBinding) => void;
  assessmentBase?: MatchcenterMatchSummary;
};

// ── Readiness helpers ─────────────────────────────────────────────────────────

type ReadinessState = "ready" | "not-ready" | "not-relevant";

type ReadinessCheck = {
  label: string;
  passed: boolean;
};

function computeReadiness(
  homeAway: string | null,
  ownTeamAssigned: boolean,
  pitchCode: string | null,
  homeDressingRoomCode: string | null,
  awayDressingRoomCode: string | null,
  infoboardVisible: boolean,
): {
  state: ReadinessState;
  checks: ReadinessCheck[];
} {
  const normalized = homeAway?.trim().toUpperCase() ?? null;

  if (normalized !== "HOME") {
    return {
      state: "not-relevant",
      checks: [],
    };
  }

  const checks: ReadinessCheck[] = [
    { label: "Heimspiel bestätigt", passed: true },
    { label: "FC-Allschwil-Team zugeordnet", passed: ownTeamAssigned },
    { label: "Spielfeld zugeordnet", passed: Boolean(pitchCode?.trim()) },
    {
      label: "Garderobe Heimteam zugeordnet",
      passed: Boolean(homeDressingRoomCode?.trim()),
    },
    {
      label: "Garderobe Gastteam zugeordnet",
      passed: Boolean(awayDressingRoomCode?.trim()),
    },
    { label: "Für Infoboard freigegeben", passed: infoboardVisible },
  ];

  const allPassed = checks.every((c) => c.passed);

  return {
    state: allPassed ? "ready" : "not-ready",
    checks,
  };
}

/**
 * Computes a specific German allocation warning message for the infoboard
 * readiness section.
 *
 * Returns a message string when all of the following are true:
 *   - homeAway = "HOME"
 *   - infoboardVisible = true
 *   - at least one allocation is missing (pitch, home dressing room, or away dressing room)
 *
 * Returns null when no warning applies (away match, infoboard disabled, or fully allocated).
 *
 * Example messages:
 *   "Es fehlt noch die Platzzuteilung."
 *   "Es fehlen noch Heimkabine und Gästekabine."
 *   "Es fehlen noch Platz, Heimkabine und Gästekabine."
 */
export function computeAllocationWarning(
  homeAway: string | null,
  infoboardVisible: boolean,
  pitchCode: string | null,
  homeDressingRoomCode: string | null,
  awayDressingRoomCode: string | null,
): string | null {
  const isHome = homeAway?.trim().toUpperCase() === "HOME";
  if (!isHome || !infoboardVisible) return null;

  const missing: string[] = [];
  if (!pitchCode?.trim()) missing.push("Platz");
  if (!homeDressingRoomCode?.trim()) missing.push("Heimkabine");
  if (!awayDressingRoomCode?.trim()) missing.push("Gästekabine");

  if (missing.length === 0) return null;

  if (missing.length === 1) {
    const item = missing[0]!;
    // "die" for "Platz" → "die Platzzuteilung", for rooms use nominative
    if (item === "Platz") return "Es fehlt noch die Platzzuteilung.";
    return `Es fehlt noch ${item}.`;
  }

  const last = missing[missing.length - 1]!;
  const rest = missing.slice(0, -1);
  return `Es fehlen noch ${rest.join(", ")} und ${last}.`;
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Transforms FacilityGroup[] to use the resource's `code` as its `id`, so that
 * the visual pickers (which are ID-keyed) can be driven by code-keyed
 * availability without a separate ID-keyed fetch. Match events still persist
 * resource codes on Event — this mapping is purely a UI adaptation.
 */
function facilityGroupsWithCodeAsId(groups: FacilityGroup[]): FacilityGroup[] {
  return groups.map((fg) => ({
    ...fg,
    resources: fg.resources.map((r) => ({ ...r, id: r.code })),
  }));
}

function resourceLabelFromCode(groups: FacilityGroup[] | null | undefined, code: string): string {
  if (!code.trim() || !groups) return code;
  for (const fg of groups) {
    const resource = fg.resources.find((r) => r.id === code);
    if (resource) return resource.name;
  }
  return code;
}

export default function MatchcenterDetailOperational({
  matchId,
  homeAway,
  homeDisplayName,
  awayDisplayName,
  currentTeamId,
  currentPitchCode,
  currentHomeDressingRoomCode,
  currentAwayDressingRoomCode,
  currentWebsiteVisible,
  currentInfoboardVisible,
  matchDateIso,
  matchEndAtIso,
  canManage,
  pitchOptions = [],
  dressingRoomOptions = [],
  pitchHallFacilityGroups,
  dressingRoomFacilityGroups,
  isOperationallyActionable = true,
  currentWochenplanVisible = false,
  currentHomepageVisible = false,
  currentTeamPageVisible = false,
  layout = "default",
  hideFooterActions = false,
  suppressPublicationUI = false,
  publicationValues,
  onPublicationChange,
  onActionsBinding,
  assessmentBase,
}: MatchcenterDetailOperationalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const tResources = useTranslations("PlanningResources");

  // PLANNING-RESOURCE-UX-01 — code-as-ID groups for the visual pickers.
  // Match events persist resource codes, so we transform groups to use `code`
  // as the picker's "ID" — onSelect returns the code, which we store directly.
  const pitchGroupsByCode = useMemo(
    () => (pitchHallFacilityGroups ? facilityGroupsWithCodeAsId(pitchHallFacilityGroups) : null),
    [pitchHallFacilityGroups],
  );
  const dressingRoomGroupsByCode = useMemo(
    () => (dressingRoomFacilityGroups ? facilityGroupsWithCodeAsId(dressingRoomFacilityGroups) : null),
    [dressingRoomFacilityGroups],
  );
  const useVisualPickers = Boolean(pitchGroupsByCode);

  // RESOURCE-AVAILABILITY-UX-01 — same live availability foundation as the
  // guided create forms (lib/facilities/availability-service.ts via
  // GET /api/facilities/availability), keyed by resource `code` here
  // because this legacy operational view still uses the FCA_PITCH_ALLOCATIONS
  // -era code-based native <select>s (see module doc above), not
  // FacilityResourceSelector. Only relevant for HOME matches, mirroring the
  // existing readiness/allocation-warning gating on this same page.
  const isHomeForAvailability = homeAway?.trim().toUpperCase() === "HOME";
  const { pitchAvailability: pitchAvailabilityByCode, dressingRoomAvailability: dressingRoomAvailabilityByCode } =
    useFacilityAvailability({
      enabled: isHomeForAvailability,
      startAt: matchDateIso,
      endAt: matchEndAtIso,
      excludeEventId: matchId,
      keyBy: "code",
    });

  // MASTERDATA-CONSISTENCY-02 — historical compatibility: keep the
  // currently-persisted code selectable even if it no longer resolves to an
  // active resource (archived or renamed-away), so existing allocations are
  // never silently cleared by this selector.
  const effectivePitchOptions = useMemo(
    () => withRequiredCodes(pitchOptions, [currentPitchCode]),
    [pitchOptions, currentPitchCode],
  );
  const effectiveDressingRoomOptions = useMemo(
    () =>
      withRequiredCodes(dressingRoomOptions, [
        currentHomeDressingRoomCode,
        currentAwayDressingRoomCode,
      ]),
    [dressingRoomOptions, currentHomeDressingRoomCode, currentAwayDressingRoomCode],
  );

  // ── Form state ─────────────────────────────────────────────────────────────
  const teamId = currentTeamId ?? "";
  const [pitchCode, setPitchCode] = useState(currentPitchCode ?? "");
  const [homeDressingRoomCode, setHomeDressingRoomCode] = useState(
    currentHomeDressingRoomCode ?? "",
  );
  const [awayDressingRoomCode, setAwayDressingRoomCode] = useState(
    currentAwayDressingRoomCode ?? "",
  );

  const pitchResourceName = useMemo(
    () => (pitchCode.trim() ? resourceLabelFromCode(pitchGroupsByCode, pitchCode) : null),
    [pitchCode, pitchGroupsByCode],
  );
  const [internalPublication, setInternalPublication] = useState({
    websiteVisible: currentWebsiteVisible,
    infoboardVisible: currentInfoboardVisible,
    homepageVisible: currentHomepageVisible,
    wochenplanVisible: currentWochenplanVisible,
    teamPageVisible: currentTeamPageVisible,
  });

  const publication = publicationValues ?? internalPublication;

  function patchPublication(
    patch: Partial<NonNullable<MatchcenterDetailOperationalProps["publicationValues"]>>,
  ) {
    if (publicationValues && onPublicationChange) {
      onPublicationChange(patch);
      return;
    }
    setInternalPublication((prev) => ({ ...prev, ...patch }));
  }

  const {
    websiteVisible,
    infoboardVisible,
    homepageVisible,
    wochenplanVisible,
    teamPageVisible,
  } = publication;

  // ── Save ───────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  const isDirty =
    (pitchCode ?? "") !== (currentPitchCode ?? "") ||
    (homeDressingRoomCode ?? "") !== (currentHomeDressingRoomCode ?? "") ||
    (awayDressingRoomCode ?? "") !== (currentAwayDressingRoomCode ?? "") ||
    websiteVisible !== currentWebsiteVisible ||
    infoboardVisible !== currentInfoboardVisible ||
    homepageVisible !== currentHomepageVisible ||
    wochenplanVisible !== currentWochenplanVisible ||
    teamPageVisible !== currentTeamPageVisible;

  const handleSave = useCallback(async () => {
    setSaving(true);

    try {
      const res = await fetch(`/api/matchcenter/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: teamId.trim() || null,
          pitchCode: pitchCode.trim() || null,
          homeDressingRoomCode: homeDressingRoomCode.trim() || null,
          awayDressingRoomCode: awayDressingRoomCode.trim() || null,
          websiteVisible,
          infoboardVisible,
          homepageVisible,
          wochenplanVisible,
          teamPageVisible,
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!res.ok) {
        throw new Error(
          data?.error ?? "Änderungen konnten nicht gespeichert werden.",
        );
      }

      toast.success("Änderungen gespeichert.");
      router.refresh();
    } catch (err) {
      toast.danger(
        err instanceof Error
          ? err.message
          : "Änderungen konnten nicht gespeichert werden.",
        { duration: 6000 },
      );
    } finally {
      setSaving(false);
    }
  }, [
    awayDressingRoomCode,
    currentAwayDressingRoomCode,
    currentHomeDressingRoomCode,
    currentHomepageVisible,
    currentInfoboardVisible,
    currentPitchCode,
    currentTeamPageVisible,
    currentWebsiteVisible,
    currentWochenplanVisible,
    homeDressingRoomCode,
    homepageVisible,
    infoboardVisible,
    matchId,
    pitchCode,
    router,
    teamId,
    teamPageVisible,
    toast,
    websiteVisible,
    wochenplanVisible,
  ]);

  useEffect(() => {
    onActionsBinding?.({ save: handleSave, isDirty, saving });
  }, [handleSave, isDirty, onActionsBinding, saving]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const normalizedHomeAway = homeAway?.trim().toUpperCase() ?? null;
  const isHomeMatch = normalizedHomeAway === "HOME";
  const isAwayMatch = normalizedHomeAway === "AWAY";

  const ownTeamAssigned = Boolean(teamId.trim());

  const { state: readinessState, checks: readinessChecks } = computeReadiness(
    homeAway,
    ownTeamAssigned,
    pitchCode,
    homeDressingRoomCode,
    awayDressingRoomCode,
    infoboardVisible,
  );

  const allocationWarning = computeAllocationWarning(
    homeAway,
    infoboardVisible,
    pitchCode,
    homeDressingRoomCode,
    awayDressingRoomCode,
  );

  const previewDate = matchDateIso.split("T")[0] ?? matchDateIso;
  const previewHref = `/dashboard/infoboard?date=${previewDate}`;

  const operationalHistoryLabel = formatOperationalHistoryLabel(
    {
      pitchCode: currentPitchCode,
      homeDressingRoomCode: currentHomeDressingRoomCode,
      awayDressingRoomCode: currentAwayDressingRoomCode,
    },
    {
      pitchOptions: effectivePitchOptions,
      dressingRoomOptions: effectiveDressingRoomOptions,
    },
  );

  const liveAssessment = useMemo(() => {
    if (!assessmentBase) return null;
    return assessMatchOperationalState({
      ...assessmentBase,
      operational: {
        ...assessmentBase.operational,
        pitchCode: pitchCode.trim() || null,
        homeDressingRoomCode: homeDressingRoomCode.trim() || null,
        awayDressingRoomCode: awayDressingRoomCode.trim() || null,
      },
      visibility: {
        ...assessmentBase.visibility,
        websiteVisible,
        infoboardVisible,
      },
    });
  }, [
    assessmentBase,
    awayDressingRoomCode,
    homeDressingRoomCode,
    infoboardVisible,
    pitchCode,
    websiteVisible,
  ]);

  const preparationChecks = useMemo(() => {
    if (!liveAssessment || !isHomeMatch) return [];
    const openKeys = new Set(liveAssessment.actions.map((action) => action.key));
    const rows: { key: string; label: string; passed: boolean }[] = [
      { key: "pitch", label: "Spielfeld", passed: !openKeys.has("pitch") },
      { key: "home-dressing-room", label: "Heimkabine", passed: !openKeys.has("home-dressing-room") },
      { key: "away-dressing-room", label: "Gastkabine", passed: !openKeys.has("away-dressing-room") },
      { key: "infoboard", label: "Infoboard", passed: !openKeys.has("infoboard") },
    ];
    if (openKeys.has("team")) {
      rows.unshift({ key: "team", label: "Team zugeordnet", passed: false });
    }
    return rows;
  }, [isHomeMatch, liveAssessment]);

  if (!isOperationallyActionable && layout === "record") {
    return (
      <TrainingRecordSection title="Ressourcen" testId="spiele-record-section-resources-history">
        {operationalHistoryLabel ? (
          <p className="text-sm font-medium text-[var(--foreground)]" data-testid="matchcenter-operational-history-label">
            {operationalHistoryLabel}
          </p>
        ) : (
          <p className="text-sm text-[var(--text-2)]">Keine historischen Zuteilungen.</p>
        )}
      </TrainingRecordSection>
    );
  }

  if (!isOperationallyActionable) {
    return (
      <div className="space-y-5" data-testid="matchcenter-operational-history">
        {operationalHistoryLabel ? (
          <SectionCard
            title="Organisation"
            description="Historische Zuteilungen"
          >
            <p
              className="text-sm font-medium text-[var(--foreground)]"
              data-testid="matchcenter-operational-history-label"
            >
              {operationalHistoryLabel}
            </p>
          </SectionCard>
        ) : null}
      </div>
    );
  }

  const recordSurface = layout === "record";

  const publicationContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Website</p>
          <p className="text-xs text-[var(--muted)]">
            Das Spiel wird im Spielplan und in den nächsten Spielen auf der Website angezeigt.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={websiteVisible}
          onClick={() => canManage && !saving && patchPublication({ websiteVisible: !websiteVisible })}
          disabled={!canManage || saving}
          data-testid="website-visible-toggle"
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 ${
            websiteVisible ? "bg-emerald-500" : "bg-[var(--border-strong)]"
          } ${!canManage ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              websiteVisible ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div
        className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 px-4 py-3"
        data-testid="spiele-record-wochenplan-status"
      >
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Wochenplan</p>
          <p className="text-xs text-[var(--muted)]">
            {currentWochenplanVisible
              ? "Dieses Spiel ist für den öffentlichen Wochenplan markiert (sofern Website aktiv ist)."
              : "Nicht im öffentlichen Wochenplan markiert. Bulk-Aktionen im Spiele-Overview verfügbar."}
          </p>
        </div>
        <span className="text-xs font-semibold text-[var(--text-2)]">
          {currentWochenplanVisible ? "Aktiv" : "Aus"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Infoboard</p>
          <p className="text-xs text-[var(--muted)]">
            {isAwayMatch
              ? recordSurface
                ? "Auswärtsspiele erscheinen nicht auf dem Vereins-Infoboard."
                : "Dieses Auswärtsspiel kann nicht auf dem FC-Allschwil-Infoboard veröffentlicht werden."
              : isHomeMatch
                ? "Dieses Heimspiel erscheint auf dem Infoboard, sofern es freigegeben ist und nicht abgesagt wurde."
                : "Infoboard-Freigabe für Heimspiele."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={infoboardVisible}
          onClick={() =>
            canManage && !saving && !isAwayMatch && patchPublication({ infoboardVisible: !infoboardVisible })
          }
          disabled={!canManage || saving || isAwayMatch}
          data-testid="infoboard-visible-toggle"
          aria-label="Auf Infoboard anzeigen"
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 ${
            infoboardVisible && !isAwayMatch ? "bg-emerald-500" : "bg-[var(--border-strong)]"
          } ${!canManage || isAwayMatch ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              infoboardVisible && !isAwayMatch ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <p className="text-xs text-[var(--muted)]">
        Die Freigabe allein genügt nicht. Das Spiel wird nur angezeigt, wenn alle Publikationsregeln
        erfüllt sind.
      </p>

      {recordSurface && isHomeMatch ? (
        <a
          href={previewHref}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="infoboard-preview-link"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--sce-primary)] hover:underline"
        >
          <ProductDomainSceIcon name="infoboard" size={12} className="h-3.5 w-3.5" />
          Infoboard-Vorschau öffnen
          <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
        </a>
      ) : null}
    </div>
  );

  const footerActions = (
    <div className="flex flex-wrap items-center gap-3">
      {canManage ? (
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          data-testid="save-match-operational"
          className="fca-button-primary"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Wird gespeichert...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Änderungen speichern
            </>
          )}
        </button>
      ) : null}

      {!recordSurface ? (
        <a
          href={previewHref}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="infoboard-preview-link"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-2 text-sm font-semibold text-[var(--text-2)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
        >
          <ProductDomainSceIcon name="infoboard" size={12} />
          Infoboard-Vorschau öffnen
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
      ) : null}

      {readinessState === "not-ready" && !recordSurface ? (
        <Badge variant="warning" size="sm">
          <CircleAlert className="h-3 w-3" />
          Einrichtung erforderlich
        </Badge>
      ) : null}
    </div>
  );

  const publicationSection = recordSurface ? (
    <TrainingRecordSection title="Veröffentlichung" testId="spiele-record-section-publication">
      {publicationContent}
    </TrainingRecordSection>
  ) : (
    <SectionCard title="Veröffentlichung" description="Ausgabekanäle für dieses Match">
      {publicationContent}
    </SectionCard>
  );

  return (
    <div className={recordSurface ? undefined : "space-y-5"}>
      {recordSurface && !suppressPublicationUI ? publicationSection : null}
      {!recordSurface ? publicationSection : null}

      {recordSurface && isHomeMatch ? (
        <TrainingRecordSection title="Matchvorbereitung" testId="spiele-record-section-preparation">
          <ul className="space-y-2" data-testid="spiele-record-preparation-checks">
            {preparationChecks.map((row) => (
              <li key={row.key} className="flex items-center gap-2 text-sm">
                {row.passed ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                ) : (
                  <CircleAlert className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                )}
                <span className={row.passed ? "text-[var(--foreground)]" : "text-amber-100/95"}>
                  {row.passed ? row.label : `${row.label} fehlt`}
                </span>
              </li>
            ))}
          </ul>
          {allocationWarning ? (
            <p
              className="mt-3 text-xs text-amber-200/90"
              data-testid="infoboard-allocation-warning-text"
            >
              {allocationWarning}
            </p>
          ) : null}
        </TrainingRecordSection>
      ) : null}

      {/* D2 — Infoboard Readiness (HOME actionable only) */}
      {!recordSurface && isHomeMatch ? (
      <SectionCard
        title="Infoboard-Bereitschaft"
        description="Prüfung der Voraussetzungen für die Infoboard-Anzeige"
      >
        {readinessState === "not-relevant" ? (
          <div
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            data-testid="infoboard-readiness-not-relevant"
          >
            <X className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Nicht relevant
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Auswärtsspiele werden nicht auf dem FC-Allschwil-Infoboard
                angezeigt.
              </p>
            </div>
          </div>
        ) : readinessState === "ready" ? (
          <div
            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
            data-testid="infoboard-readiness-ready"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">Bereit</p>
              <p className="mt-1 text-sm text-emerald-800">
                Alle Infoboard-Voraussetzungen sind erfüllt.
              </p>
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
            data-testid="infoboard-readiness-not-ready"
          >
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <p className="text-sm font-semibold text-amber-950">
                  Nicht bereit
                </p>
                <p className="mt-1 text-sm text-amber-900">
                  Nicht alle Voraussetzungen sind erfüllt.
                </p>
              </div>
            </div>
          </div>
        )}

        {readinessState !== "not-relevant" && (
          <ul className="mt-4 space-y-2">
            {readinessChecks.map((check) => (
              <li
                key={check.label}
                className="flex items-center gap-2 text-sm"
              >
                {check.passed ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <CircleAlert className="h-4 w-4 shrink-0 text-amber-600" />
                )}
                <span
                  className={
                    check.passed
                      ? "text-emerald-900"
                      : "text-amber-900"
                  }
                >
                  {check.label}
                </span>
              </li>
            ))}
          </ul>
        )}

        {allocationWarning && (
          <div
            className="mt-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3"
            data-testid="infoboard-allocation-warning"
          >
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-semibold text-amber-950">
                Infoboard-Zuteilung unvollständig
              </p>
              <p
                className="mt-1 text-sm text-amber-900"
                data-testid="infoboard-allocation-warning-text"
              >
                {allocationWarning}
              </p>
            </div>
          </div>
        )}
      </SectionCard>
      ) : null}

      {/* D4 + D5 — Resources (HOME only) */}
      {isHomeMatch ? (
        recordSurface ? (
          <TrainingRecordSection title="Ressourcen" testId="spiele-record-section-resources">
            <div className="space-y-8">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Spielfeld / Halle
                </p>
                {useVisualPickers && pitchGroupsByCode ? (
                  <PlanningSingleResourceAssignment
                    kind="pitch_hall"
                    showSubjectLabel={false}
                    subjectLabel="Spielfeld / Halle"
                    resourceName={pitchResourceName}
                    unassignedLabel={tResources("unassignedPitchHall")}
                    facilityGroups={pitchGroupsByCode}
                    selectedResourceIds={pitchCode ? new Set([pitchCode]) : new Set()}
                    onSelect={(code) => setPitchCode(code)}
                    onDeselect={() => setPitchCode("")}
                    availabilityByResourceId={pitchAvailabilityByCode}
                    canManage={canManage}
                    disabled={saving}
                    testId="pitch-assignment"
                  />
                ) : (
                  <label className="block space-y-2">
                    <span className="fca-label">
                      <Volleyball className="inline h-3.5 w-3.5 align-text-bottom" /> Spielfeld
                    </span>
                    <select
                      value={pitchCode}
                      onChange={(e) => setPitchCode(e.target.value)}
                      disabled={!canManage || saving}
                      className="fca-select"
                      data-testid="pitch-assignment-select"
                    >
                      <option value="">— Kein Spielfeld zugeordnet —</option>
                      {effectivePitchOptions.map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {opt.name}
                          {formatAvailabilitySuffix(pitchAvailabilityByCode.get(opt.code))}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Garderoben
                </p>
                {useVisualPickers && dressingRoomGroupsByCode ? (
                  <PlanningMatchDressingRoomAssignments
                    homeLabel={tResources("matchHomeSide")}
                    awayLabel={tResources("matchAwaySide")}
                    homeCode={homeDressingRoomCode}
                    awayCode={awayDressingRoomCode}
                    homeDisplayName={homeDisplayName}
                    awayDisplayName={awayDisplayName}
                    canManage={canManage}
                    disabled={saving}
                    facilityGroups={dressingRoomGroupsByCode}
                    dressingRoomAvailability={dressingRoomAvailabilityByCode}
                    onSelectHome={(code) => setHomeDressingRoomCode(code)}
                    onSelectAway={(code) => setAwayDressingRoomCode(code)}
                    onDeselectHome={() => setHomeDressingRoomCode("")}
                    onDeselectAway={() => setAwayDressingRoomCode("")}
                    testId="match-dressing-room"
                  />
                ) : (
                  <div className="space-y-4">
                    <label className="block space-y-2">
                      <span className="fca-label">
                        <Shirt className="inline h-3.5 w-3.5 align-text-bottom" /> Heimkabine (
                        {homeDisplayName})
                      </span>
                      <select
                        value={homeDressingRoomCode}
                        onChange={(e) => setHomeDressingRoomCode(e.target.value)}
                        disabled={!canManage || saving}
                        className="fca-select"
                        data-testid="home-dressing-room-select"
                      >
                        <option value="">— Keine Garderobe zugeordnet —</option>
                        {effectiveDressingRoomOptions.map((room) => (
                          <option key={room.code} value={room.code}>
                            {room.name}
                            {formatAvailabilitySuffix(dressingRoomAvailabilityByCode.get(room.code), {
                              isSelected: room.code === homeDressingRoomCode,
                            })}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-2">
                      <span className="fca-label">
                        <Shirt className="inline h-3.5 w-3.5 align-text-bottom" /> Gastkabine (
                        {awayDisplayName})
                      </span>
                      <select
                        value={awayDressingRoomCode}
                        onChange={(e) => setAwayDressingRoomCode(e.target.value)}
                        disabled={!canManage || saving}
                        className="fca-select"
                        data-testid="away-dressing-room-select"
                      >
                        <option value="">— Keine Garderobe zugeordnet —</option>
                        {effectiveDressingRoomOptions.map((room) => (
                          <option key={room.code} value={room.code}>
                            {room.name}
                            {formatAvailabilitySuffix(dressingRoomAvailabilityByCode.get(room.code), {
                              isSelected: room.code === awayDressingRoomCode,
                            })}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </TrainingRecordSection>
        ) : (
          <>
            <SectionCard title="Sportanlage und Spielfeld" description="Spielfeldwahl für dieses Match">
              {useVisualPickers && pitchGroupsByCode ? (
                <PlanningSingleResourceAssignment
                  kind="pitch_hall"
                  showSubjectLabel={false}
                  subjectLabel="Spielfeld / Halle"
                  resourceName={pitchResourceName}
                  unassignedLabel={tResources("unassignedPitchHall")}
                  facilityGroups={pitchGroupsByCode}
                  selectedResourceIds={pitchCode ? new Set([pitchCode]) : new Set()}
                  onSelect={(code) => setPitchCode(code)}
                  onDeselect={() => setPitchCode("")}
                  availabilityByResourceId={pitchAvailabilityByCode}
                  canManage={canManage}
                  disabled={saving}
                  testId="pitch-assignment"
                />
              ) : (
                <label className="block space-y-2">
                  <span className="fca-label">
                    <Volleyball className="inline h-3.5 w-3.5 align-text-bottom" /> Spielfeld
                  </span>
                  <select
                    value={pitchCode}
                    onChange={(e) => setPitchCode(e.target.value)}
                    disabled={!canManage || saving}
                    className="fca-select"
                    data-testid="pitch-assignment-select"
                  >
                    <option value="">— Kein Spielfeld zugeordnet —</option>
                    {effectivePitchOptions.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.name}
                        {formatAvailabilitySuffix(pitchAvailabilityByCode.get(opt.code))}
                      </option>
                    ))}
                  </select>
                  {!pitchCode.trim() && (
                    <p className="text-xs text-amber-700">Spielfeld fehlt.</p>
                  )}
                </label>
              )}
            </SectionCard>

            <SectionCard
              title="Garderobenzuteilung"
              description="Garderobenzuteilung für Heim- und Gastteam"
            >
              {useVisualPickers && dressingRoomGroupsByCode ? (
                <PlanningMatchDressingRoomAssignments
                  homeLabel={tResources("matchHomeSide")}
                  awayLabel={tResources("matchAwaySide")}
                  homeCode={homeDressingRoomCode}
                  awayCode={awayDressingRoomCode}
                  homeDisplayName={homeDisplayName}
                  awayDisplayName={awayDisplayName}
                  canManage={canManage}
                  disabled={saving}
                  facilityGroups={dressingRoomGroupsByCode}
                  dressingRoomAvailability={dressingRoomAvailabilityByCode}
                  onSelectHome={(code) => setHomeDressingRoomCode(code)}
                  onSelectAway={(code) => setAwayDressingRoomCode(code)}
                  onDeselectHome={() => setHomeDressingRoomCode("")}
                  onDeselectAway={() => setAwayDressingRoomCode("")}
                  testId="match-dressing-room"
                />
              ) : (
                <div className="space-y-4">
                  <label className="block space-y-2">
                    <span className="fca-label">
                      <Shirt className="inline h-3.5 w-3.5 align-text-bottom" /> Garderobe Heimteam (
                      {homeDisplayName})
                    </span>
                    <select
                      value={homeDressingRoomCode}
                      onChange={(e) => setHomeDressingRoomCode(e.target.value)}
                      disabled={!canManage || saving}
                      className="fca-select"
                      data-testid="home-dressing-room-select"
                    >
                      <option value="">— Keine Garderobe zugeordnet —</option>
                      {effectiveDressingRoomOptions.map((room) => (
                        <option key={room.code} value={room.code}>
                          {room.name}
                          {formatAvailabilitySuffix(dressingRoomAvailabilityByCode.get(room.code))}
                        </option>
                      ))}
                    </select>
                    {!homeDressingRoomCode.trim() && (
                      <p className="text-xs text-amber-700">Garderobe Heimteam fehlt.</p>
                    )}
                  </label>
                  <label className="block space-y-2">
                    <span className="fca-label">
                      <Shirt className="inline h-3.5 w-3.5 align-text-bottom" /> Garderobe Gastteam (
                      {awayDisplayName})
                    </span>
                    <select
                      value={awayDressingRoomCode}
                      onChange={(e) => setAwayDressingRoomCode(e.target.value)}
                      disabled={!canManage || saving}
                      className="fca-select"
                      data-testid="away-dressing-room-select"
                    >
                      <option value="">— Keine Garderobe zugeordnet —</option>
                      {effectiveDressingRoomOptions.map((room) => (
                        <option key={room.code} value={room.code}>
                          {room.name}
                          {formatAvailabilitySuffix(dressingRoomAvailabilityByCode.get(room.code))}
                        </option>
                      ))}
                    </select>
                    {!awayDressingRoomCode.trim() && (
                      <p className="text-xs text-amber-700">Garderobe Gastteam fehlt.</p>
                    )}
                  </label>
                </div>
              )}
            </SectionCard>
          </>
        )
      ) : null}

      {!hideFooterActions ? footerActions : null}
    </div>
  );
}
