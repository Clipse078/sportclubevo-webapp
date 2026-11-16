"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import InitiativeForm from "@/components/admin/initiatives/InitiativeForm";
import { ClubDevelopmentComposerCancelBridge } from "@/components/sce/club-development/ClubDevelopmentComposerCancelBridge";
import SceClubDevelopmentContextualCreateCollapsibleShell from "@/components/sce/club-development/SceClubDevelopmentContextualCreateCollapsibleShell";
import {
  SceClubDevelopmentInlineDirtyCloseProvider,
  useOptionalSceClubDevelopmentInlineDirtyClose,
  useSceInlineDiscardPrompt,
} from "@/components/sce/club-development/SceClubDevelopmentInlineDirtyCloseProvider";
import { CD_INITIATIVE_COPY } from "@/lib/club-development/product-copy";
import {
  SCE_VORHABEN_INLINE_CREATE_FORM_INNER_CLASS,
  SCE_VORHABEN_INLINE_CREATE_SHELL_CLASS,
} from "@/lib/club-development/vorhaben-inline-create-layout";

const PANEL_ID = "vorhaben-workspace-create-initiative-panel";
const CARD_TEST_ID = "vorhaben-workspace-create-initiative-card";

type FilterTarget = {
  id: string;
  title: string;
};

export type VorhabenInlineCreateVariant = "standard" | "prioritaeten";

type Props = {
  canCreate: boolean;
  filterTarget?: FilterTarget | null;
  onCreated?: () => void;
  variant?: VorhabenInlineCreateVariant;
  collapseToggleTestId?: string;
  cardTestId?: string;
};

async function linkInitiativeToTarget(targetId: string, initiativeId: string) {
  const res = await fetch(`/api/club-development/targets/${targetId}/initiative-links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initiativeId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return typeof data.error === "string" ? data.error : "Verknüpfung fehlgeschlagen.";
  }
  return null;
}

function CreateInitiativeWorkspaceCollapsibleCardInner({
  canCreate,
  filterTarget = null,
  onCreated,
  variant = "standard",
  collapseToggleTestId = "vorhaben-workspace-create-initiative",
  cardTestId = CARD_TEST_ID,
}: Props) {
  const router = useRouter();
  const discardPrompt = useSceInlineDiscardPrompt();
  const inlineDirtyClose = useOptionalSceClubDevelopmentInlineDirtyClose();
  const cardRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [linkError, setLinkError] = useState<string | null>(null);

  const guardedExpandedChange = useCallback(
    (next: boolean) => {
      if (!next && expanded) {
        inlineDirtyClose?.requestClose(() => setExpanded(false));
        return;
      }
      setExpanded(next);
      if (!next) setLinkError(null);
    },
    [expanded, inlineDirtyClose],
  );

  const collapseAfterSuccess = useCallback(() => {
    setFormKey((k) => k + 1);
    setExpanded(false);
    setLinkError(null);
    onCreated?.();
    router.refresh();
  }, [onCreated, router]);

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

  const contextLabel = filterTarget
    ? `Verknüpfung mit: ${filterTarget.title}`
    : variant === "prioritaeten"
      ? CD_INITIATIVE_COPY.prioritaetenCreateContext
      : CD_INITIATIVE_COPY.composerDescription;

  return (
    <div
      ref={cardRef}
      className={SCE_VORHABEN_INLINE_CREATE_SHELL_CLASS}
      data-sce-contextual-create-flow="inline-collapsible"
      data-testid="vorhaben-inline-create-shell"
    >
      {linkError ? (
        <p className="mb-2 text-sm text-red-700" role="alert">
          {linkError}
        </p>
      ) : null}
      <SceClubDevelopmentContextualCreateCollapsibleShell
        actionLabel={CD_INITIATIVE_COPY.createAction}
        contextLabel={contextLabel}
        expanded={expanded}
        onExpandedChange={guardedExpandedChange}
        panelDomId={PANEL_ID}
        cardTestId={cardTestId}
        collapseToggleTestId={collapseToggleTestId}
        discardPrompt={discardPrompt}
      >
        <div className={SCE_VORHABEN_INLINE_CREATE_FORM_INNER_CLASS}>
          <ClubDevelopmentComposerCancelBridge onClose={() => setExpanded(false)}>
            {(onCancel) => (
              <InitiativeForm
                key={formKey}
                mode="create"
                layout="composer"
                composerCompact
                prioritaetenFields={variant === "prioritaeten"}
                onCancel={onCancel}
                preselectedTargetTitle={filterTarget?.title}
                onSuccess={async (initiative) => {
                  if (filterTarget) {
                    const errorMessage = await linkInitiativeToTarget(filterTarget.id, initiative.id);
                    if (errorMessage) {
                      setLinkError(errorMessage);
                      return;
                    }
                  }
                  collapseAfterSuccess();
                }}
              />
            )}
          </ClubDevelopmentComposerCancelBridge>
        </div>
      </SceClubDevelopmentContextualCreateCollapsibleShell>
    </div>
  );
}

export default function CreateInitiativeWorkspaceCollapsibleCard(props: Props) {
  return (
    <SceClubDevelopmentInlineDirtyCloseProvider>
      <CreateInitiativeWorkspaceCollapsibleCardInner {...props} />
    </SceClubDevelopmentInlineDirtyCloseProvider>
  );
}