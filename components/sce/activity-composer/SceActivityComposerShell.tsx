"use client";

import type { ReactNode, RefObject } from "react";
import { cn } from "@/lib/cn";
import { SCE_ACTIVITY_COMPOSER_PANEL_CLASS } from "@/lib/sce/activity-composer/composer-layout";
import { SCE_DIALOG_WORKSPACE_PANEL } from "@/lib/shell/responsive-layout";
import type { SceActivityComposerResolvedPresentation } from "@/lib/sce/activity-composer/types";
import { SceActivityComposerHeader } from "./SceActivityComposerHeader";
import { SceActivityComposerBody } from "./SceActivityComposerBody";
import { SceActivityComposerFooter } from "./SceActivityComposerFooter";
import type { SceActivityCreateKind } from "@/lib/sce/activity-composer/types";

export type SceActivityComposerShellProps = {
  activityKind: SceActivityCreateKind;
  title: string;
  description?: string;
  createActionLabel: string;
  persistenceStatusLabel?: string | null;
  presentation: SceActivityComposerResolvedPresentation;
  tabsRegion: ReactNode;
  children: ReactNode;
  secondaryPanel?: ReactNode;
  onClose?: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  onSaveDraft?: () => void;
  saveDraftLabel?: string;
  showSaveDraft?: boolean;
  isSubmitting?: boolean;
  isSavingDraft?: boolean;
  submitDisabled?: boolean;
  submitError?: string | null;
  draftSaveError?: string | null;
  draftSaveAnnouncement?: string | null;
  validationAnnouncement?: string | null;
  dialogRef?: RefObject<HTMLDivElement | null>;
  titleRef?: RefObject<HTMLHeadingElement | null>;
  isModalSurface?: boolean;
  testId?: string;
};

export function SceActivityComposerShell({
  activityKind,
  title,
  description,
  createActionLabel,
  persistenceStatusLabel,
  presentation,
  tabsRegion,
  children,
  secondaryPanel,
  onClose,
  onCancel,
  onSubmit,
  onSaveDraft,
  saveDraftLabel,
  showSaveDraft,
  isSubmitting,
  isSavingDraft,
  submitDisabled,
  submitError,
  draftSaveError,
  draftSaveAnnouncement,
  validationAnnouncement,
  dialogRef,
  titleRef,
  isModalSurface = false,
  testId = "sce-activity-composer",
}: SceActivityComposerShellProps) {
  const titleId = "sce-activity-composer-title";
  const descriptionId = description ? "sce-activity-composer-description" : undefined;

  const panelClassName = cn(
    presentation === "page"
      ? "flex w-full min-w-0 flex-col rounded-2xl border border-[var(--sce-surface-border-elevated)] bg-[var(--sce-surface-elevated)] shadow-[var(--sce-surface-shadow-elevated)]"
      : SCE_DIALOG_WORKSPACE_PANEL,
    presentation === "fullscreen" &&
      "sce-activity-composer-panel--fullscreen h-[100dvh] max-h-[100dvh] rounded-none",
    presentation === "overlay" && "sce-activity-composer-panel--overlay",
    SCE_ACTIVITY_COMPOSER_PANEL_CLASS,
  );

  return (
    <div
      ref={dialogRef}
      role={isModalSurface ? "dialog" : undefined}
      aria-modal={isModalSurface ? true : undefined}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-testid={testId}
      data-presentation={presentation}
      className={panelClassName}
    >
      <SceActivityComposerHeader
        activityKind={activityKind}
        title={title}
        description={description}
        titleId={titleId}
        descriptionId={descriptionId}
        onClose={onClose}
        presentation={presentation}
        titleRef={titleRef}
        persistenceStatusLabel={persistenceStatusLabel}
      />

      <SceActivityComposerBody
        presentation={presentation}
        tabsRegion={tabsRegion}
        secondaryPanel={secondaryPanel}
        validationAnnouncement={validationAnnouncement}
      >
        {children}
      </SceActivityComposerBody>

      <SceActivityComposerFooter
        createActionLabel={createActionLabel}
        onCancel={onCancel}
        onSubmit={onSubmit}
        onSaveDraft={onSaveDraft}
        saveDraftLabel={saveDraftLabel}
        showSaveDraft={showSaveDraft}
        isSubmitting={isSubmitting}
        isSavingDraft={isSavingDraft}
        submitDisabled={submitDisabled}
        submitError={submitError}
        draftSaveError={draftSaveError}
        draftSaveAnnouncement={draftSaveAnnouncement}
      />
    </div>
  );
}
