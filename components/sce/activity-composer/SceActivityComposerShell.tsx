"use client";

import type { ReactNode, RefObject } from "react";
import { cn } from "@/lib/cn";
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
  presentation: SceActivityComposerResolvedPresentation;
  tabsRegion: ReactNode;
  children: ReactNode;
  secondaryPanel?: ReactNode;
  onClose?: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  submitError?: string | null;
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
  presentation,
  tabsRegion,
  children,
  secondaryPanel,
  onClose,
  onCancel,
  onSubmit,
  isSubmitting,
  submitDisabled,
  submitError,
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
      ? "flex min-h-[min(100dvh,48rem)] w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--sce-surface-border-elevated)] bg-[var(--sce-surface-elevated)] shadow-[var(--sce-surface-shadow-elevated)]"
      : SCE_DIALOG_WORKSPACE_PANEL,
    presentation === "fullscreen" &&
      "sce-activity-composer-panel--fullscreen h-[100dvh] max-h-[100dvh] rounded-none",
    presentation === "overlay" && "sce-activity-composer-panel--overlay",
    "sce-activity-composer-panel",
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
      />

      <SceActivityComposerBody
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
        isSubmitting={isSubmitting}
        submitDisabled={submitDisabled}
        submitError={submitError}
      />
    </div>
  );
}
