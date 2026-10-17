"use client";

import { useCallback, useRef, useState } from "react";
import type { TournamentPlanungViewModel } from "@/lib/tournaments/planung/types";
import { resolveTimeRowIndex } from "@/lib/tournaments/planung/time-scale";
import { manualMoveTargetAllowed, resolveManualMoveCapabilities } from "@/lib/tournaments/planung/manual-move-capabilities";
import { exceedsDragThreshold } from "@/components/admin/planning-hub/planning-hub-pointer-gesture";
import { cn } from "@/lib/cn";
import { Lock } from "lucide-react";

type Props = {
  model: TournamentPlanungViewModel;
  timezone: string;
  selectedFixtureId: string | null;
  onSelectFixture: (fixtureId: string | null) => void;
  canManage?: boolean;
  busy?: boolean;
  onManualMove?: (payload: {
    fixtureId: string;
    targetTournamentPitchId: string;
    targetStartAt: string;
  }) => Promise<void>;
  onPreviewMoveTarget?: (payload: {
    fixtureId: string;
    targetTournamentPitchId: string;
    targetStartAt: string;
  }) => Promise<"valid" | "invalid" | "unknown">;
};

function formatTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
}

type DragState = {
  fixtureId: string;
  fromPitchId: string;
  fromStartUtc: string;
  lockDimension: TournamentPlanungViewModel["cells"][number] extends infer C
    ? C extends { kind: "FIXTURE" }
      ? C["lockDimension"]
      : null
    : null;
  pointerId: number;
  startX: number;
  startY: number;
  committed: boolean;
};

