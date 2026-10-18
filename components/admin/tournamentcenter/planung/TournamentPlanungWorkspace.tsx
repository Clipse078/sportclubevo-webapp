"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sparkles, Pencil, X } from "lucide-react";
import type {
  TournamentPlanungGenerationOutcome,
  TournamentPlanungPlanningUx,
  TournamentPlanungViewModel,
} from "@/lib/tournaments/planung/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/use-toast";
import TournamentPlanungBoard from "./TournamentPlanungBoard";
import TournamentPlanungMobileTimeline from "./TournamentPlanungMobileTimeline";
import TournamentPlanungFixtureActions from "./TournamentPlanungFixtureActions";
import TournamentPlanungManualMoveDialog from "./TournamentPlanungManualMoveDialog";
import TournamentPlanungGroupStandings from "./TournamentPlanungGroupStandings";
import TournamentPlanungResultDialog from "./TournamentPlanungResultDialog";
import TournamentPlanungSpielplanOutput from "./TournamentPlanungSpielplanOutput";
import TournamentPlanungSpielplanSettings from "./TournamentPlanungSpielplanSettings";
import type { TournamentDto } from "@/lib/tournaments/types";
import { buildPublicTournamentPath } from "@/lib/tournaments/public/build-public-tournament-url";
import { SCE_TOURNAMENT_WORKSPACE_SURFACE_CLASS } from "@/lib/sce/tournament/sce-tournament-surface-layout";
import { SCE_TOURNAMENT_SR_LIVE_REGION_CLASS } from "@/lib/sce/tournament/sce-tournament-interactive-a11y";

type Props = {
  initialModel: TournamentPlanungViewModel;
  tournamentId: string;
  timezone: string;
  canManage: boolean;
  tournament?: Pick<
    TournamentDto,
    | "id"
    | "title"
    | "startAt"
    | "location"
    | "visibility"
    | "updatedAt"
    | "homeAway"
    | "organizerName"
  >;
  tenantKey?: string;
  tenantName?: string | null;
  tenantLogoUrl?: string | null;
  ownershipAllowsPublication?: boolean;
};

type InteractionMode = "view" | "edit";

function mergePlanningUx(
  model: TournamentPlanungViewModel,
  generationFeedback: TournamentPlanungGenerationOutcome | null,
): TournamentPlanungPlanningUx | null {
  if (model.schedulePresence !== "NONE" || model.incompleteSetup.length > 0) {
    return null;
  }
  const fromGeneration = generationFeedback?.guidance ?? null;
  if (fromGeneration) return fromGeneration;
  return model.planningUx;
}

function resolveInitialInteractionMode(searchParams: URLSearchParams): InteractionMode {
  return searchParams.get("mode") === "edit" ? "edit" : "view";
}

