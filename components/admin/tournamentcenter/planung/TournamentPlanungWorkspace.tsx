"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Sparkles, RefreshCw } from "lucide-react";
import type {
  TournamentPlanungGenerationOutcome,
  TournamentPlanungViewModel,
} from "@/lib/tournaments/planung/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/use-toast";
import TournamentPlanungBoard from "./TournamentPlanungBoard";
import TournamentPlanungMobileTimeline from "./TournamentPlanungMobileTimeline";
import TournamentPlanungScheduleList from "./TournamentPlanungScheduleList";
import TournamentPlanungFixtureActions from "./TournamentPlanungFixtureActions";
import TournamentPlanungManualMoveDialog from "./TournamentPlanungManualMoveDialog";
import TournamentPlanungGroupStandings from "./TournamentPlanungGroupStandings";
import TournamentPlanungResultDialog from "./TournamentPlanungResultDialog";
import TournamentPlanungPublicationPanel from "./TournamentPlanungPublicationPanel";
import TournamentPlanungSpielplanOutput from "./TournamentPlanungSpielplanOutput";
import type { TournamentDto } from "@/lib/tournaments/types";
import { buildPublicTournamentPath } from "@/lib/tournaments/public/build-public-tournament-url";

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

export default function TournamentPlanungWorkspace({
  initialModel,
  tournamentId,
  timezone,
  canManage,
  tournament,
  tenantKey = "",
  tenantName = null,
  tenantLogoUrl = null,
  ownershipAllowsPublication = false,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [model, setModel] = useState(initialModel);
  const [workspaceMode, setWorkspaceMode] = useState<"planung" | "spielplan">("planung");
  const [busy, setBusy] = useState(false);
  const [generatePending, setGeneratePending] = useState(false);
  const [generationFeedback, setGenerationFeedback] =
    useState<TournamentPlanungGenerationOutcome | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
  const [manualMoveOpen, setManualMoveOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);

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
        } else if (json.generation.guidance) {
          toast.danger(json.generation.guidance.headline);
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
  }, [model.scheduleRevision, refresh, router, toast, tournamentId]);

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

  if (model.availability !== "AVAILABLE") {
    return null;
  }

  const showEmpty = model.schedulePresence === "NONE" && model.incompleteSetup.length === 0;
  const feasibilityGuidance =
    generationFeedback?.guidance ?? model.feasibilityGuidance ?? null;

  return (
    <div className="space-y-4" data-testid="tournament-planung-workspace">
      <header className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                workspaceMode === "planung"
                  ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
              onClick={() => setWorkspaceMode("planung")}
              data-testid="tournament-planung-mode-planung"
            >
              Planung
            </button>
            <button
              type="button"
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                workspaceMode === "spielplan"
                  ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
              onClick={() => setWorkspaceMode("spielplan")}
              data-testid="tournament-planung-mode-spielplan"
            >
              Spielplan
            </button>
          </div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            {workspaceMode === "spielplan" ? "Spielplan-Ausgabe" : "Planung"}
          </h2>
          {model.smartTiming ? (
            <p className="text-sm text-[var(--muted)]">{model.smartTiming.headline}</p>
          ) : null}
          {model.smartTiming?.detailLines.map((line) => (
            <p key={line} className="text-xs text-[var(--muted)]">
              {line}
            </p>
          ))}
        </div>
        {canManage && workspaceMode === "planung" ? (
          <div className="flex flex-wrap gap-2">
            {model.actions.canGenerate ? (
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
            {model.actions.canRegenerate ? (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  runAction(`/api/tournaments/${tournamentId}/planung/regenerate`, {
                    scheduleVersionId: model.scheduleVersionId,
                    expectedRevision: model.scheduleRevision,
                  })
                }
                data-testid="tournament-planung-regenerate"
              >
                <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
                {model.actions.regenerateLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
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

      {showEmpty ? (
        <section
          className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center"
          data-testid="tournament-planung-empty"
        >
          <p className="text-sm text-[var(--muted)]">
            SCE kann den Spielplan aus der Turnierkonfiguration automatisch erstellen.
          </p>
          {canManage && model.actions.canGenerate ? (
            <Button
              className="mt-4"
              type="button"
              disabled={busy}
              onClick={() => void runGenerate()}
              aria-busy={generatePending}
            >
              <Sparkles className="mr-1.5 h-4 w-4" aria-hidden />
              {generatePending
                ? model.actions.generatePendingLabel
                : model.actions.generateLabel}
            </Button>
          ) : null}
        </section>
      ) : null}

      {model.regenerationSummary ? (
        <p className="text-sm text-[var(--muted)]" data-testid="tournament-planung-regen-summary">
          {model.regenerationSummary.message}
        </p>
      ) : null}

      {feasibilityGuidance ? (
        <section
          className="rounded-xl border border-[var(--sce-danger)]/40 bg-[var(--surface)] p-4"
          data-testid="tournament-planung-generation-blocked"
          role="alert"
        >
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {feasibilityGuidance.headline}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">{feasibilityGuidance.summary}</p>
          {feasibilityGuidance.adjustments.length > 0 ? (
            <>
              <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
                Mögliche Anpassungen:
              </p>
              <ul className="mt-1 list-disc pl-5 text-sm text-[var(--muted)]">
                {feasibilityGuidance.adjustments.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}

      {model.diagnostics.length > 0 ? (
        <section aria-label="Planungsdiagnose" className="space-y-1">
          {model.diagnostics.map((d) => (
            <p
              key={d.id}
              className={cn(
                "text-sm",
                d.severity === "danger"
                  ? "text-[var(--sce-danger)]"
                  : d.severity === "warning"
                    ? "text-[var(--sce-warning)]"
                    : "text-[var(--muted)]",
              )}
            >
              {d.message}
            </p>
          ))}
        </section>
      ) : null}

      {workspaceMode === "spielplan" && model.schedulePresence !== "NONE" && tournament ? (
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

      {workspaceMode === "planung" && model.schedulePresence !== "NONE" && model.timeScale ? (
        <>
          <TournamentPlanungGroupStandings model={model} />
          <TournamentPlanungScheduleList model={model} timezone={timezone} />
          <div className="hidden lg:block">
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
          </div>
          <div className="lg:hidden">
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

      {model.actions.canRegenerate && canManage ? (
        <p className="text-xs text-[var(--muted)]">{model.actions.regenerateHint}</p>
      ) : null}

      {tournament && tenantKey ? (
        <TournamentPlanungPublicationPanel
          tournament={tournament}
          tenantKey={tenantKey}
          canManage={canManage}
          ownershipAllowsPublication={ownershipAllowsPublication}
        />
      ) : null}
    </div>
  );
}
