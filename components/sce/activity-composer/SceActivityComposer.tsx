"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import SceContextTabs from "@/components/sce/context-tabs/SceContextTabs";
import { SceContextTabProvider, SceLocalContextTabProvider } from "@/lib/context-tabs";
import SceContextTabPanel from "@/lib/context-tabs/ContextTabPanel";
import { SceModalOverlay } from "@/components/ui/SceModalOverlay";
import { useSceModalDialog } from "@/lib/ui/use-sce-modal-dialog";
import {
  SCE_ACTIVITY_COMPOSER_CLOSE_CONFIRM_MESSAGE,
  useComposerCloseGuard,
} from "@/lib/sce/activity-composer/use-composer-close-guard";
import { useComposerResponsivePresentation } from "@/lib/sce/activity-composer/use-composer-responsive-presentation";
import { mergeValidationWithFirstTab } from "@/lib/sce/activity-composer/validation-orchestration";
import {
  SceContextDirtyGuardProvider,
  useContextDetailTab,
  useContextDirtyNavigation,
} from "@/lib/context-tabs";
import type { ContextTabId } from "@/lib/context-tabs/types";
import type { SceActivityComposerProps } from "@/lib/sce/activity-composer/types";
import type { SceActivityCreateSuccessResult } from "@/lib/sce/activity-composer/success-result";
import { cn } from "@/lib/cn";
import { SceActivityComposerShell } from "./SceActivityComposerShell";

function ComposerDirtySync({ isDirty }: { isDirty: boolean }) {
  const dirtyNav = useContextDirtyNavigation();
  useEffect(() => {
    dirtyNav.setDirty(isDirty);
    return () => dirtyNav.setDirty(false);
  }, [dirtyNav, isDirty]);
  return null;
}

function ComposerTabPanels<TDraft, TTabId extends ContextTabId>({
  definition,
  draft,
  setDraft,
  isSubmitting,
  submitError,
  fieldErrors,
  tabErrors,
  idPrefix,
}: {
  definition: SceActivityComposerProps<TDraft, unknown, TTabId>["definition"];
  draft: TDraft;
  setDraft: (updater: TDraft | ((prev: TDraft) => TDraft)) => void;
  isSubmitting: boolean;
  submitError: string | null;
  fieldErrors?: Record<string, string>;
  tabErrors?: Partial<Record<TTabId, boolean>>;
  idPrefix: string;
}) {
  const config = useMemo(
    () => definition.buildTabNavigationConfig({ tabErrors }),
    [definition, tabErrors],
  );
  const { activeTab } = useContextDetailTab(config);

  return (
    <>
      {definition.tabs.map((tab) => (
        <SceContextTabPanel
          key={tab.key}
          tabKey={tab.key}
          activeTab={activeTab}
          idPrefix={idPrefix}
          testId={`sce-activity-composer-panel-${tab.key}`}
        >
          {tab.render({
            draft,
            setDraft,
            isSubmitting,
            submitError,
            fieldErrors,
          })}
        </SceContextTabPanel>
      ))}
    </>
  );
}

function ComposerWorkspace<
  TDraft,
  TResult,
  TTabId extends ContextTabId = ContextTabId,
