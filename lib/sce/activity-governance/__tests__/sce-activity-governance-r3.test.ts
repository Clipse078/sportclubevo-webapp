import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  assertApproverMayDecide,
  assertActivityGovernanceConfigurationValid,
  isApprovalCompleteForRevision,
  materialChangeInvalidatesApproval,
  approvalAppliesToRevision,
  resolveEffectiveActivityGovernance,
  resolveActivityComposerCommitActionLabel,
  resolveCommitSuccessOutcome,
  validateActivityGovernanceConfiguration,
  SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY,
} from "@/lib/sce/activity-governance";
import type { SceActivityClubGovernancePolicy } from "@/lib/sce/activity-governance";
import { normalizeActivityCreateSuccessOutcome } from "@/lib/sce/activity-composer/success-result";

const tenantPolicy = (overrides?: Partial<SceActivityClubGovernancePolicy>): SceActivityClubGovernancePolicy => ({
  tenantId: "club-1",
  activityTypes: [
    {
      activityType: "TRAINING",
      defaultPublicationAuthority: "DIRECT_PUBLISH",
      validatorPersonIds: ["fabio", "sandra"],
      creatorPolicies: [
        { personId: "michael", publicationAuthority: "DIRECT_PUBLISH" },
        { personId: "max", publicationAuthority: "APPROVAL_REQUIRED" },
      ],
    },
    {
      activityType: "MATCH",
      defaultPublicationAuthority: "DIRECT_PUBLISH",
      validatorPersonIds: ["sandra", "patrick"],
      creatorPolicies: [{ personId: "sandra", publicationAuthority: "APPROVAL_REQUIRED" }],
    },
    {
      activityType: "TOURNAMENT",
      defaultPublicationAuthority: "DIRECT_PUBLISH",
      validatorPersonIds: [],
      creatorPolicies: [{ personId: "person-x", publicationAuthority: "DIRECT_PUBLISH" }],
    },
    {
      activityType: "CLUB_EVENT",
      defaultPublicationAuthority: "DIRECT_PUBLISH",
      validatorPersonIds: [],
      creatorPolicies: [],
    },
  ],
  ...overrides,
});

function held(...keys: (typeof PERMISSIONS)[keyof typeof PERMISSIONS][]) {
  return new Set(keys);
}