export default function TournamentPlanungWorkspace({
  initialModel,
  tournamentId,
  timezone,
  canManage,
  tournament,
  tenantKey = "",
  tenantName = null,
  tenantLogoUrl = null,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [model, setModel] = useState(initialModel);
  const [interactionMode, setInteractionModeState] = useState<InteractionMode>(() =>
    resolveInitialInteractionMode(searchParams),
  );
  const [busy, setBusy] = useState(false);
  const [generatePending, setGeneratePending] = useState(false);
  const [generationFeedback, setGenerationFeedback] =
    useState<TournamentPlanungGenerationOutcome | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
  const [manualMoveOpen, setManualMoveOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [selfAdjustTiming, setSelfAdjustTiming] = useState(false);
  const [scheduleSyncPending, setScheduleSyncPending] = useState(false);
  const [scheduleLiveMessage, setScheduleLiveMessage] = useState("");
  const scheduleSyncWasPendingRef = useRef(false);

  useEffect(() => {
    if (scheduleSyncPending) {
      scheduleSyncWasPendingRef.current = true;
      return;
    }
    if (scheduleSyncWasPendingRef.current) {
      scheduleSyncWasPendingRef.current = false;
      setScheduleLiveMessage("Spielplan aktualisiert.");
    }
  }, [scheduleSyncPending]);

  const hasSchedule = model.schedulePresence !== "NONE";
  const effectiveInteractionMode: InteractionMode =
    hasSchedule && interactionMode === "edit" ? "edit" : "view";

  const setInteractionMode = useCallback(
    (mode: InteractionMode) => {
      setInteractionModeState(mode);
      const params = new URLSearchParams(searchParams.toString());
      if (mode === "edit") {
        params.set("mode", "edit");
      } else {
        params.delete("mode");
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${tournamentId}/planung`);
    if (!res.ok) throw new Error("Planung konnte nicht geladen werden.");
    const json = (await res.json()) as { viewModel: TournamentPlanungViewModel };
    setModel(json.viewModel);
  }, [tournamentId]);

  const runGenerate = useCallback(async () => {
    setBusy(true);
    setGeneratePending(true);
    setGenerationFeedback(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/planung/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: model.scheduleRevision }),
      });
      const json = (await res.json()) as {
        viewModel?: TournamentPlanungViewModel;
        generation?: TournamentPlanungGenerationOutcome;
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        if (json.code === "SCHEDULE.STALE_VERSION") {
          toast.danger(
            "Der Spielplan wurde inzwischen geändert. Bitte aktualisiere die Planung.",
          );
          await refresh();
          return;
        }
        toast.danger(json.error ?? "Spielplan konnte nicht erstellt werden.");
        return;
      }
      if (json.viewModel) setModel(json.viewModel);
      else await refresh();

      if (json.generation) {
        setGenerationFeedback(json.generation);
        if (json.generation.succeeded) {
          toast.success("Spielplan wurde erstellt.");
          setGenerationFeedback(null);
          setInteractionMode("view");
        } else {
          toast.danger("Spielplan konnte mit der aktuellen Konfiguration nicht erstellt werden.");
        }
      }
      router.refresh();
    } catch {
      toast.danger("Spielplan konnte nicht erstellt werden. Bitte erneut versuchen.");
    } finally {
      setBusy(false);
      setGeneratePending(false);
    }
  }, [model.scheduleRevision, refresh, router, setInteractionMode, toast, tournamentId]);

  const runAction = useCallback(
    async (path: string, body?: Record<string, unknown>) => {
      setBusy(true);
      try {
        const res = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        });
        const json = (await res.json()) as {
          viewModel?: TournamentPlanungViewModel;
          error?: string;
          code?: string;
        };
        if (!res.ok) {
          if (json.code === "SCHEDULE.STALE_VERSION") {
            toast.danger(
              "Der Spielplan wurde inzwischen geändert. Bitte aktualisiere die Planung.",
            );
            await refresh();
            return;
          }
          toast.danger(json.error ?? "Aktion fehlgeschlagen");
          return;
        }
        if (json.viewModel) setModel(json.viewModel);
        else await refresh();
        router.refresh();
      } catch {
        toast.danger("Aktion fehlgeschlagen. Bitte erneut versuchen.");
      } finally {
        setBusy(false);
      }
    },
    [refresh, router, toast],
  );

  const manualMove = useCallback(
    async (payload: {
      fixtureId: string;
      targetTournamentPitchId: string;
      targetStartAt: string;
      validateOnly?: boolean;
    }) => {
      if (!model.scheduleVersionId || model.scheduleRevision == null) {
        throw new Error("Kein Spielplan geladen.");
      }
      const res = await fetch(`/api/tournaments/${tournamentId}/planung/manual-move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleVersionId: model.scheduleVersionId,
          expectedRevision: model.scheduleRevision,
          fixtureId: payload.fixtureId,
          targetTournamentPitchId: payload.targetTournamentPitchId,
          targetStartAt: payload.targetStartAt,
          validateOnly: payload.validateOnly ?? false,
        }),
      });
      const json = (await res.json()) as {
        viewModel?: TournamentPlanungViewModel;
        error?: string;
        code?: string;
        ok?: boolean;
      };
      if (!res.ok) {
        if (json.code === "SCHEDULE.STALE_VERSION") {
          toast.danger(
            "Der Spielplan wurde inzwischen geändert. Bitte aktualisiere die Planung.",
          );
          await refresh();
          return { ok: false as const, stale: true };
        }
        if (payload.validateOnly) {
          return { ok: false as const, stale: false };
        }
        toast.danger(json.error ?? "Verschieben fehlgeschlagen");
        return { ok: false as const, stale: false };
      }
      if (payload.validateOnly) {
        return { ok: res.ok && json.ok !== false, stale: false };
      }
      if (json.viewModel) setModel(json.viewModel);
      else await refresh();
      router.refresh();
      const userMessage = (json as { userMessage?: string }).userMessage;
      if (userMessage && userMessage !== "Keine Änderung") {
        toast.success(userMessage);
      }
      setManualMoveOpen(false);
      return { ok: true as const, stale: false };
    },
    [model.scheduleRevision, model.scheduleVersionId, refresh, router, toast, tournamentId],
  );

  const applyRecommendedTiming = useCallback(async () => {
    setBusy(true);
    setGenerationFeedback(null);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/planung/apply-recommended-timing`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expectedRevision: model.scheduleRevision }),
        },
      );
      const json = (await res.json()) as {
        viewModel?: TournamentPlanungViewModel;
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        if (json.code === "SCHEDULE.STALE_VERSION") {
          toast.danger(
            "Der Spielplan wurde inzwischen geändert. Bitte aktualisiere die Planung.",
          );
          await refresh();
          return;
        }
        toast.danger(json.error ?? "Empfehlung konnte nicht übernommen werden.");
        return;
      }
      if (json.viewModel) setModel(json.viewModel);
      else await refresh();
      setSelfAdjustTiming(false);
      toast.success("Empfehlung wurde übernommen.");
      router.refresh();
    } catch {
      toast.danger("Empfehlung konnte nicht übernommen werden.");
    } finally {
      setBusy(false);
    }
  }, [model.scheduleRevision, refresh, router, toast, tournamentId]);

  const planningUx = mergePlanningUx(model, generationFeedback);
  const editTournamentHref = `/dashboard/tournamentcenter/${tournamentId}/edit?tab=spielplan`;
  const showPreGenerationPanel =
    effectiveInteractionMode === "view" && planningUx != null && model.incompleteSetup.length === 0;

  const workspaceHeading = useMemo(() => {
    if (effectiveInteractionMode === "edit") return "Spielplan bearbeiten";
    if (hasSchedule) return "Spielplan";
    return "Planung";
  }, [effectiveInteractionMode, hasSchedule]);

  if (model.availability !== "AVAILABLE") {
    return null;
  }

  return (
    <div
      className="space-y-4"
      data-testid="tournament-planung-workspace"
      data-interaction-mode={effectiveInteractionMode}
    >
      <p
        className={SCE_TOURNAMENT_SR_LIVE_REGION_CLASS}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="tournament-planung-schedule-live-message"
      >
        {scheduleLiveMessage}
      </p>
      <header
        className={cn(
          SCE_TOURNAMENT_WORKSPACE_SURFACE_CLASS,
          "flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between",
        )}
      >
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-[var(--foreground)]">{workspaceHeading}</h2>
          {effectiveInteractionMode === "edit" ? (
            <p className="text-sm text-[var(--muted)]">
              Passe Zeiten, Pausen oder Spiele direkt an.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {effectiveInteractionMode === "view" && canManage && hasSchedule ? (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setInteractionMode("edit")}
              data-testid="tournament-planung-edit-spielplan"
            >
              <Pencil className="mr-1.5 h-4 w-4" aria-hidden />
              Spielplan bearbeiten
            </Button>
          ) : null}
          {effectiveInteractionMode === "edit" ? (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => setInteractionMode("view")}
                data-testid="tournament-planung-exit-edit"
              >
                <X className="mr-1.5 h-4 w-4" aria-hidden />
                Bearbeitung beenden
              </Button>
            </>
          ) : null}
        </div>
      </header>

      {model.incompleteSetup.length > 0 ? (
        <section
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          data-testid="tournament-planung-incomplete"
        >
          <p className="text-sm font-medium text-[var(--foreground)]">
            {model.incompleteSetup.some((i) => i.code === "PLANNER_SETUP")
              ? "Turnierplanung einrichten"
              : "Für die automatische Planung fehlt noch:"}
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm text-[var(--muted)]">
            {model.incompleteSetup.map((item) => (
              <li key={item.code}>{item.label}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {showPreGenerationPanel ? (
        <section
          className={cn(
            "rounded-xl border bg-[var(--surface)] p-6",
            planningUx.state === "READY"
              ? "border-[var(--border)]"
              : "border-[var(--sce-danger)]/40",
          )}
          data-testid={
            planningUx.state === "READY"
              ? "tournament-planung-ready"
              : "tournament-planung-planning-state"
          }
          role={planningUx.state === "READY" ? "status" : "alert"}
          aria-live="polite"
        >
          <p className="text-sm font-semibold text-[var(--foreground)]">{planningUx.headline}</p>
          {planningUx.summary ? (
            <p className="mt-1 text-sm text-[var(--muted)]">{planningUx.summary}</p>
          ) : null}

          {planningUx.state === "AUTO_FIX" && planningUx.recommendedTiming ? (
            <p
              className="mt-3 text-sm font-medium text-[var(--foreground)]"
              data-testid="tournament-planung-recommended-timing-line"
            >
              {planningUx.recommendedTiming.matchDurationMinutes} Min. Spielzeit ·{" "}
              {planningUx.recommendedTiming.transitionMinutes} Min. Wechselzeit
            </p>
          ) : null}

          {canManage ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {planningUx.state === "READY" && model.actions.canGenerate ? (
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void runGenerate()}
                  data-testid="tournament-planung-generate"
                  aria-busy={generatePending}
                >
                  <Sparkles className="mr-1.5 h-4 w-4" aria-hidden />
                  {generatePending
                    ? model.actions.generatePendingLabel
                    : model.actions.generateLabel}
                </Button>
              ) : null}

              {planningUx.state === "AUTO_FIX" && planningUx.recommendedTiming ? (
                <>
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => void applyRecommendedTiming()}
                    data-testid="tournament-planung-apply-recommended-timing"
                  >
                    Empfehlung übernehmen
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setSelfAdjustTiming((v) => !v)}
                    data-testid="tournament-planung-self-adjust"
                  >
                    Selbst anpassen
                  </Button>
                </>
              ) : null}

              {planningUx.state === "STRUCTURAL_CHANGE" ? (
                <>
                  <Link
                    href={editTournamentHref}
                    data-testid="tournament-planung-edit-tournament"
                    className={cn(
                      "inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border-strong)]",
                      "bg-[var(--surface)] px-3.5 text-sm font-semibold text-[var(--text-2)]",
                      "hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2",
                    )}
                  >
                    Turnier bearbeiten
                  </Link>
                  {planningUx.contextLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border-strong)]",
                        "bg-[var(--surface)] px-3.5 text-sm font-semibold text-[var(--text-2)]",
                        "hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </>
              ) : null}
            </div>
          ) : null}

          {planningUx.state === "AUTO_FIX" && selfAdjustTiming ? (
            <p className="mt-4 text-sm text-[var(--muted)]">
              Passe Spieldauer und Wechselzeit im{" "}
              <Link
                href={editTournamentHref}
                className="font-medium text-[var(--sce-primary)] underline"
              >
                Turnier bearbeiten
              </Link>
              .
            </p>
          ) : null}
        </section>
      ) : null}

      {effectiveInteractionMode === "edit" && model.regenerationSummary ? (
        <p className="text-sm text-[var(--muted)]" data-testid="tournament-planung-regen-summary">
          {model.regenerationSummary.message}
        </p>
      ) : null}

      {effectiveInteractionMode === "view" && hasSchedule && tournament ? (
        <TournamentPlanungSpielplanOutput
          planungModel={model}
          tournamentId={tournamentId}
          title={tournament.title}
          startAtIso={tournament.startAt}
          location={tournament.location ?? null}
          organizerName={tournament.organizerName ?? null}
          tenantName={tenantName}
          tenantLogoUrl={tenantLogoUrl ?? null}
          timezone={timezone}
          publicPath={
            tenantKey && tournament.visibility.websiteVisible
              ? buildPublicTournamentPath(tenantKey, tournament.id)
              : null
          }
        />
      ) : null}

      {effectiveInteractionMode === "edit" && hasSchedule && model.timeScale ? (
        <>
          {model.schedulingSettings ? (
            <TournamentPlanungSpielplanSettings
              tournamentId={tournamentId}
              model={model}
              pitches={model.pitches}
              settings={model.schedulingSettings}
              timingConsequence={model.timingConsequence}
              canManage={canManage}
              onModelChange={setModel}
              onError={(message) => toast.danger(message)}
              onScheduleSyncChange={setScheduleSyncPending}
              onApplyRecommendedTiming={
                canManage ? () => void applyRecommendedTiming() : undefined
              }
            />
          ) : null}
          <TournamentPlanungGroupStandings model={model} />
          <section
            aria-label="Interaktives Feld-Zeit-Board"
            className={cn(
              SCE_TOURNAMENT_WORKSPACE_SURFACE_CLASS,
              "hidden space-y-4 p-4 md:p-5 lg:block",
            )}
            data-testid="tournament-planung-edit-board"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Feld- und Zeitplan</h3>
              <p
                className="text-xs text-[var(--muted)]"
                data-testid="planung-schedule-sync-status"
                role="status"
                aria-live="polite"
              >
                {scheduleSyncPending ? "Spielplan wird aktualisiert …" : null}
              </p>
            </div>
            <TournamentPlanungBoard
              model={model}
              timezone={timezone}
              selectedFixtureId={selectedFixtureId}
              onSelectFixture={setSelectedFixtureId}
              canManage={canManage}
              busy={busy}
              onManualMove={async (payload) => {
                setBusy(true);
                try {
                  await manualMove(payload);
                } finally {
                  setBusy(false);
                }
              }}
              onPreviewMoveTarget={async (payload) => {
                const result = await manualMove({ ...payload, validateOnly: true });
                return result.ok ? "valid" : "invalid";
              }}
            />
          </section>
          <div className={cn(SCE_TOURNAMENT_WORKSPACE_SURFACE_CLASS, "p-4 md:p-5 lg:hidden")}>
            <TournamentPlanungMobileTimeline
              model={model}
              timezone={timezone}
              canManage={canManage}
              onSelectFixture={(id) => {
                setSelectedFixtureId(id);
                setManualMoveOpen(true);
              }}
            />
          </div>
          {canManage && selectedFixtureId ? (
            <TournamentPlanungFixtureActions
              tournamentId={tournamentId}
              model={model}
              fixtureId={selectedFixtureId}
              busy={busy}
              onLockAction={async (body) => {
                await runAction(`/api/tournaments/${tournamentId}/planung/lock`, body);
              }}
              onManualMove={() => setManualMoveOpen(true)}
              onEnterResult={() => setResultOpen(true)}
              onClose={() => {
                setSelectedFixtureId(null);
                setResultOpen(false);
              }}
            />
          ) : null}
          {canManage && selectedFixtureId && resultOpen ? (
            <TournamentPlanungResultDialog
              model={model}
              fixtureId={selectedFixtureId}
              busy={busy}
              onClose={() => setResultOpen(false)}
              onSave={async (payload) => {
                setBusy(true);
                try {
                  const res = await fetch(
                    `/api/tournaments/${tournamentId}/planung/fixture-result`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: payload.action,
                        fixtureId: selectedFixtureId,
                        expectedRevision: payload.expectedRevision,
                        scoreSideA: payload.scoreSideA,
                        scoreSideB: payload.scoreSideB,
                        explicitWinnerParticipantId: payload.explicitWinnerParticipantId,
                      }),
                    },
                  );
                  const json = (await res.json()) as {
                    viewModel?: TournamentPlanungViewModel;
                    error?: string;
                    code?: string;
                  };
                  if (!res.ok) {
                    if (json.code === "TOURNAMENT_FIXTURE_RESULT_STALE") {
                      toast.danger(json.error ?? "Ergebnis veraltet — bitte aktualisieren.");
                      await refresh();
                      return;
                    }
                    toast.danger(json.error ?? "Ergebnis konnte nicht gespeichert werden.");
                    return;
                  }
                  if (json.viewModel) setModel(json.viewModel);
                  else await refresh();
                  setResultOpen(false);
                  router.refresh();
                } finally {
                  setBusy(false);
                }
              }}
            />
          ) : null}
          {canManage && selectedFixtureId ? (
            <TournamentPlanungManualMoveDialog
              open={manualMoveOpen}
              onClose={() => setManualMoveOpen(false)}
              model={model}
              fixtureId={selectedFixtureId}
              timezone={timezone}
              busy={busy}
              onSubmit={async (target) => {
                setBusy(true);
                try {
                  await manualMove({ fixtureId: selectedFixtureId, ...target });
                } finally {
                  setBusy(false);
                }
              }}
            />
          ) : null}
        </>
      ) : null}

    </div>
  );
}