>({
  definition,
  containerMode,
  open = true,
  onClose,
  onSuccess,
  originContext,
  draft,
  setDraft,
  isDirty,
  onDirtyChange,
  secondaryPanel,
  testId,
  presentation,
  isModalSurface,
  panelRef,
  titleRef,
  guardedClose,
}: {
  definition: SceActivityComposerProps<TDraft, TResult, TTabId>["definition"];
  containerMode: SceActivityComposerProps<TDraft, TResult, TTabId>["containerMode"];
  open?: boolean;
  onClose: () => void;
  onSuccess?: SceActivityComposerProps<TDraft, TResult, TTabId>["onSuccess"];
  originContext?: SceActivityComposerProps<TDraft, TResult, TTabId>["originContext"];
  draft: TDraft;
  setDraft: (updater: TDraft | ((prev: TDraft) => TDraft)) => void;
  isDirty: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  secondaryPanel?: SceActivityComposerProps<TDraft, TResult, TTabId>["secondaryPanel"];
  testId?: string;
  presentation: ReturnType<typeof useComposerResponsivePresentation>;
  isModalSurface: boolean;
  panelRef: React.RefObject<HTMLDivElement | null>;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  guardedClose: () => void;
}) {
  const [tabErrors, setTabErrors] = useState<Partial<Record<TTabId, boolean>>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationAnnouncement, setValidationAnnouncement] = useState<string | null>(null);

  const tabConfig = useMemo(
    () => definition.buildTabNavigationConfig({ tabErrors }),
    [definition, tabErrors],
  );
  const { navigateToTab } = useContextDetailTab(tabConfig);
  const tabStateMode = containerMode === "page" ? "url" : "local";
  const idPrefix = "sce-activity-composer-tab";

  const orderedTabKeys = useMemo(
    () => definition.tabs.map((t) => t.key),
    [definition.tabs],
  );

  const handleSubmit = useCallback(async () => {
    setSubmitError(null);
    const rawValidation = definition.validateDraft(draft);
    const validation = mergeValidationWithFirstTab(orderedTabKeys, rawValidation);
    setTabErrors(validation.tabErrors);
    setFieldErrors(validation.fieldErrors);

    if (!validation.valid) {
      setValidationAnnouncement("Bitte prüfen Sie die markierten Bereiche.");
      if (validation.firstInvalidTab) {
        navigateToTab(validation.firstInvalidTab);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const outcome = await definition.submitDraft(draft);
      if (!outcome.ok) {
        setSubmitError(outcome.error);
        return;
      }
      const success: SceActivityCreateSuccessResult<TResult> = {
        activityKind: definition.activityKind,
        activityId:
          typeof outcome.result === "object" &&
          outcome.result !== null &&
          "id" in (outcome.result as Record<string, unknown>)
            ? String((outcome.result as Record<string, unknown>).id)
            : "created",
        domainPayload: outcome.result,
        presentation: originContext ? { highlightToken: originContext.kind } : undefined,
      };
      onSuccess?.(success);
      onDirtyChange?.(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    definition,
    draft,
    navigateToTab,
    onClose,
    onDirtyChange,
    onSuccess,
    orderedTabKeys,
    originContext,
  ]);

  return (
    <SceActivityComposerShell
      activityKind={definition.activityKind}
      title={definition.title}
      description={definition.description}
      createActionLabel={definition.createActionLabel}
      presentation={presentation}
      onClose={isModalSurface ? guardedClose : undefined}
      onCancel={guardedClose}
      onSubmit={() => void handleSubmit()}
      isSubmitting={isSubmitting}
      submitError={submitError}
      validationAnnouncement={validationAnnouncement}
      secondaryPanel={secondaryPanel}
      dialogRef={panelRef}
      titleRef={titleRef}
      isModalSurface={isModalSurface && open}
      testId={testId}
      tabsRegion={
        <SceContextTabs
          config={tabConfig}
          ariaLabel={definition.title}
          testId="sce-activity-composer-tabs"
          idPrefix={idPrefix}
          localNavigation={tabStateMode === "local"}
        />
      }
    >
      <ComposerDirtySync isDirty={isDirty} />
      <ComposerTabPanels
        definition={definition}
        draft={draft}
        setDraft={setDraft}
        isSubmitting={isSubmitting}
        submitError={submitError}
        fieldErrors={fieldErrors}
        tabErrors={tabErrors}
        idPrefix={idPrefix}
      />
    </SceActivityComposerShell>
  );
}

function ComposerOrchestration<
  TDraft,
  TResult,
  TTabId extends ContextTabId = ContextTabId,
>(props: SceActivityComposerProps<TDraft, TResult, TTabId>) {
  const {
    definition,
    containerMode,
    open = true,
    onClose,
    onSuccess,
    originContext,
    draft: controlledDraft,
    onDraftChange,
    isDirty = false,
    onDirtyChange,
    secondaryPanel,
    testId,
  } = props;

  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const guardedClose = useComposerCloseGuard(onClose);
  const presentation = useComposerResponsivePresentation(containerMode);
  const isModalSurface = presentation === "overlay" || presentation === "fullscreen";

  const [internalDraft, setInternalDraft] = useState(definition.initialDraft);
  const draft = controlledDraft ?? internalDraft;

  const setDraft = useCallback(
    (updater: TDraft | ((prev: TDraft) => TDraft)) => {
      const next =
        typeof updater === "function"
          ? (updater as (prev: TDraft) => TDraft)(draft)
          : updater;
      if (onDraftChange) {
        onDraftChange(next);
      } else {
        setInternalDraft(next);
      }
      onDirtyChange?.(true);
    },
    [draft, onDraftChange, onDirtyChange],
  );

  useSceModalDialog({
    open: isModalSurface && open,
    onClose: guardedClose,
    panelRef,
  });

  useEffect(() => {
    if (containerMode !== "page" || !isDirty) {
      return;
    }
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [containerMode, isDirty]);

  const tabConfig = useMemo(
    () => definition.buildTabNavigationConfig({}),
    [definition],
  );
  const tabStateMode = containerMode === "page" ? "url" : "local";

  const TabProvider = tabStateMode === "local" ? SceLocalContextTabProvider : SceContextTabProvider;

  const workspaceInner = (
    <TabProvider config={tabConfig}>
      <ComposerWorkspace
        definition={definition}
        containerMode={containerMode}
        open={open}
        onClose={onClose}
        onSuccess={onSuccess}
        originContext={originContext}
        draft={draft}
        setDraft={setDraft}
        isDirty={isDirty}
        onDirtyChange={onDirtyChange}
        secondaryPanel={secondaryPanel}
        testId={testId}
        presentation={presentation}
        isModalSurface={isModalSurface}
        panelRef={panelRef}
        titleRef={titleRef}
        guardedClose={guardedClose}
      />
    </TabProvider>
  );

  const workspace =
    tabStateMode === "url" ? (
      <Suspense
        fallback={
          <div
            className="h-11 border-b border-[var(--border)]"
            data-testid="sce-activity-composer-tabs-loading"
          />
        }
      >
        {workspaceInner}
      </Suspense>
    ) : (
      workspaceInner
    );

  if (containerMode === "page") {
    return (
      <div
        className="mx-auto w-full max-w-[min(100%,var(--sce-dialog-workspace-max-width))] p-4 sm:p-6"
        data-origin={originContext?.kind}
      >
        {workspace}
      </div>
    );
  }

  if (!open) {
    return null;
  }

  function handlePanelKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
    }
  }

  const overlayViewportClass =
    presentation === "fullscreen"
      ? "sce-activity-composer-overlay-viewport--fullscreen !items-stretch !p-0"
      : undefined;

  return (
    <SceModalOverlay
      open={open}
      onBackdropClick={guardedClose}
      initialFocusRef={titleRef}
      testId={testId ? `${testId}-overlay` : "sce-activity-composer-overlay"}
      contentViewportClassName={cn(overlayViewportClass)}
    >
      <div onKeyDown={handlePanelKeyDown} className="contents">
        {workspace}
      </div>
    </SceModalOverlay>
  );
}

export default function SceActivityComposer<
  TDraft,
  TResult,
  TTabId extends ContextTabId = ContextTabId,
>(props: SceActivityComposerProps<TDraft, TResult, TTabId>) {
  return (
    <SceContextDirtyGuardProvider confirmMessage={SCE_ACTIVITY_COMPOSER_CLOSE_CONFIRM_MESSAGE}>
      <ComposerOrchestration {...props} />
    </SceContextDirtyGuardProvider>
  );
}
