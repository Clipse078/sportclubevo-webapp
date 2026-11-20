"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TargetNewPageClient from "@/components/admin/targets/TargetNewPageClient";
import { ClubDevelopmentComposerCancelBridge } from "@/components/sce/club-development/ClubDevelopmentComposerCancelBridge";
import SceClubDevelopmentContextualCreateCollapsibleShell from "@/components/sce/club-development/SceClubDevelopmentContextualCreateCollapsibleShell";
import {
  SceClubDevelopmentInlineDirtyCloseProvider,
  useOptionalSceClubDevelopmentInlineDirtyClose,
  useSceInlineDiscardPrompt,
} from "@/components/sce/club-development/SceClubDevelopmentInlineDirtyCloseProvider";

const PANEL_ID = "ziele-workspace-create-target-panel";
const CARD_TEST_ID = "ziele-workspace-create-target-card";

type Props = {
  canCreate: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  hideToolbarTrigger?: boolean;
};

function CreateTargetWorkspaceCollapsibleCardInner({
  canCreate,
  expanded: expandedProp,
  onExpandedChange,
  hideToolbarTrigger = false,
}: Props) {
  const router = useRouter();
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
    [expanded, inlineDirtyClose],
  );

  const collapseAfterSuccess = useCallback(() => {
    setFormKey((k) => k + 1);
    setExpanded(false);
    router.refresh();
  }, [router, setExpanded]);

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
    <div ref={cardRef} className="w-full">
        <SceClubDevelopmentContextualCreateCollapsibleShell
          actionLabel="+ Ziel anlegen"
          contextLabel="Strategisches Ziel"
          expanded={expanded}
          onExpandedChange={guardedExpandedChange}
          panelDomId={PANEL_ID}
          cardTestId={CARD_TEST_ID}
          collapseToggleTestId="ziele-workspace-create-target"
          discardPrompt={discardPrompt}
          hideToggle={hideToolbarTrigger}
        >
          <ClubDevelopmentComposerCancelBridge onClose={() => setExpanded(false)}>
            {(onCancel) => (
              <TargetNewPageClient
                key={formKey}
                layout="composer"
                onCancel={onCancel}
                onSuccess={() => collapseAfterSuccess()}
              />
            )}
          </ClubDevelopmentComposerCancelBridge>
        </SceClubDevelopmentContextualCreateCollapsibleShell>
    </div>
  );
}

export default function CreateTargetWorkspaceCollapsibleCard(props: Props) {
  return (
    <SceClubDevelopmentInlineDirtyCloseProvider>
      <CreateTargetWorkspaceCollapsibleCardInner {...props} />
    </SceClubDevelopmentInlineDirtyCloseProvider>
  );
}