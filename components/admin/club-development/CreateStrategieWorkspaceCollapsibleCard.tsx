"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SceClubDevelopmentContextualCreateCollapsibleShell from "@/components/sce/club-development/SceClubDevelopmentContextualCreateCollapsibleShell";
import { buildStrategieUndZieleHref } from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "@/lib/club-development/vereinsentwicklung-connected-workspace";
import StrategieNeuForm from "./StrategieNeuForm";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";
import { ClubDevelopmentComposerCancelBridge } from "@/components/sce/club-development/ClubDevelopmentComposerCancelBridge";
import {
  SceClubDevelopmentInlineDirtyCloseProvider,
  useOptionalSceClubDevelopmentInlineDirtyClose,
  useSceInlineDiscardPrompt,
} from "@/components/sce/club-development/SceClubDevelopmentInlineDirtyCloseProvider";

type Props = {
  canCreate: boolean;
  orgUnitOptions: TaskOrgUnitPickerOption[];
  timeZone: string;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  hideToolbarTrigger?: boolean;
};

function CreateStrategieWorkspaceCollapsibleCardInner({
  canCreate,
  orgUnitOptions,
  timeZone,
  expanded: expandedProp,
  onExpandedChange,
  hideToolbarTrigger = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const discardPrompt = useSceInlineDiscardPrompt();
  const inlineDirtyClose = useOptionalSceClubDevelopmentInlineDirtyClose();
  const cardRef = useRef<HTMLDivElement>(null);
  const [expandedInternal, setExpandedInternal] = useState(false);
  const expanded = expandedProp ?? expandedInternal;
  const setExpanded = onExpandedChange ?? setExpandedInternal;
  const [formKey, setFormKey] = useState(0);

  const guardedExpandedChange = useCallback(
    (next: boolean) => {
      if (!next && expanded) {
        inlineDirtyClose?.requestClose(() => setExpanded(false));
        return;
      }
      setExpanded(next);
    },
    [expanded, inlineDirtyClose, setExpanded],
  );

  useEffect(() => {
    if (expanded) {
      const frame = window.requestAnimationFrame(() => {
        cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      return () => window.cancelAnimationFrame(frame);
    }
    return undefined;
  }, [expanded]);

  if (!canCreate) return null;

  return (
    <div ref={cardRef} className="w-full" data-sce-contextual-create-flow="inline-collapsible">
      <SceClubDevelopmentContextualCreateCollapsibleShell
        actionLabel="+ Strategie anlegen"
        contextLabel="Strategie"
        expanded={expanded}
        onExpandedChange={guardedExpandedChange}
        panelDomId="strategien-workspace-create-strategy-panel"
        cardTestId="strategien-workspace-create-strategy-card"
        collapseToggleTestId="strategien-workspace-create-strategy"
        discardPrompt={discardPrompt}
        hideToggle={hideToolbarTrigger}
      >
        <ClubDevelopmentComposerCancelBridge onClose={() => setExpanded(false)}>
          {(onCancel) => (
            <StrategieNeuForm
              key={formKey}
              orgUnitOptions={orgUnitOptions}
              timeZone={timeZone}
              onCancel={onCancel}
              onSuccess={(strategyId) => {
                const params: Record<string, string | undefined> = { strategyId };
                const orgQuery = searchParams.get(CD_WORKSPACE_ORG_UNIT_QUERY);
                if (orgQuery) params[CD_WORKSPACE_ORG_UNIT_QUERY] = orgQuery;
                setFormKey((k) => k + 1);
                setExpanded(false);
                router.push(buildStrategieUndZieleHref("strategie", params));
                router.refresh();
              }}
            />
          )}
        </ClubDevelopmentComposerCancelBridge>
      </SceClubDevelopmentContextualCreateCollapsibleShell>
    </div>
  );
}

export default function CreateStrategieWorkspaceCollapsibleCard(props: Props) {
  return (
    <SceClubDevelopmentInlineDirtyCloseProvider>
      <CreateStrategieWorkspaceCollapsibleCardInner {...props} />
    </SceClubDevelopmentInlineDirtyCloseProvider>
  );
}