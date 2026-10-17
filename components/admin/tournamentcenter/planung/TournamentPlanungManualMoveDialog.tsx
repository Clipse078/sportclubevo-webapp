"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TournamentPlanungViewModel } from "@/lib/tournaments/planung/types";
import { resolveManualMoveCapabilities } from "@/lib/tournaments/planung/manual-move-capabilities";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

type Props = {
  open: boolean;
  onClose: () => void;
  model: TournamentPlanungViewModel;
  fixtureId: string;
  timezone: string;
  busy: boolean;
  onSubmit: (payload: {
    targetTournamentPitchId: string;
    targetStartAt: string;
  }) => Promise<void>;
};

function formatTimeInput(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
}

export default function TournamentPlanungManualMoveDialog({
  open,
  onClose,
  model,
  fixtureId,
  timezone,
  busy,
  onSubmit,
}: Props) {
  const cell = model.cells.find((c) => c.kind === "FIXTURE" && c.fixtureId === fixtureId);
  const caps = useMemo(
    () => resolveManualMoveCapabilities(cell?.kind === "FIXTURE" ? cell.lockDimension : null),
    [cell],
  );
  const initialPitch = cell?.kind === "FIXTURE" ? cell.pitchId : model.pitches[0]?.pitchId ?? "";
  const initialStart = cell?.kind === "FIXTURE" ? cell.startUtc : model.timeScale?.rowAnchorsUtc[0] ?? "";
  const [pitchId, setPitchId] = useState(initialPitch);
  const [startUtc, setStartUtc] = useState(initialStart);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      setPitchId(initialPitch);
      setStartUtc(initialStart);
    } else if (restoreFocusRef.current) {
      restoreFocusRef.current.focus();
      restoreFocusRef.current = null;
    }
  }, [open, initialPitch, initialStart]);

  if (!cell || cell.kind !== "FIXTURE" || !model.timeScale) return null;

  const timeOptions = model.timeScale.rowAnchorsUtc;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Spiel verschieben"
      data-testid="tournament-planung-manual-move-dialog"
    >
      <p className="text-sm text-[var(--foreground)]">
        {cell.sideA.label} – {cell.sideB.label}
      </p>
      {caps.lockHint ? (
        <p className="mt-2 text-xs text-[var(--muted)]" role="status">
          {caps.lockHint}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        <label className="block text-sm text-[var(--foreground)]">
          Startzeit
          <select
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            disabled={!caps.allowTimeChange || busy}
            value={startUtc}
            onChange={(e) => setStartUtc(e.target.value)}
            data-testid="manual-move-time-select"
          >
            {timeOptions.map((anchor) => (
              <option key={anchor} value={anchor}>
                {formatTimeInput(anchor, timezone)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-[var(--foreground)]">
          Turnierfeld
          <select
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            disabled={!caps.allowPitchChange || busy}
            value={pitchId}
            onChange={(e) => setPitchId(e.target.value)}
            data-testid="manual-move-pitch-select"
          >
            {model.pitches.map((pitch) => (
              <option key={pitch.pitchId} value={pitch.pitchId}>
                {pitch.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
          Abbrechen
        </Button>
        <Button
          type="button"
          disabled={busy}
          data-testid="manual-move-submit"
          onClick={() =>
            onSubmit({
              targetTournamentPitchId: pitchId,
              targetStartAt: startUtc,
            })
          }
        >
          Verschieben
        </Button>
      </div>
    </Dialog>
  );
}
