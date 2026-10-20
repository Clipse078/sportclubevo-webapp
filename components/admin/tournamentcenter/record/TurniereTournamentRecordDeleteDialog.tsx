"use client";

import { AlertTriangle } from "lucide-react";
import { SceConfirmDialog } from "@/components/sce/actions/SceConfirmDialog";

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
    <SceConfirmDialog
      open={open}
      onClose={onClose}
      title={title}
      description="Diese Aktion ist endgültig und kann nicht rückgängig gemacht werden."
      dialogType="DESTRUCTIVE_CONFIRMATION"
      confirmLabel="Endgültig löschen"
      onConfirm={onConfirm}
      confirmLoading={deleteBusy}
      confirmDisabled={deleteImpactLoading}
      errorMessage={deleteError}
      confirmTestId="tournament-delete-confirm"
    >
      <div className="space-y-3">
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
    </SceConfirmDialog>
  );
}
