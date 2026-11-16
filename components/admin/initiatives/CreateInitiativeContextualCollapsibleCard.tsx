"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import InitiativeForm from "@/components/admin/initiatives/InitiativeForm";
import { ClubDevelopmentComposerCancelBridge } from "@/components/sce/club-development/ClubDevelopmentComposerCancelBridge";
import SceClubDevelopmentContextualCreateCollapsibleShell from "@/components/sce/club-development/SceClubDevelopmentContextualCreateCollapsibleShell";
import {
  SceClubDevelopmentInlineDirtyCloseProvider,
  useOptionalSceClubDevelopmentInlineDirtyClose,
  useSceInlineDiscardPrompt,
} from "@/components/sce/club-development/SceClubDevelopmentInlineDirtyCloseProvider";
import { CD_INITIATIVE_COPY, CD_TARGET_COPY } from "@/lib/club-development/product-copy";
import {
  SCE_VORHABEN_INLINE_CREATE_FORM_INNER_CLASS,
  SCE_VORHABEN_INLINE_CREATE_SHELL_CLASS,
} from "@/lib/club-development/vorhaben-inline-create-layout";

type ContextualLinkProps = {
  targetId: string;
  onFinished: (payload: {
    initiative: { id: string; slug: string; title: string };
    linkOk: boolean;
    linkError?: string;
  }) => void;
};

type Props = {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  preselectedTarget: { id: string; title: string };
  contextualLink: ContextualLinkProps;
};

const PANEL_ID = "target-create-initiative-contextual-panel";
const CARD_TEST_ID = "target-create-initiative-contextual-card";

function CreateInitiativeContextualCollapsibleCardInner({
  expanded,
  onExpandedChange,
  preselectedTarget,
  contextualLink,
}: Props) {
  const discardPrompt = useSceInlineDiscardPrompt();
  const inlineDirtyClose = useOptionalSceClubDevelopmentInlineDirtyClose();
  const cardRef = useRef<HTMLDivElement>(null);
  const [formKey, setFormKey] = useState(0);

  const guardedExpandedChange = useCallback(
    (next: boolean) => {
      if (!next && expanded) {
        inlineDirtyClose?.requestClose(() => onExpandedChange(false));
        return;
      }
      onExpandedChange(next);
    },
    [expanded, inlineDirtyClose, onExpandedChange],
  );

  async function linkToTarget(initiative: { id: string; slug: string; title: string }) {
    const res = await fetch(
      `/api/club-development/targets/${contextualLink.targetId}/initiative-links`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initiativeId: initiative.id }),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        linkOk: false as const,
        linkError: typeof data.error === "string" ? data.error : "Verknüpfung fehlgeschlagen.",
      };
    }
    return { linkOk: true as const };
  }

  const collapseAfterSuccess = useCallback(() => {
    setFormKey((k) => k + 1);
    onExpandedChange(false);
  }, [onExpandedChange]);

  useEffect(() => {
    if (expanded) {
      const frame = window.requestAnimationFrame(() => {
        cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      return () => window.cancelAnimationFrame(frame);
    }
    return undefined;
  }, [expanded]);

  return (
  <div ref={cardRef} className={SCE_VORHABEN_INLINE_CREATE_SHELL_CLASS} data-testid="vorhaben-inline-create-shell">
      <SceClubDevelopmentContextualCreateCollapsibleShell
        actionLabel={CD_INITIATIVE_COPY.createAction}
        contextLabel={`${CD_TARGET_COPY.preselectedTargetLabel}: ${preselectedTarget.title}`}
        expanded={expanded}
        onExpandedChange={guardedExpandedChange}
        panelDomId={PANEL_ID}
        cardTestId={CARD_TEST_ID}
        collapseToggleTestId="target-create-initiative-and-link"
        discardPrompt={discardPrompt}
      >
        <div className={SCE_VORHABEN_INLINE_CREATE_FORM_INNER_CLASS}>
        <ClubDevelopmentComposerCancelBridge onClose={() => onExpandedChange(false)}>
          {(onCancel) => (
            <InitiativeForm
              key={formKey}
              mode="create"
              layout="composer"
              composerCompact
              onCancel={onCancel}
              preselectedTargetTitle={preselectedTarget.title}
              onSuccess={async (initiative) => {
                const linkResult = await linkToTarget(initiative);
                contextualLink.onFinished({
                  initiative,
                  linkOk: linkResult.linkOk,
                  linkError: linkResult.linkOk ? undefined : linkResult.linkError,
                });
                if (linkResult.linkOk) {
                  collapseAfterSuccess();
                }
              }}
            />
          )}
        </ClubDevelopmentComposerCancelBridge>
        </div>
      </SceClubDevelopmentContextualCreateCollapsibleShell>
    </div>
  );
}

export default function CreateInitiativeContextualCollapsibleCard(props: Props) {
  return (
    <SceClubDevelopmentInlineDirtyCloseProvider>
      <CreateInitiativeContextualCollapsibleCardInner {...props} />
    </SceClubDevelopmentInlineDirtyCloseProvider>
  );
}