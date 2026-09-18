"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

export type TournamentDeletionImpactRow = { key: string; label: string; count: number };

type Props = {
  open: boolean;
  title: string;
  deleteImpactLoading: boolean;
  deleteBusy: boolean;
  deleteError: string | null;
  deleteImpact: TournamentDeletionImpactRow[] | null;
  onClose: () => void;
  onConfirm: () => void;
};

export default function TurniereTournamentRecordDeleteDialog({
  open,
  title,
  deleteImpactLoading,
  deleteBusy,
  deleteError,
  deleteImpact,
  onClose,
  onConfirm,
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description="Diese Aktion ist endgültig und kann nicht rückgängig gemacht werden."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            variant="danger"
            loading={deleteBusy}
            disabled={deleteImpactLoading}
            onClick={onConfirm}
            data-testid="tournament-delete-confirm"
          >
            Endgültig löschen
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {deleteError ? <p className="text-sm font-medium text-[var(--sce-danger)]">{deleteError}</p> : null}

        {deleteImpactLoading ? (
          <p className="text-sm text-[var(--text-2)]">Auswirkungen werden geprüft…</p>
        ) : deleteImpact && deleteImpact.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-lg border border-[var(--sce-warning-border)] bg-[var(--sce-warning-light)] p-3 text-[var(--sce-warning)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p className="text-sm">
                Folgende verknüpfte Daten werden ebenfalls unwiderruflich entfernt. Teilnehmende Vereine, Teams und
                Ressourcen selbst bleiben erhalten.
              </p>
            </div>
            <ul className="list-inside list-disc space-y-1 text-sm text-[var(--text-2)]">
              {deleteImpact.map((item) => (
                <li key={item.key}>
                  {item.label}: {item.count}
                </li>
              ))}
            </ul>
          </div>
        ) : deleteImpact ? (
          <p className="text-sm text-[var(--text-2)]">
            Keine Teilnehmer, Ressourcen-Zuordnungen oder Historie vorhanden.
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
