"use client";

import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { SceClubDevelopmentComposerShell } from "@/components/sce/club-development/SceClubDevelopmentComposerShell";
import { ClubDevelopmentComposerCancelBridge } from "@/components/sce/club-development/ClubDevelopmentComposerCancelBridge";

type Props = { open: boolean; onClose: () => void };

/**
 * Modal-first shell for Prozesse (demo domain) — parity with Target/Initiative composers (SCE-UX-01A).
 */
export default function CreateProcessComposerDialog({ open, onClose }: Props) {
  return (
    <SceClubDevelopmentComposerShell
      open={open}
      onClose={onClose}
      title="Neuer Prozess"
      description="Prozessvorlage starten — aktuell Demo-/Visionsmodus."
      testId="create-process-composer"
    >
      <ClubDevelopmentComposerCancelBridge onClose={onClose}>
        {(onCancel) => (
          <div className="space-y-5 p-1" data-sce-process-composer-placeholder>
            <div className="flex items-start gap-3 rounded-xl border border-[var(--sce-warning-light)] bg-[var(--sce-warning-light)] px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sce-warning)]" aria-hidden />
              <p className="text-sm text-[var(--sce-warning)]">
                <span className="font-semibold">In Entwicklung.</span> Prozess-Checklisten sind noch Demo-Daten
                ohne Persistenz. Der Composer nutzt dieselbe Workspace-Hülle wie Ziele und Initiativen.
              </p>
            </div>
            <p className="text-sm text-[var(--text-2)]">
              Wenn Prozesse produktiv werden, öffnet dieser Dialog denselben Erstellungs-Workflow wie die
              anderen Vereinsentwicklung-Bereiche.
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" className="fca-button-secondary" onClick={onCancel}>
                Schliessen
              </button>
              <button type="button" className="fca-button-primary" disabled title="Demnächst verfügbar">
                Prozess starten
                <Badge variant="warning" size="sm" className="ml-2">
                  Demnächst
                </Badge>
              </button>
            </div>
          </div>
        )}
      </ClubDevelopmentComposerCancelBridge>
    </SceClubDevelopmentComposerShell>
  );
}
