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
import SceActivityComposerWorkflowNav from "./SceActivityComposerWorkflowNav";
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
  isGuidedFinalReviewStep,
  resolveGuidedNextStep,
  resolveGuidedPreviousStep,
  resolveGuidedWorkflowEnabled,
} from "@/lib/sce/activity-composer/guided-workflow";
import { useGuidedWorkflowStepInteraction } from "@/lib/sce/activity-composer/use-guided-workflow-step-interaction";
import { sceActivityDraftsEqual } from "@/lib/sce/activity-composer/draft-equality";
import {
  SCE_ACTIVITY_CREATE_SAVE_EXISTING_DRAFT_LABEL,
  SCE_ACTIVITY_CREATE_SAVE_NEW_DRAFT_LABEL,
} from "@/lib/sce/activity-composer/draft-persistence-capability";
import {
  resolveComposerLifecyclePhase,
  resolveComposerPersistenceStatusLabel,
} from "@/lib/sce/activity-composer/composer-lifecycle-state";
import {
  SceContextDirtyGuardProvider,
  useContextDetailTab,
  useContextDirtyNavigation,
} from "@/lib/context-tabs";
import type { ContextTabId } from "@/lib/context-tabs/types";
import type { SceActivityComposerProps } from "@/lib/sce/activity-composer/types";
import type { SceActivityCreateSuccessResult } from "@/lib/sce/activity-composer/success-result";
import {
  resolveCommitSuccessOutcome,
  resolveComposerCommitActionLabelFromGovernance,
  resolveComposerEffectiveGovernanceOrDefault,
} from "@/lib/sce/activity-governance";
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
  isSavingDraft,
  submitError,
  draftSaveError,
  fieldErrors,
  tabErrors,
  idPrefix,
}: {
  definition: SceActivityComposerProps<TDraft, unknown, TTabId>["definition"];
  draft: TDraft;
  setDraft: (updater: TDraft | ((prev: TDraft) => TDraft)) => void;
  isSubmitting: boolean;
  isSavingDraft: boolean;
  submitError: string | null;
  draftSaveError: string | null;
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
            isSavingDraft,
            submitError,
            draftSaveError,
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
  supportsDraftPersistence,
  hasPersistedDraft,
  persistedDraftId,
  onDraftPersisted,
  effectiveGovernance,
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
  supportsDraftPersistence: boolean;
  hasPersistedDraft: boolean;
  persistedDraftId?: string;
  onDraftPersisted: (input: { draft: TDraft; draftId: string }) => void;
  effectiveGovernance: ReturnType<typeof resolveComposerEffectiveGovernanceOrDefault>;
}) {
  const [tabErrors, setTabErrors] = useState<Partial<Record<TTabId, boolean>>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftSaveError, setDraftSaveError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [validationAnnouncement, setValidationAnnouncement] = useState<string | null>(null);
  const [draftSaveAnnouncement, setDraftSaveAnnouncement] = useState<string | null>(null);

  const draftPersistence = definition.draftPersistence;
  const saveDraftLabel = hasPersistedDraft
    ? (draftPersistence?.saveExistingDraftLabel ?? SCE_ACTIVITY_CREATE_SAVE_EXISTING_DRAFT_LABEL)
    : (draftPersistence?.saveNewDraftLabel ?? SCE_ACTIVITY_CREATE_SAVE_NEW_DRAFT_LABEL);

  const lifecyclePhase = resolveComposerLifecyclePhase({
    hasPersistedDraft,
    isDirty,
    isSavingDraft,
    isSubmitting,
    draftSaveError,
    submitError,
  });
  const commitActionLabel = resolveComposerCommitActionLabelFromGovernance({
    directPublishLabel: definition.createActionLabel,
    effectiveGovernance,
  });
  const commitIsApprovalSubmission =
    effectiveGovernance.publicationAuthority === "APPROVAL_REQUIRED";

  const persistenceStatusLabel = supportsDraftPersistence
    ? resolveComposerPersistenceStatusLabel(lifecyclePhase, { commitIsApprovalSubmission })
    : null;

  const tabConfig = useMemo(
    () => definition.buildTabNavigationConfig({ tabErrors }),
    [definition, tabErrors],
  );
  const { activeTab, navigateToTab } = useContextDetailTab(tabConfig);
  const tabStateMode = containerMode === "page" ? "url" : "local";
  const idPrefix = "sce-activity-composer-tab";

  const orderedTabKeys = useMemo(
    () => definition.tabs.map((t) => t.key),
    [definition.tabs],
  );

  const guidedWorkflow = definition.guidedWorkflow;
  const guidedEnabled = resolveGuidedWorkflowEnabled(guidedWorkflow);
  const isFinalReviewStep =
    guidedEnabled && isGuidedFinalReviewStep(guidedWorkflow, activeTab);
  const guidedPreviousStep = guidedEnabled
    ? resolveGuidedPreviousStep(orderedTabKeys, activeTab)
    : null;
  const guidedNextStep = guidedEnabled
    ? resolveGuidedNextStep(orderedTabKeys, activeTab)
    : null;

  const guidedStepInteraction = useGuidedWorkflowStepInteraction(
    guidedEnabled
      ? {
          orderedTabKeys,
          activeTab,
          guidedWorkflow,
          draft,
          tabErrors,
        }
      : {
          orderedTabKeys,
          activeTab,
          guidedWorkflow: { finalReviewTab: orderedTabKeys[0]! },
          draft,
          tabErrors,
        },
  );

  const handleGuidedPrevious = useCallback(() => {
    if (guidedPreviousStep) {
      navigateToTab(guidedPreviousStep, { skipDirtyConfirm: true });
    }
  }, [guidedPreviousStep, navigateToTab]);

  const handleGuidedNext = useCallback(() => {
    if (!guidedEnabled || !guidedNextStep) {
      return;
    }
    if (guidedWorkflow.validateStep) {
      const rawValidation = guidedWorkflow.validateStep(draft, activeTab);
      const validation = mergeValidationWithFirstTab([activeTab], rawValidation);
      setTabErrors((prev) => ({ ...prev, ...validation.tabErrors }));
      setFieldErrors(validation.fieldErrors);
      if (!validation.valid) {
        const firstFieldMessage = validation.fieldErrors
          ? Object.values(validation.fieldErrors)[0]
          : null;
        setValidationAnnouncement(
          firstFieldMessage ?? "Bitte prüfen Sie die markierten Bereiche.",
        );
        requestAnimationFrame(() => {
          const panel =
            panelRef.current ??
            document.querySelector<HTMLElement>(
              `[data-testid="${testId ?? "sce-activity-composer"}"]`,
            );
          const firstInvalid =
            panel?.querySelector<HTMLElement>("[aria-invalid='true']") ??
            panel?.querySelector<HTMLElement>("[data-testid$='-input']");
          firstInvalid?.focus();
        });
        return;
      }
    }
    setValidationAnnouncement(null);
    guidedStepInteraction.markStepReviewed(activeTab);
    navigateToTab(guidedNextStep, { skipDirtyConfirm: true });
  }, [
    activeTab,
    draft,
    guidedEnabled,
    guidedNextStep,
    guidedStepInteraction,
    guidedWorkflow,
    navigateToTab,
    panelRef,
    testId,
  ]);

  const handleSaveDraft = useCallback(async () => {
    if (!draftPersistence) {
      return;
    }
    setDraftSaveError(null);
    setSubmitError(null);
    setDraftSaveAnnouncement(null);
    const rawValidation = draftPersistence.validateDraftForSave(draft);
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

    setIsSavingDraft(true);
    try {
      const outcome = await draftPersistence.saveDraft({
        draft,
        draftId: persistedDraftId,
      });
      if (!outcome.ok) {
        setDraftSaveError(outcome.error);
        return;
      }
      onDraftPersisted({ draft, draftId: outcome.draftId });
      setDraftSaveAnnouncement("Entwurf gespeichert.");
      const success: SceActivityCreateSuccessResult<typeof outcome.result> = {
        outcome: "DRAFT_SAVED",
        activityKind: definition.activityKind,
        activityId: outcome.draftId,
        draftId: outcome.draftId,
        domainPayload: outcome.result,
        presentation: originContext ? { highlightToken: originContext.kind } : undefined,
      };
      onSuccess?.(success as SceActivityCreateSuccessResult<TResult>);
    } finally {
      setIsSavingDraft(false);
    }
  }, [
    definition.activityKind,
    draft,
    draftPersistence,
    navigateToTab,
    onDraftPersisted,
    onSuccess,
    orderedTabKeys,
    originContext,
    persistedDraftId,
  ]);

  const handleSubmit = useCallback(async () => {
    setSubmitError(null);
    setDraftSaveError(null);
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
        outcome: resolveCommitSuccessOutcome({
          publicationAuthority: effectiveGovernance.publicationAuthority,
        }),
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
    effectiveGovernance.publicationAuthority,
    originContext,
  ]);

  return (
    <SceActivityComposerShell
      activityKind={definition.activityKind}
      title={definition.title}
      description={definition.description}
      createActionLabel={commitActionLabel}
      persistenceStatusLabel={persistenceStatusLabel}
      presentation={presentation}
      onClose={isModalSurface ? guardedClose : undefined}
      onCancel={guardedClose}
      onSubmit={() => void handleSubmit()}
      onSaveDraft={supportsDraftPersistence ? () => void handleSaveDraft() : undefined}
      saveDraftLabel={saveDraftLabel}
      showSaveDraft={supportsDraftPersistence}
      isSubmitting={isSubmitting}
      isSavingDraft={isSavingDraft}
      submitError={submitError}
      draftSaveError={draftSaveError}
      draftSaveAnnouncement={draftSaveAnnouncement}
      validationAnnouncement={validationAnnouncement}
      secondaryPanel={secondaryPanel}
      dialogRef={panelRef}
      titleRef={titleRef}
      isModalSurface={isModalSurface && open}
      testId={testId}
      showPrimarySubmit={!guidedEnabled || Boolean(isFinalReviewStep)}
      showGuidedPrevious={guidedEnabled && guidedPreviousStep != null}
      showGuidedNext={guidedEnabled && guidedNextStep != null}
      onGuidedPrevious={guidedEnabled ? handleGuidedPrevious : undefined}
      onGuidedNext={guidedEnabled ? handleGuidedNext : undefined}
      tabsRegion={
        guidedEnabled ? (
          <SceActivityComposerWorkflowNav
            config={tabConfig}
            orderedTabKeys={orderedTabKeys}
            tabErrors={tabErrors}
            resolveStepVisualState={
              guidedEnabled ? guidedStepInteraction.resolveStepVisualState : undefined
            }
            finalReviewTab={guidedWorkflow.finalReviewTab}
            ariaLabel={definition.title}
            testId="sce-activity-composer-workflow"
            idPrefix={idPrefix}
            localNavigation={tabStateMode === "local"}
          />
        ) : (
          <SceContextTabs
            config={tabConfig}
            ariaLabel={definition.title}
            testId="sce-activity-composer-tabs"
            idPrefix={idPrefix}
            localNavigation={tabStateMode === "local"}
          />
        )
      }
    >
      <ComposerDirtySync isDirty={isDirty} />
      <ComposerTabPanels
        definition={definition}
        draft={draft}
        setDraft={setDraft}
        isSubmitting={isSubmitting}
        isSavingDraft={isSavingDraft}
        submitError={submitError}
        draftSaveError={draftSaveError}
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
    isDirty: isDirtyProp = false,
    onDirtyChange,
    resumeDraft,
    secondaryPanel,
    testId,
    effectiveGovernance: effectiveGovernanceProp,
  } = props;

  const effectiveGovernance = resolveComposerEffectiveGovernanceOrDefault({
    activityType: definition.activityKind,
    effectiveGovernance: effectiveGovernanceProp,
  });

  const supportsDraftPersistence = Boolean(definition.draftPersistence?.supportsDraftPersistence);

  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const presentation = useComposerResponsivePresentation(containerMode);
  const isModalSurface = presentation === "overlay" || presentation === "fullscreen";

  const [internalDraft, setInternalDraft] = useState(
    () => resumeDraft?.baselineDraft ?? definition.initialDraft,
  );
  const draft = controlledDraft ?? internalDraft;

  const [baselineDraft, setBaselineDraft] = useState<TDraft>(
    () => resumeDraft?.baselineDraft ?? definition.initialDraft,
  );
  const [hasPersistedDraft, setHasPersistedDraft] = useState(Boolean(resumeDraft));
  const [persistedDraftId, setPersistedDraftId] = useState<string | undefined>(
    resumeDraft?.draftId,
  );

  const derivedDirty = supportsDraftPersistence
    ? !sceActivityDraftsEqual(draft, baselineDraft)
    : isDirtyProp;

  const guardedClose = useComposerCloseGuard(onClose);

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
      if (supportsDraftPersistence) {
        onDirtyChange?.(!sceActivityDraftsEqual(next, baselineDraft));
      } else {
        onDirtyChange?.(true);
      }
    },
    [baselineDraft, draft, onDraftChange, onDirtyChange, supportsDraftPersistence],
  );

  const handleDraftPersisted = useCallback(
    ({ draft: savedDraft, draftId }: { draft: TDraft; draftId: string }) => {
      setBaselineDraft(savedDraft);
      setHasPersistedDraft(true);
      setPersistedDraftId(draftId);
      onDirtyChange?.(false);
    },
    [onDirtyChange],
  );

  useEffect(() => {
    if (!resumeDraft) {
      return;
    }
    setInternalDraft(resumeDraft.baselineDraft);
    setBaselineDraft(resumeDraft.baselineDraft);
    setHasPersistedDraft(true);
    setPersistedDraftId(resumeDraft.draftId);
    onDirtyChange?.(false);
  }, [onDirtyChange, resumeDraft]);

  useSceModalDialog({
    open: isModalSurface && open,
    onClose: guardedClose,
    panelRef,
  });

  useEffect(() => {
    if (containerMode !== "page" || !derivedDirty) {
      return;
    }
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [containerMode, derivedDirty]);

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
        isDirty={derivedDirty}
        onDirtyChange={onDirtyChange}
        secondaryPanel={secondaryPanel}
        testId={testId}
        presentation={presentation}
        isModalSurface={isModalSurface}
        panelRef={panelRef}
        titleRef={titleRef}
        guardedClose={guardedClose}
        supportsDraftPersistence={supportsDraftPersistence}
        hasPersistedDraft={hasPersistedDraft}
        persistedDraftId={persistedDraftId}
        onDraftPersisted={handleDraftPersisted}
        effectiveGovernance={effectiveGovernance}
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