export default function TournamentPlanungBoard({
  model,
  timezone,
  selectedFixtureId,
  onSelectFixture,
  canManage = false,
  busy = false,
  onManualMove,
  onPreviewMoveTarget,
}: Props) {
  const timeScale = model.timeScale!;
  const fixtureCells = model.cells.filter((c) => c.kind === "FIXTURE");
  const breakCells = model.cells.filter((c) => c.kind === "BREAK");
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverTarget, setHoverTarget] = useState<{
    key: string;
    status: "valid" | "invalid" | "blocked" | "lock";
  } | null>(null);
  const previewCache = useRef(new Map<string, "valid" | "invalid">());

  const evaluateLocalTarget = useCallback(
    (dragState: DragState, pitchId: string, startUtc: string, isBreak: boolean) => {
      if (isBreak) return "blocked" as const;
      const allowed = manualMoveTargetAllowed({
        lockDimension: dragState.lockDimension,
        fromPitchId: dragState.fromPitchId,
        fromStartUtc: dragState.fromStartUtc,
        toPitchId: pitchId,
        toStartUtc: startUtc,
      });
      if (!allowed) return "lock" as const;
      return "valid" as const;
    },
    [],
  );

  const handlePreview = useCallback(
    async (dragState: DragState, pitchId: string, startUtc: string, isBreak: boolean) => {
      const key = `${dragState.fixtureId}:${pitchId}:${startUtc}`;
      const local = evaluateLocalTarget(dragState, pitchId, startUtc, isBreak);
      if (local !== "valid") {
        setHoverTarget({ key, status: local });
        return;
      }
      if (onPreviewMoveTarget) {
        const cached = previewCache.current.get(key);
        if (cached) {
          setHoverTarget({ key, status: cached });
          return;
        }
        setHoverTarget({ key, status: "valid" });
        const remote = await onPreviewMoveTarget({
          fixtureId: dragState.fixtureId,
          targetTournamentPitchId: pitchId,
          targetStartAt: startUtc,
        });
        if (remote === "valid" || remote === "invalid") {
          previewCache.current.set(key, remote);
          setHoverTarget({ key, status: remote });
        }
      } else {
        setHoverTarget({ key, status: "valid" });
      }
    },
    [evaluateLocalTarget, onPreviewMoveTarget],
  );

  return (
    <div
      className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]"
      data-testid="tournament-planung-board"
      role="grid"
      aria-label="Spielplan Feld und Zeit"
    >
      <div
        className="min-w-max"
        style={{
          display: "grid",
          gridTemplateColumns: `4.5rem repeat(${model.pitches.length}, minmax(8rem, 1fr))`,
        }}
      >
        <div className="sticky left-0 z-10 border-b border-r border-[var(--border)] bg-[var(--surface-elevated)] p-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Zeit
        </div>
        {model.pitches.map((pitch) => (
          <div
            key={pitch.pitchId}
            className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface-elevated)] p-2 text-center text-xs font-semibold text-[var(--foreground)]"
            data-tournament-pitch-id={pitch.pitchId}
          >
            {pitch.label}
          </div>
        ))}

        {timeScale.rowAnchorsUtc.map((anchor) => (
          <div key={`row-${anchor}`} className="contents">
            <div className="sticky left-0 border-r border-b border-[var(--border)] bg-[var(--surface)] p-2 text-xs tabular-nums text-[var(--muted)]">
              {formatTime(anchor, timezone)}
            </div>
            {model.pitches.map((pitch) => {
              const fixture = fixtureCells.find(
                (c) =>
                  c.pitchId === pitch.pitchId &&
                  resolveTimeRowIndex(timeScale, c.startUtc) ===
                    resolveTimeRowIndex(timeScale, anchor) &&
                  c.startUtc === anchor,
              );
              const br = breakCells.find(
                (b) =>
                  b.startUtc === anchor &&
                  (b.scope === "ALL_PITCHES" || b.pitchIds.includes(pitch.pitchId)),
              );

              const cellKey = `${anchor}-${pitch.pitchId}`;
              const isDropHover = drag?.committed && hoverTarget?.key.startsWith(`${drag.fixtureId}:${pitch.pitchId}:${anchor}`);

              if (br) {
                return (
                  <div
                    key={`${cellKey}-break`}
                    className={cn(
                      "border-b border-[var(--border)] p-1",
                      drag?.committed && "bg-[var(--surface-elevated)]/60",
                    )}
                    role="gridcell"
                    aria-label={br.accessibleLabel}
                    data-drop-state="blocked"
                    data-testid={`planung-drop-${pitch.pitchId}-${anchor}`}
                    onPointerEnter={() => {
                      if (drag?.committed) void handlePreview(drag, pitch.pitchId, anchor, true);
                    }}
                  >
                    <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-3 text-center text-xs text-[var(--muted)]">
                      {br.label}
                    </div>
                  </div>
                );
              }

              if (!fixture) {
                const dropStatus =
                  isDropHover && hoverTarget?.key === `${drag?.fixtureId}:${pitch.pitchId}:${anchor}`
                    ? hoverTarget.status
                    : null;
                return (
                  <div
                    key={`${cellKey}-empty`}
                    className={cn(
                      "border-b border-[var(--border)] p-1 min-h-[3.25rem]",
                      dropStatus === "valid" && "ring-1 ring-inset ring-[var(--accent)]/40",
                      dropStatus === "invalid" && "ring-1 ring-inset ring-[var(--sce-danger)]/50",
                      dropStatus === "lock" && "opacity-60",
                    )}
                    role="gridcell"
                    data-drop-state={dropStatus ?? "empty"}
                    data-testid={`planung-drop-${pitch.pitchId}-${anchor}`}
                    onPointerEnter={() => {
                      if (drag?.committed) void handlePreview(drag, pitch.pitchId, anchor, false);
                    }}
                    onPointerUp={() => {
                      if (!drag?.committed || !onManualMove || busy) return;
                      const allowed = manualMoveTargetAllowed({
                        lockDimension: drag.lockDimension,
                        fromPitchId: drag.fromPitchId,
                        fromStartUtc: drag.fromStartUtc,
                        toPitchId: pitch.pitchId,
                        toStartUtc: anchor,
                      });
                      if (!allowed) {
                        setDrag(null);
                        setHoverTarget(null);
                        return;
                      }
                      void onManualMove({
                        fixtureId: drag.fixtureId,
                        targetTournamentPitchId: pitch.pitchId,
                        targetStartAt: anchor,
                      }).finally(() => {
                        setDrag(null);
                        setHoverTarget(null);
                        previewCache.current.clear();
                      });
                    }}
                  />
                );
              }

              const selected = selectedFixtureId === fixture.fixtureId;
              const caps = resolveManualMoveCapabilities(fixture.lockDimension);
              const isDragging = drag?.fixtureId === fixture.fixtureId && drag.committed;

              return (
                <div key={cellKey} className="border-b border-[var(--border)] p-1">
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded-md border px-2 py-2 text-left text-xs transition-colors touch-none",
                      "border-[var(--border)] bg-[var(--surface-elevated)] hover:border-[var(--accent)]",
                      selected && "ring-2 ring-[var(--accent)]",
                      isDragging && "opacity-40",
                      !caps.canDrag && canManage && "cursor-default",
                      caps.canDrag && canManage && "cursor-grab active:cursor-grabbing",
                    )}
                    aria-label={fixture.accessibleLabel}
                    aria-describedby={
                      caps.lockHint ? `planung-lock-hint-${fixture.fixtureId}` : undefined
                    }
                    data-testid={`planung-fixture-${fixture.fixtureId}`}
                    data-draggable={canManage && caps.canDrag ? "true" : "false"}
                    onClick={() => {
                      if (drag?.committed) return;
                      onSelectFixture(fixture.fixtureId);
                    }}
                    onPointerDown={(event) => {
                      if (!canManage || !caps.canDrag || busy || !onManualMove) return;
                      setDrag({
                        fixtureId: fixture.fixtureId,
                        fromPitchId: fixture.pitchId,
                        fromStartUtc: fixture.startUtc,
                        lockDimension: fixture.lockDimension,
                        pointerId: event.pointerId,
                        startX: event.clientX,
                        startY: event.clientY,
                        committed: false,
                      });
                    }}
                    onPointerMove={(event) => {
                      setDrag((current) => {
                        if (!current || current.pointerId !== event.pointerId) return current;
                        if (
                          !current.committed &&
                          exceedsDragThreshold(current.startX, current.startY, event.clientX, event.clientY)
                        ) {
                          return { ...current, committed: true };
                        }
                        return current;
                      });
                    }}
                    onPointerUp={(event) => {
                      if (!drag || drag.pointerId !== event.pointerId) return;
                      if (!drag.committed) {
                        setDrag(null);
                        setHoverTarget(null);
                        return;
                      }
                      event.preventDefault();
                    }}
                    onPointerCancel={() => {
                      setDrag(null);
                      setHoverTarget(null);
                      previewCache.current.clear();
                    }}
                  >
                    <p className="truncate font-medium text-[var(--foreground)]">{fixture.sideA.label}</p>
                    <p className="truncate text-[var(--muted)]">{fixture.sideB.label}</p>
                    {fixture.lockDimension ? (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--muted)]">
                        <Lock className="h-3 w-3" aria-hidden />
                        <span>{caps.lockHint ?? "Gesperrt"}</span>
                      </span>
                    ) : null}
                    {caps.lockHint ? (
                      <span id={`planung-lock-hint-${fixture.fixtureId}`} className="sr-only">
                        {caps.lockHint}
                      </span>
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
