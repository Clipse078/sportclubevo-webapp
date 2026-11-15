"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import MeetingForm from "@/components/admin/meetings/MeetingForm";
import { ClubDevelopmentComposerCancelBridge } from "@/components/sce/club-development/ClubDevelopmentComposerCancelBridge";
import SceClubDevelopmentContextualCreateCollapsibleShell from "@/components/sce/club-development/SceClubDevelopmentContextualCreateCollapsibleShell";
import {
  SceClubDevelopmentInlineDirtyCloseProvider,
  useOptionalSceClubDevelopmentInlineDirtyClose,
  useSceInlineDiscardPrompt,
} from "@/components/sce/club-development/SceClubDevelopmentInlineDirtyCloseProvider";
import { CD_MEETINGS_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import type { VisibilityScopeValue } from "@/components/admin/shared/VisibilityScopeSelect";

const PANEL_ID = "vereinsleitung-meetings-create-panel";
const CARD_TEST_ID = "vereinsleitung-meetings-create-card";

type MeetingCreateDefaults = {
  visibilityScope: VisibilityScopeValue;
  visibleOrgUnitRefs: string[];
  visibilityHint: string | null;
};

type Props = {
  canCreate: boolean;
  defaults: MeetingCreateDefaults | null;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};

export function CreateMeetingListTrigger({
  className,
  onClick,
}: {
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={className ?? "fca-button-primary inline-flex items-center gap-2"}
      data-sce-create-flow="inline-collapsible"
      data-testid="meeting-create-trigger"
    >
      <Plus className="h-4 w-4" aria-hidden />
      {CD_MEETINGS_WORKSPACE_COPY.createAction}
    </button>
  );
}

function CreateMeetingInlineCollapsibleCardInner({
  canCreate,
  defaults,
  expanded: expandedProp,
  onExpandedChange,
}: Props) {
  const router = useRouter();
  const discardPrompt = useSceInlineDiscardPrompt();
  const inlineDirtyClose = useOptionalSceClubDevelopmentInlineDirtyClose();
  const cardRef = useRef<HTMLDivElement>(null);
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const expanded = expandedProp ?? uncontrolledExpanded;
  const setExpanded = onExpandedChange ?? setUncontrolledExpanded;

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
    <div ref={cardRef} className="mb-4">
      <SceClubDevelopmentContextualCreateCollapsibleShell
        actionLabel={CD_MEETINGS_WORKSPACE_COPY.createAction}
        contextLabel={CD_MEETINGS_WORKSPACE_COPY.createContext}
        expanded={expanded}
        onExpandedChange={guardedExpandedChange}
        panelDomId={PANEL_ID}
        cardTestId={CARD_TEST_ID}
        collapseToggleTestId="vereinsleitung-meetings-create-toggle"
        discardPrompt={discardPrompt}
      >
        <ClubDevelopmentComposerCancelBridge onClose={() => setExpanded(false)}>
          {(onCancel) => (
            <MeetingForm
              key={formKey}
              mode="create"
              layout="composer"
              onCancel={onCancel}
              defaultValues={{
                visibilityScope: defaults?.visibilityScope ?? "RESTRICTED",
                visibleOrgUnitRefs: defaults?.visibleOrgUnitRefs ?? [],
                visibilityHint: defaults?.visibilityHint ?? null,
              }}
              onSuccess={(slug) => {
                setFormKey((k) => k + 1);
                setExpanded(false);
                if (slug) {
                  router.push(`/vereinsleitung/meetings/${slug}`);
                } else {
                  router.refresh();
                }
              }}
            />
          )}
        </ClubDevelopmentComposerCancelBridge>
      </SceClubDevelopmentContextualCreateCollapsibleShell>
    </div>
  );
}

export default function CreateMeetingInlineCollapsibleCard(props: Props) {
  return (
    <SceClubDevelopmentInlineDirtyCloseProvider>
      <CreateMeetingInlineCollapsibleCardInner {...props} />
    </SceClubDevelopmentInlineDirtyCloseProvider>
  );
}