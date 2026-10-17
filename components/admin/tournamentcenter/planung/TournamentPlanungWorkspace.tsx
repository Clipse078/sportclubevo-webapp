"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Sparkles, RefreshCw } from "lucide-react";
import type { TournamentPlanungViewModel } from "@/lib/tournaments/planung/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/use-toast";
import TournamentPlanungBoard from "./TournamentPlanungBoard";
import TournamentPlanungMobileTimeline from "./TournamentPlanungMobileTimeline";
import TournamentPlanungFixtureActions from "./TournamentPlanungFixtureActions";

type Props = {
  initialModel: TournamentPlanungViewModel;
  tournamentId: string;
  timezone: string;
  canManage: boolean;
};

export default function TournamentPlanungWorkspace({
  initialModel,
  tournamentId,
  timezone,
  canManage,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState(false);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${tournamentId}/planung`);
    if (!res.ok) throw new Error("Planung konnte nicht geladen werden.");
    const json = (await res.json()) as { viewModel: TournamentPlanungViewModel };
    setModel(json.viewModel);
  }, [tournamentId]);

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
              "Spielplan geändert — bitte erneut versuchen. Der Plan wurde zwischenzeitlich aktualisiert.",
            );
            await refresh();
            return;
          }
          throw new Error(json.error ?? "Aktion fehlgeschlagen");
        }
        if (json.viewModel) setModel(json.viewModel);
        else await refresh();
        router.refresh();
      } finally {
        setBusy(false);
      }
    },
    [refresh, router, toast],
  );

  if (model.availability !== "AVAILABLE") {
    return null;
  }

  const showEmpty = model.schedulePresence === "NONE" && model.incompleteSetup.length === 0;

  return (
    <div className="space-y-4" data-testid="tournament-planung-workspace">
      <header className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Spielplan</h2>
          {model.smartTiming ? (
            <p className="text-sm text-[var(--muted)]">{model.smartTiming.headline}</p>
          ) : null}
          {model.smartTiming?.detailLines.map((line) => (
            <p key={line} className="text-xs text-[var(--muted)]">
              {line}
            </p>
          ))}
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            {model.actions.canGenerate ? (
              <Button
                type="button"
                disabled={busy}
                onClick={() =>
                  runAction(`/api/tournaments/${tournamentId}/planung/generate`, {
                    expectedRevision: model.scheduleRevision,
                  })
                }
                data-testid="tournament-planung-generate"
              >
                <Sparkles className="mr-1.5 h-4 w-4" aria-hidden />
                {model.actions.generateLabel}
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
            Für die automatische Planung fehlt noch:
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
              onClick={() =>
                runAction(`/api/tournaments/${tournamentId}/planung/generate`, {
                  expectedRevision: model.scheduleRevision,
                })
              }
            >
              <Sparkles className="mr-1.5 h-4 w-4" aria-hidden />
              {model.actions.generateLabel}
            </Button>
          ) : null}
        </section>
      ) : null}

      {model.regenerationSummary ? (
        <p className="text-sm text-[var(--muted)]" data-testid="tournament-planung-regen-summary">
          {model.regenerationSummary.message}
        </p>
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

      {model.schedulePresence !== "NONE" && model.timeScale ? (
        <>
          <div className="hidden lg:block">
            <TournamentPlanungBoard
              model={model}
              timezone={timezone}
              selectedFixtureId={selectedFixtureId}
              onSelectFixture={setSelectedFixtureId}
            />
          </div>
          <div className="lg:hidden">
            <TournamentPlanungMobileTimeline model={model} timezone={timezone} />
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
              onClose={() => setSelectedFixtureId(null)}
            />
          ) : null}
        </>
      ) : null}

      {model.actions.canRegenerate && canManage ? (
        <p className="text-xs text-[var(--muted)]">{model.actions.regenerateHint}</p>
      ) : null}
    </div>
  );
}
