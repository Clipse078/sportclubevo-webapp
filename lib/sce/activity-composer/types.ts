import type { ReactNode } from "react";
import type { ContextTabId, ContextTabNavigationConfig } from "@/lib/context-tabs/types";
import type { SceActivityCreateOriginContext } from "./origin-context";
import type { SceActivityCreateSuccessResult } from "./success-result";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import type {
  SceActivityCreateDraftPersistenceCapability,
  SceActivityCreateResumeDraft,
} from "./draft-persistence-capability";
import type { SceActivityGuidedWorkflowConfig } from "./guided-workflow";

/** Canonical activity kinds for unified creation (01B foundation). */
export type SceActivityCreateKind = "TRAINING" | "MATCH" | "TOURNAMENT" | "CLUB_EVENT";

/** Physical container — domain workflows must not branch on this. */
export type SceActivityComposerContainerMode = "overlay" | "page";

/** Resolved presentation mode after responsive adaptation (overlay may become fullscreen). */
export type SceActivityComposerResolvedPresentation =
  | "overlay"
  | "fullscreen"
  | "page";

export type SceActivityCreateValidationResult<TTabId extends ContextTabId> = {
  valid: boolean;
  tabErrors: Partial<Record<TTabId, boolean>>;
  /** Domain-owned field messages — composer does not render a generic schema UI. */
  fieldErrors?: Record<string, string>;
  firstInvalidTab?: TTabId;
};

export type SceActivityCreateTabRenderContext<TDraft> = {
  draft: TDraft;
  setDraft: (updater: TDraft | ((prev: TDraft) => TDraft)) => void;
  isSubmitting: boolean;
  isSavingDraft: boolean;
  submitError: string | null;
  draftSaveError: string | null;
  fieldErrors: Record<string, string> | undefined;
};

export type SceActivityCreateTabDefinition<
  TTabId extends ContextTabId,
  TDraft,
> = {
  key: TTabId;
  label: string;
  placement?: "primary" | "overflow";
  visible?: boolean;
  render: (ctx: SceActivityCreateTabRenderContext<TDraft>) => ReactNode;
};

export type SceActivityCreateSubmitOutcome<TResult> =
  | { ok: true; result: TResult }
  | { ok: false; error: string; /** optional tab hint for domain errors */ tabKey?: ContextTabId };

/**
 * Typed orchestration contract — describes domain workflow without generic field rendering.
 */
export type SceActivityCreateDefinition<
  TDraft,
  TResult,
  TTabId extends ContextTabId = ContextTabId,
> = {
  activityKind: SceActivityCreateKind;
  /** Accessible composer title (visible heading). */
  title: string;
  /** Optional accessible description (`aria-describedby`). */
  description?: string;
  /** Domain primary action label for direct publish — never generic «Erstellen» alone. */
  createActionLabel: string;
  defaultTab: TTabId;
  tabs: SceActivityCreateTabDefinition<TTabId, TDraft>[];
  buildTabNavigationConfig: (input: {
    tabErrors?: Partial<Record<TTabId, boolean>>;
  }) => ContextTabNavigationConfig<TTabId>;
  initialDraft: TDraft;
  /** Commit/create validation — full domain requirements. */
  validateDraft: (draft: TDraft) => SceActivityCreateValidationResult<TTabId>;
  submitDraft: (draft: TDraft) => Promise<SceActivityCreateSubmitOutcome<TResult>>;
  /** Optional explicit draft persistence (01B-R2). Omit when drafts are unsupported. */
  draftPersistence?: SceActivityCreateDraftPersistenceCapability<
    TDraft,
    { draftId: string },
    TTabId
  >;
  /** Freely navigable, clearly guided — shared workflow navigation (01E R1). */
  guidedWorkflow?: SceActivityGuidedWorkflowConfig<TDraft, TTabId>;
};

export type SceActivityComposerProps<
  TDraft,
  TResult,
  TTabId extends ContextTabId = ContextTabId,
> = {
  definition: SceActivityCreateDefinition<TDraft, TResult, TTabId>;
  containerMode: SceActivityComposerContainerMode;
  /** Overlay only — ignored in page mode. */
  open?: boolean;
  onClose: () => void;
  onSuccess?: (result: SceActivityCreateSuccessResult<TResult>) => void;
  originContext?: SceActivityCreateOriginContext;
  /** Controlled draft integration (optional). */
  draft?: TDraft;
  onDraftChange?: (draft: TDraft) => void;
  /** Marks draft dirty for close/tab guards (optional override when no draft persistence). */
  isDirty?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  /** Resume an existing persisted draft (01C+ hydrates; preview uses in-memory). */
  resumeDraft?: SceActivityCreateResumeDraft<TDraft>;
  /**
   * Resolved governance for this creator + activity type (host/server supplies).
   * When omitted, Composer assumes DIRECT_PUBLISH for foundation backwards compatibility.
   */
  effectiveGovernance?: SceActivityEffectiveGovernance | null;
  /** Composer-owned embedded region for complex selectors (01C+); not a nested dialog. */
  secondaryPanel?: ReactNode;
  testId?: string;
};