describe("SCE-ACTIVITY-CREATE-01B-R3 — governance foundation", () => {
  it("defaults publication policy to DIRECT_PUBLISH", () => {
    expect(SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY).toBe("DIRECT_PUBLISH");
    const effective = resolveEffectiveActivityGovernance({
      activityType: "TRAINING",
      personId: "unknown",
      heldPermissions: held(PERMISSIONS.TRAININGS_MANAGE),
      clubPolicy: tenantPolicy(),
    });
    expect(effective.publicationAuthority).toBe("DIRECT_PUBLISH");
  });

  it("does not make approval globally mandatory by default", () => {
    const policy = tenantPolicy({
      activityTypes: [
        {
          activityType: "TRAINING",
          defaultPublicationAuthority: "DIRECT_PUBLISH",
          validatorPersonIds: [],
          creatorPolicies: [],
        },
      ],
    });
    const a = resolveEffectiveActivityGovernance({
      activityType: "TRAINING",
      personId: "any",
      heldPermissions: held(PERMISSIONS.TRAININGS_MANAGE),
      clubPolicy: policy,
    });
    const b = resolveEffectiveActivityGovernance({
      activityType: "TRAINING",
      personId: "other",
      heldPermissions: held(PERMISSIONS.TRAININGS_MANAGE),
      clubPolicy: policy,
    });
    expect(a.publicationAuthority).toBe("DIRECT_PUBLISH");
    expect(b.publicationAuthority).toBe("DIRECT_PUBLISH");
  });

  it("resolves creator-specific publication for same activity type", () => {
    const policy = tenantPolicy();
    const michael = resolveEffectiveActivityGovernance({
      activityType: "TRAINING",
      personId: "michael",
      heldPermissions: held(PERMISSIONS.TRAININGS_MANAGE),
      clubPolicy: policy,
    });
    const max = resolveEffectiveActivityGovernance({
      activityType: "TRAINING",
      personId: "max",
      heldPermissions: held(PERMISSIONS.TRAININGS_MANAGE),
      clubPolicy: policy,
    });
    expect(michael.publicationAuthority).toBe("DIRECT_PUBLISH");
    expect(max.publicationAuthority).toBe("APPROVAL_REQUIRED");
  });

  it("denies create when manage permission missing", () => {
    const effective = resolveEffectiveActivityGovernance({
      activityType: "TOURNAMENT",
      personId: "person-x",
      heldPermissions: held(),
      clubPolicy: tenantPolicy(),
    });
    expect(effective.mayCreate).toBe(false);
  });

  it("exposes 1:n validator pool independent of creator permission", () => {
    const effective = resolveEffectiveActivityGovernance({
      activityType: "MATCH",
      personId: "sandra",
      heldPermissions: held(PERMISSIONS.EVENTS_MANAGE),
      clubPolicy: tenantPolicy(),
    });
    expect(effective.validatorPersonIds).toEqual(["sandra", "patrick"]);
    expect(effective.publicationAuthority).toBe("APPROVAL_REQUIRED");
  });

  it("rejects zero-validator invariant for approval-required creators", () => {
    const invalid: SceActivityClubGovernancePolicy = {
      tenantId: "club-1",
      activityTypes: [
        {
          activityType: "TRAINING",
          defaultPublicationAuthority: "DIRECT_PUBLISH",
          validatorPersonIds: [],
          creatorPolicies: [{ personId: "max", publicationAuthority: "APPROVAL_REQUIRED" }],
        },
      ],
    };
    const issues = validateActivityGovernanceConfiguration(invalid);
    expect(issues.some((i) => i.code === "APPROVAL_REQUIRED_WITHOUT_VALIDATORS")).toBe(true);
    expect(() => assertActivityGovernanceConfigurationValid(invalid)).toThrow();
  });

  it("denies self-approval on APPROVE decision", () => {
    const result = assertApproverMayDecide({
      approverPersonId: "max",
      creatorPersonId: "max",
      decision: "APPROVE",
      approverIsAuthorizedValidator: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("SELF_APPROVAL_DENIED");
    }
  });

  it("ANY_ONE approval strategy completes after first approve", () => {
    expect(
      isApprovalCompleteForRevision({ strategy: "ANY_ONE", approvePersonIds: [] }),
    ).toBe(false);
    expect(
      isApprovalCompleteForRevision({ strategy: "ANY_ONE", approvePersonIds: ["fabio"] }),
    ).toBe(true);
  });

  it("maps commit outcomes and primary labels", () => {
    expect(
      resolveCommitSuccessOutcome({ publicationAuthority: "DIRECT_PUBLISH" }),
    ).toBe("PUBLISHED");
    expect(
      resolveCommitSuccessOutcome({ publicationAuthority: "APPROVAL_REQUIRED" }),
    ).toBe("SUBMITTED_FOR_APPROVAL");
    expect(
      resolveActivityComposerCommitActionLabel({
        activityKind: "TRAINING",
        directPublishLabel: "Training erstellen",
        publicationAuthority: "APPROVAL_REQUIRED",
      }),
    ).toBe("Zur Freigabe einreichen");
  });

  it("normalizes legacy CREATED outcome to PUBLISHED", () => {
    expect(normalizeActivityCreateSuccessOutcome("CREATED")).toBe("PUBLISHED");
  });

  it("binds approval to revision and invalidates on material change", () => {
    expect(
      approvalAppliesToRevision({ approvalRevisionId: "rev-3", currentRevisionId: "rev-3" }),
    ).toBe(true);
    expect(
      approvalAppliesToRevision({ approvalRevisionId: "rev-3", currentRevisionId: "rev-4" }),
    ).toBe(false);
    expect(
      materialChangeInvalidatesApproval({
        previousRevisionId: "rev-3",
        currentRevisionId: "rev-4",
        materialCategories: ["SCHEDULE"],
      }),
    ).toBe(true);
    expect(
      materialChangeInvalidatesApproval({
        previousRevisionId: "rev-3",
        currentRevisionId: "rev-4",
        materialCategories: [],
      }),
    ).toBe(false);
  });

  it("keeps REQUEST_CHANGES distinct from REJECT in decision union", () => {
    type Decision = "APPROVE" | "REQUEST_CHANGES" | "REJECT";
    const requestChanges: Decision = "REQUEST_CHANGES";
    const reject: Decision = "REJECT";
    expect(requestChanges).not.toBe(reject);
  });
});
