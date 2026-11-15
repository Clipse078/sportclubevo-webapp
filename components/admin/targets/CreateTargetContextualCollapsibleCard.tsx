"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TargetNewPageClient from "@/components/admin/targets/TargetNewPageClient";
import { ClubDevelopmentComposerCancelBridge } from "@/components/sce/club-development/ClubDevelopmentComposerCancelBridge";
import SceClubDevelopmentContextualCreateCollapsibleShell from "@/components/sce/club-development/SceClubDevelopmentContextualCreateCollapsibleShell";
import {
  SceClubDevelopmentInlineDirtyCloseProvider,
  useOptionalSceClubDevelopmentInlineDirtyClose,
  useSceInlineDiscardPrompt,
} from "@/components/sce/club-development/SceClubDevelopmentInlineDirtyCloseProvider";
import { CD_TARGET_COPY } from "@/lib/club-development/product-copy";

type ContextualFocusProps = {
  onFinished: (payload: { targetId: string; linkOk: boolean; linkError?: string; title?: string }) => void;
};

type Props = {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  contextualFocus: ContextualFocusProps;
};

const PANEL_ID = "strategy-create-target-contextual-panel";
const CARD_TEST_ID = "strategy-create-target-contextual-card";

function CreateTargetContextualCollapsibleCardInner({
  expanded,
  onExpandedChange,
  contextualFocus,
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

  async function linkAsSchwerpunkt(targetId: string) {
    const res = await fetch("/api/club-development/club-strategy/focus-targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        linkOk: false as const,
        linkError: typeof data.error === "string" ? data.error : "Schwerpunkt konnte nicht verknüpft werden.",
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
    <div ref={cardRef}>
      <SceClubDevelopmentContextualCreateCollapsibleShell
        actionLabel={CD_TARGET_COPY.createTargetAndLinkSchwerpunkt}
        contextLabel="Schwerpunkt der Vereinsstrategie"
        expanded={expanded}
        onExpandedChange={guardedExpandedChange}
        panelDomId={PANEL_ID}
        cardTestId={CARD_TEST_ID}
        collapseToggleTestId="strategy-create-target-and-link"
        discardPrompt={discardPrompt}
      >
        <ClubDevelopmentComposerCancelBridge onClose={() => onExpandedChange(false)}>
          {(onCancel) => (
            <TargetNewPageClient
              key={formKey}
              layout="composer"
              onCancel={onCancel}
              onSuccess={async (id, meta) => {
                if (!id) return;
                const linkResult = await linkAsSchwerpunkt(id);
                contextualFocus.onFinished({
                  targetId: id,
                  title: meta?.title,
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
      </SceClubDevelopmentContextualCreateCollapsibleShell>
    </div>
  );
}

export default function CreateTargetContextualCollapsibleCard(props: Props) {
  return (
    <SceClubDevelopmentInlineDirtyCloseProvider>
      <CreateTargetContextualCollapsibleCardInner {...props} />
    </SceClubDevelopmentInlineDirtyCloseProvider>
  );
}