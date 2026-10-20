"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";
import {
  TournamentComposerSpielplanPanel,
  TournamentComposerSpielfelderPanel,
  TournamentComposerTurnierformatPanel,
} from "@/components/admin/tournamentcenter/composer/TournamentComposerPlannerPanels";
import type { TournamentComposerPlannerDraft } from "@/lib/tournaments/composer/tournament-composer-planner-types";
import type { TournamentComposerDraftPayload } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import type { ProgrammeTemplateCategoryContext } from "@/lib/tournament-scheduling/programme-templates/types";
import { prepareTournamentComposerProposal } from "@/lib/tournaments/composer/prepare-tournament-composer-proposal";
import { validateHomePlannerDraft } from "@/lib/tournaments/composer/tournament-composer-planner-validation";
import { useToast } from "@/hooks/use-toast";
import type { TournamentPlanungViewModel } from "@/lib/tournaments/planung/types";

type SetupStep = "turnierformat" | "spielfelder" | "spielplan";

const STEPS: SetupStep[] = ["turnierformat", "spielfelder", "spielplan"];

type Props = {
  open: boolean;
  onClose: () => void;
  tournamentId: string;
  onConfigured: (viewModel: TournamentPlanungViewModel) => void;
};

export default function TournamentPlanungSetupDialog({
  open,
  onClose,
  tournamentId,
  onConfigured,
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<SetupStep>("turnierformat");
  const [payload, setPayload] = useState<TournamentComposerDraftPayload | null>(null);
  const [planner, setPlanner] = useState<TournamentComposerPlannerDraft | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [categoryContext, setCategoryContext] = useState<ProgrammeTemplateCategoryContext | null>(
    null,
  );
  const [tenantClubName, setTenantClubName] = useState("");
  const [tenantLogoUrl, setTenantLogoUrl] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setStep("turnierformat");
    setFieldErrors({});
    setLoading(true);
    void fetch(`/api/tournaments/${tournamentId}/planung/setup`)
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Turnierplanung konnte nicht geladen werden.");
        }
        return res.json() as Promise<{
          payload: TournamentComposerDraftPayload;
          planner: TournamentComposerPlannerDraft;
          participantCount: number;
          categoryContext: ProgrammeTemplateCategoryContext | null;
          tenantClubName: string;
          tenantLogoUrl: string | null;
        }>;
      })
      .then((data) => {
        setPayload(data.payload);
        setPlanner(data.planner);
        setParticipantCount(data.participantCount);
        setCategoryContext(data.categoryContext);
        setTenantClubName(data.tenantClubName);
        setTenantLogoUrl(data.tenantLogoUrl);
      })
      .catch((err: unknown) => {
        toast.danger(err instanceof Error ? err.message : "Laden fehlgeschlagen.");
        onClose();
      })
      .finally(() => setLoading(false));
  }, [open, tournamentId, toast, onClose]);

  const applyPlannerUpdate = useCallback(
    (updater: (prev: TournamentComposerPlannerDraft) => TournamentComposerPlannerDraft) => {
      setPlanner((prev) => {
        if (!prev || !payload) return prev;
        const base =
          prepareTournamentComposerProposal({
            participants: payload.participants,
            planner: prev,
            teamAgeGroupById: new Map(),
            teamJuniorCategoryById: new Map(),
            preserveUserPitchEdits: prev.pitchesUserCustomized === true,
          }).planner ?? prev;
        return updater(base);
      });
    },
    [payload],
  );

  const draftForValidation = useMemo(() => {
    if (!payload || !planner) return null;
    return { ...payload, spielplanCreationEnabled: true, planner };
  }, [payload, planner]);

  const stepIndex = STEPS.indexOf(step);

  async function saveSetup() {
    if (!planner || !draftForValidation) return;
    const errors = validateHomePlannerDraft(draftForValidation);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.danger("Bitte alle Pflichtfelder für die Turnierplanung ausfüllen.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/planung/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planner }),
      });
      const data = (await res.json()) as {
        viewModel?: TournamentPlanungViewModel;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Speichern fehlgeschlagen.");
      }
      if (data.viewModel) {
        onConfigured(data.viewModel);
      }
      toast.success("Turnierplanung eingerichtet.");
      onClose();
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title="Turnierplanung einrichten"
      description="Format, Felder, Timing und Pausen für dieses Turnier festlegen — ohne das Turnier neu anzulegen."
      footer={
        <div className={SCE_DIALOG_ACTIONS_ROW_CLASS} data-sce-dialog-actions>
          <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
            Abbrechen
          </Button>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            {stepIndex > 0 ? (
              <Button
                type="button"
                variant="secondary"
                disabled={saving || loading}
                onClick={() => setStep(STEPS[stepIndex - 1]!)}
              >
                Zurück
              </Button>
            ) : null}
            {stepIndex < STEPS.length - 1 ? (
              <Button
                type="button"
                disabled={saving || loading || !planner}
                onClick={() => setStep(STEPS[stepIndex + 1]!)}
                data-testid="tournament-planung-setup-next"
              >
                Weiter
              </Button>
            ) : (
              <Button
                type="button"
                disabled={saving || loading || !planner}
                onClick={() => void saveSetup()}
                data-testid="tournament-planung-setup-save"
                aria-busy={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                    Speichern …
                  </>
                ) : (
                  "Turnierplanung einrichten"
                )}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div
        className="max-h-[min(70vh,42rem)] overflow-y-auto pr-1"
        data-testid="tournament-planung-setup-dialog"
        data-sce-dialog-shell
      >
        {loading || !planner || !payload ? (
          <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Turnierplanung wird geladen …
          </p>
        ) : (
          <>
            <p className="mb-4 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Schritt {stepIndex + 1} von {STEPS.length}
            </p>
            {step === "turnierformat" ? (
              <TournamentComposerTurnierformatPanel
                planner={planner}
                participantCount={participantCount}
                categoryContext={categoryContext}
                onChange={applyPlannerUpdate}
                fieldErrors={fieldErrors}
              />
            ) : null}
            {step === "spielfelder" ? (
              <TournamentComposerSpielfelderPanel
                planner={planner}
                participantCount={participantCount}
                categoryContext={categoryContext}
                onChange={applyPlannerUpdate}
                fieldErrors={fieldErrors}
              />
            ) : null}
            {step === "spielplan" ? (
              <TournamentComposerSpielplanPanel
                payload={payload}
                planner={planner}
                categoryContext={categoryContext}
                tenantClubName={tenantClubName}
                tenantLogoUrl={tenantLogoUrl}
                onChange={applyPlannerUpdate}
                fieldErrors={fieldErrors}
              />
            ) : null}
          </>
        )}
      </div>
    </Dialog>
  );
}
