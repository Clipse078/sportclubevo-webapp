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
};

function CreateTargetWorkspaceCollapsibleCardInner({ canCreate }: Props) {
  const router = useRouter();
  const discardPrompt = useSceInlineDiscardPrompt();
  const inlineDirtyClose = useOptionalSceClubDevelopmentInlineDirtyClose();
  const cardRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
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
  }, [router]);

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
    <div ref={cardRef} className="flex justify-end">
      <div className="w-full max-w-xl">
        <SceClubDevelopmentContextualCreateCollapsibleShell
          actionLabel="+ Ziel anlegen"
          contextLabel="Strategisches Ziel"
          expanded={expanded}
          onExpandedChange={guardedExpandedChange}
          panelDomId={PANEL_ID}
          cardTestId={CARD_TEST_ID}
          collapseToggleTestId="ziele-workspace-create-target"
          discardPrompt={discardPrompt}
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