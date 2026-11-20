"use client";

import { useRouter } from "next/navigation";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { useGuardedComposerCancel } from "@/lib/ux/use-guarded-composer-cancel";
import {
  buildStrategieReturnHref,
  parseSafeReturnToHref,
} from "@/lib/club-development/vereinsentwicklung-create-routing";
import VereinsentwicklungFullPageCreatePanel from "./VereinsentwicklungFullPageCreatePanel";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";
import StrategieNeuForm from "./StrategieNeuForm";

type Props = {
  backHref: string;
  orgUnitId: string | null;
  orgUnitOptions: TaskOrgUnitPickerOption[];
  timeZone: string;
};

export default function StrategieNeuClient({ backHref, orgUnitId, orgUnitOptions, timeZone }: Props) {
  const router = useRouter();
  const guardedCancel = useGuardedComposerCancel();

  const navigateBack = () => {
    guardedCancel(() => router.push(parseSafeReturnToHref(backHref, buildStrategieReturnHref({ orgUnitId }))));
  };

  return (
    <div className="mx-auto w-full max-w-[120rem] px-4 py-4 sm:px-6">
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          { label: "Vereinsentwicklung", href: buildStrategieReturnHref({ orgUnitId }) },
          { label: "Neue Strategie" },
        ]}
        header={{
          title: "Neue Strategie",
          description: "Strategie mit zugeordneten Org-Einheiten anlegen.",
          secondaryActions: (
            <button type="button" className="fca-button-secondary text-sm" onClick={navigateBack}>
              Zurück
            </button>
          ),
        }}
        density="dense"
      >
        <div className="mx-auto w-full max-w-3xl" data-testid="strategie-workspace-create">
          <VereinsentwicklungFullPageCreatePanel
            panelTitle="Strategie erstellen"
            panelDomId="strategie-neu-panel"
            cardTestId="strategie-neu-create-card"
            formTestId="strategie-neu-form-wrap"
          >
            <StrategieNeuForm
              orgUnitOptions={orgUnitOptions}
              timeZone={timeZone}
              onCancel={navigateBack}
              onSuccess={(strategyId) => {
                router.push(
                  buildStrategieReturnHref({
                    orgUnitId,
                    strategyId,
                  }),
                );
                router.refresh();
              }}
            />
          </VereinsentwicklungFullPageCreatePanel>
        </div>
      </SceWorkspaceChrome>
    </div>
  );
}