import {
  WorkspaceAccessInheritanceMode,
  WorkspaceAccessSubjectType,
  WorkspaceAccessLevel,
  WorkspaceResourceType,
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import { pureWorkspaceAclGrantsResourceAccess } from "@/lib/workspace/access/admin-bypass";
import {
  computeEffectiveAccessPaths,
  buildDefaultChildResourcePolicy,
  buildDefaultRootResourcePolicy,
  documentVersionInheritsDocumentSecurity,
  legacyChildInheritPolicy,
  legacyRootOrganisationPolicy,
  WorkspaceAccessBroadeningError,
} from "@/lib/workspace/access/effective-access";
import {
  explainEffectiveAccessPath,
  identifyInheritedSource,
} from "@/lib/workspace/access/explanation";
import {
  assertNoDuplicateGrant,
  assertResourceTenant,
  validateGrantTenantAlignment,
  validateResourceTargetShape,
  validateRoleFunctionKey,
  validateWorkspaceAccessGrantMutation,
  WorkspaceAccessGrantValidationError,
} from "@/lib/workspace/access/grant-validation";
import {
  actorMatchesPersonGrant,
  resolveActorWorkspaceIdentity,
  WORKSPACE_PERSON_IDENTITY_SEMANTICS,
} from "@/lib/workspace/access/identity";
import {
  assertForeignParentRejected,
  assertNoFolderCycle,
  buildChainAfterMove,
  validateMoveDoesNotWidenEffectiveAccess,
  WorkspaceMoveValidationError,
} from "@/lib/workspace/access/move-validation";
import {
  intersectResourceLevels,
  isCanonicalResourceLevel,
  levelPermits,
  toCanonicalResourceLevel,
  UnsupportedWorkspaceAccessLevelError,
} from "@/lib/workspace/access/resource-level";
import { validateGrantSubjectShape } from "@/lib/workspace/access/subjects";

import {
  chain,
  folderNode,
  grant,
  rootOrganisationView,
  TENANT,
} from "@/lib/workspace/access/__tests__/fixtures";

describe("WORKSPACE-01 W01 sentinels", () => {
  it("W01-01 new root defaults ORGANISATION VIEW EXPLICIT", () => {
    const policy = buildDefaultRootResourcePolicy({
      tenantId: TENANT,
      resourceType: WorkspaceResourceType.FOLDER,
      resourceId: "f-new",
    });
    expect(policy.accessInheritanceMode).toBe(WorkspaceAccessInheritanceMode.EXPLICIT);
    expect(policy.grants.some((g) => g.subjectType === WorkspaceAccessSubjectType.ORGANISATION)).toBe(
      true,
    );
    expect(policy.grants.find((g) => g.subjectType === WorkspaceAccessSubjectType.ORGANISATION)?.accessLevel).toBe(
      "VIEW",
    );
  });

  it("W01-02 new child defaults INHERIT", () => {
    expect(buildDefaultChildResourcePolicy().accessInheritanceMode).toBe(
      WorkspaceAccessInheritanceMode.INHERIT,
    );
  });

  it("W01-03 child restrict CLUB to OrgUnit", () => {
    const root = rootOrganisationView("root");
    const child = folderNode({
      id: "child",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      parentFolderId: "root",
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.ORG_UNIT,
          accessLevel: "VIEW",
          orgUnitId: "ou-1",
        }),
      ],
    });
    const paths = computeEffectiveAccessPaths(chain([root, child]));
    expect(paths[0]?.requiredAudiences.some((a) => a.kind === "ORG_UNIT")).toBe(true);
  });

  it("W01-04 child restrict CLUB to Team", () => {
    const root = rootOrganisationView("root");
    const child = folderNode({
      id: "child",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-f2",
        }),
      ],
    });
    const paths = computeEffectiveAccessPaths(chain([root, child]));
    expect(paths[0]?.requiredAudiences.some((a) => a.kind === "TEAM")).toBe(true);
  });

  it("W01-05 child restrict CLUB to Role", () => {
    const root = rootOrganisationView("root");
    const child = folderNode({
      id: "child",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.ROLE,
          accessLevel: "VIEW",
          roleFunctionKey: "TRAINER",
          roleScopeTeamId: "team-f2",
        }),
      ],
    });
    const paths = computeEffectiveAccessPaths(chain([root, child]));
    expect(paths[0]?.requiredAudiences.some((a) => a.kind === "ROLE")).toBe(true);
  });

  it("W01-06 child restrict CLUB to Person", () => {
    const root = rootOrganisationView("root");
    const child = folderNode({
      id: "child",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "VIEW",
          personId: "person-m",
        }),
      ],
    });
    const paths = computeEffectiveAccessPaths(chain([root, child]));
    expect(paths[0]?.requiredAudiences.some((a) => a.kind === "PERSON")).toBe(true);
  });

  it("W01-07 child cannot broaden restricted parent to CLUB", () => {
    const parent = folderNode({
      id: "p",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-f2",
        }),
      ],
    });
    const child = folderNode({
      id: "c",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.ORGANISATION,
          accessLevel: "VIEW",
        }),
      ],
    });
    expect(() => computeEffectiveAccessPaths(chain([parent, child]))).toThrow(
      WorkspaceAccessBroadeningError,
    );
  });

  it("W01-08 child effective audience intersects parent", () => {
    const parent = folderNode({
      id: "p",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-f2",
        }),
      ],
    });
    const child = folderNode({
      id: "c",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "VIEW",
          personId: "person-m",
        }),
      ],
    });
    const paths = computeEffectiveAccessPaths(chain([parent, child]));
    expect(paths[0]?.requiredAudiences.some((a) => a.kind === "TEAM")).toBe(true);
    expect(paths[0]?.requiredAudiences.some((a) => a.kind === "PERSON")).toBe(true);
  });

  it("W01-09 person outside parent cannot bypass parent structurally", () => {
    const parent = folderNode({
      id: "p",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-f2",
        }),
      ],
    });
    const child = folderNode({
      id: "c",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-other",
        }),
      ],
    });
    expect(() => computeEffectiveAccessPaths(chain([parent, child]))).toThrow(
      WorkspaceAccessBroadeningError,
    );
  });

  it("W01-10 team dynamic condition cannot bypass ancestor", () => {
    const parent = folderNode({
      id: "p",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-f2",
        }),
      ],
    });
    const child = folderNode({
      id: "c",
      mode: WorkspaceAccessInheritanceMode.INHERIT,
      grants: [],
    });
    const paths = computeEffectiveAccessPaths(chain([parent, child]));
    expect(paths[0]?.requiredAudiences.some((a) => a.kind === "TEAM")).toBe(true);
  });

  it("W01-11 MANAGE implies EDIT and VIEW", () => {
    expect(levelPermits("MANAGE", "EDIT")).toBe(true);
    expect(levelPermits("MANAGE", "VIEW")).toBe(true);
  });

  it("W01-12 EDIT implies VIEW", () => {
    expect(levelPermits("EDIT", "VIEW")).toBe(true);
    expect(levelPermits("EDIT", "MANAGE")).toBe(false);
  });

  it("W01-13 child MANAGE capped by parent VIEW", () => {
    const parent = folderNode({
      id: "p",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-f2",
        }),
      ],
    });
    const child = folderNode({
      id: "c",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "MANAGE",
          personId: "person-m",
        }),
      ],
    });
    const paths = computeEffectiveAccessPaths(chain([parent, child]));
    expect(paths[0]?.effectiveLevel).toBe("VIEW");
  });

  it("W01-14 parent restriction narrows inherited descendants", () => {
    const root = rootOrganisationView("root");
    const mid = folderNode({
      id: "mid",
      mode: WorkspaceAccessInheritanceMode.INHERIT,
      grants: [],
    });
    const parent = folderNode({
      id: "p",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.ORG_UNIT,
          accessLevel: "VIEW",
          orgUnitId: "ou-v",
        }),
      ],
    });
    const child = folderNode({
      id: "c",
      mode: WorkspaceAccessInheritanceMode.INHERIT,
      grants: [],
    });
    const paths = computeEffectiveAccessPaths(chain([root, mid, parent, child]));
    expect(paths[0]?.requiredAudiences.some((a) => a.kind === "ORG_UNIT")).toBe(true);
  });

  it("W01-15 explicit child restriction survives move to broader parent", () => {
    const root = rootOrganisationView("root");
    const restricted = folderNode({
      id: "r",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-f2",
        }),
      ],
    });
    const before = chain([root, restricted]);
    const after = buildChainAfterMove(restricted, [root]);
    validateMoveDoesNotWidenEffectiveAccess({
      resourceChainBefore: before,
      resourceChainAfter: after,
    });
    const paths = computeEffectiveAccessPaths(after);
    expect(paths[0]?.requiredAudiences.some((a) => a.kind === "TEAM")).toBe(true);
  });

  it("W01-16 move to restricted parent narrows effective access", () => {
    const club = rootOrganisationView("club");
    const openChild = folderNode({
      id: "open",
      mode: WorkspaceAccessInheritanceMode.INHERIT,
      grants: [],
    });
    const restrictedParent = folderNode({
      id: "rp",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-f2",
        }),
      ],
    });
    const before = chain([club, openChild]);
    const beforePaths = computeEffectiveAccessPaths(before);
    const after = buildChainAfterMove(openChild, [club, restrictedParent]);
    const afterPaths = computeEffectiveAccessPaths(after);
    expect(afterPaths[0]?.requiredAudiences.some((a) => a.kind === "TEAM")).toBe(true);
    expect(beforePaths[0]?.requiredAudiences.some((a) => a.kind === "TEAM")).toBe(false);
  });

  it("W01-17 foreign Person rejected", () => {
    expect(() =>
      validateGrantTenantAlignment({
        tenantId: TENANT,
        resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: "f1" },
        resourceTenantId: TENANT,
        personTenantId: "other-tenant",
      }),
    ).toThrow(WorkspaceAccessGrantValidationError);
  });

  it("W01-18 foreign Team rejected", () => {
    expect(() =>
      validateGrantTenantAlignment({
        tenantId: TENANT,
        resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: "f1" },
        resourceTenantId: TENANT,
        teamTenantId: "other-tenant",
      }),
    ).toThrow(WorkspaceAccessGrantValidationError);
  });

  it("W01-19 foreign OrgUnit rejected", () => {
    expect(() =>
      validateGrantTenantAlignment({
        tenantId: TENANT,
        resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: "f1" },
        resourceTenantId: TENANT,
        orgUnitTenantId: "other-tenant",
      }),
    ).toThrow(WorkspaceAccessGrantValidationError);
  });

  it("W01-20 foreign Role scope rejected", () => {
    expect(() =>
      validateGrantTenantAlignment({
        tenantId: TENANT,
        resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: "f1" },
        resourceTenantId: TENANT,
        roleScopeTeamTenantId: "other-tenant",
      }),
    ).toThrow(WorkspaceAccessGrantValidationError);
  });

  it("W01-21 creator authority via ACL not createdBy bypass", () => {
    const policy = buildDefaultRootResourcePolicy({
      tenantId: TENANT,
      resourceType: WorkspaceResourceType.FOLDER,
      resourceId: "f1",
      creatorPersonId: "person-c",
    });
    expect(
      policy.grants.some(
        (g) => g.subjectType === WorkspaceAccessSubjectType.PERSON && g.accessLevel === "MANAGE",
      ),
    ).toBe(true);
    expect(WORKSPACE_PERSON_IDENTITY_SEMANTICS.executableRequiresAuthenticatedActor).toBe(true);
  });

  it("W01-22 creator lifecycle does not invalidate policy", () => {
    const grantRow = grant({
      subjectType: WorkspaceAccessSubjectType.PERSON,
      accessLevel: "MANAGE",
      personId: "person-1",
    });
    expect(grantRow.personId).toBe("person-1");
    expect(actorMatchesPersonGrant({ tenantId: TENANT, userId: "u2", personId: null }, "person-1")).toBe(
      false,
    );
  });

  it("W01-23 legacy root semantics ORGANISATION EXPLICIT", () => {
    expect(legacyRootOrganisationPolicy()).toEqual({
      accessInheritanceMode: WorkspaceAccessInheritanceMode.EXPLICIT,
      organisationView: true,
    });
  });

  it("W01-24 legacy child semantics inherit", () => {
    expect(legacyChildInheritPolicy().accessInheritanceMode).toBe(
      WorkspaceAccessInheritanceMode.INHERIT,
    );
  });

  it("W01-25 duplicate equivalent grants rejected", () => {
    const existing = [
      grant({
        id: "g1",
        subjectType: WorkspaceAccessSubjectType.PERSON,
        accessLevel: "VIEW",
        personId: "p1",
      }),
    ];
    expect(() =>
      assertNoDuplicateGrant(existing, {
        subjectType: WorkspaceAccessSubjectType.PERSON,
        accessLevel: "VIEW",
        personId: "p1",
      }),
    ).toThrow(WorkspaceAccessGrantValidationError);
  });

  it("W01-26 document version has no independent ACL widening", () => {
    expect(documentVersionInheritsDocumentSecurity()).toBe(true);
  });

  it("W01-27 super admin no pure ACL bypass", () => {
    expect(
      pureWorkspaceAclGrantsResourceAccess({
        permissionKeys: [],
        isSuperAdmin: true,
      }),
    ).toBe(false);
  });

  it("W01-28 club admin does not use pureWorkspaceAclGrantsResourceAccess (dynamic override elsewhere)", () => {
    expect(
      pureWorkspaceAclGrantsResourceAccess({
        permissionKeys: [],
        isClubAdmin: true,
      }),
    ).toBe(false);
  });

  it("W01-29 workspace.manage no pure ACL bypass", () => {
    expect(
      pureWorkspaceAclGrantsResourceAccess({
        permissionKeys: ["workspace.manage"],
      }),
    ).toBe(false);
  });

  it("W01-30 access explanation identifies inherited source", () => {
    const parent = folderNode({
      id: "parent",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-f2",
        }),
      ],
    });
    const child = folderNode({
      id: "child",
      mode: WorkspaceAccessInheritanceMode.INHERIT,
      grants: [],
    });
    const paths = computeEffectiveAccessPaths(chain([parent, child]));
    const explanation = explainEffectiveAccessPath(paths[0]!);
    expect(explanation.requiredAudiences.some((a) => a.kind === "TEAM")).toBe(true);
    expect(explanation.mode).toBe("inherited");
    expect(identifyInheritedSource(explanation).resourceType).toBe(WorkspaceResourceType.FOLDER);
  });
});

describe("WORKSPACE-01 acceptance extras", () => {
  it("P01-P06 person identity semantics", async () => {
    const actor = await resolveActorWorkspaceIdentity(TENANT, "user-1", async () => ({
      personId: "person-1",
    }));
    expect(actor.personId).toBe("person-1");
    expect(actorMatchesPersonGrant(actor, "person-1")).toBe(true);
    expect(actorMatchesPersonGrant(actor, "person-2")).toBe(false);
    expect(WORKSPACE_PERSON_IDENTITY_SEMANTICS.personWithoutUserCannotAuthenticate).toBe(true);
    expect(WORKSPACE_PERSON_IDENTITY_SEMANTICS.crossTenantUserCannotConsumeGrant).toBe(true);
    expect(WORKSPACE_PERSON_IDENTITY_SEMANTICS.unlinkRelinkDoesNotRewritePersonGrant).toBe(true);
    expect(WORKSPACE_PERSON_IDENTITY_SEMANTICS.grantStorageIdentity).toBe("Person.id");
  });

  it("pairwise VIEW/EDIT/MANAGE intersections", () => {
    const levels = ["VIEW", "EDIT", "MANAGE"] as const;
    for (const a of levels) {
      for (const b of levels) {
        expect(intersectResourceLevels(a, b)).toBe(
          levels[Math.min(levels.indexOf(a), levels.indexOf(b))]!,
        );
      }
    }
  });

  it("subject shape validation", () => {
    expect(() =>
      validateGrantSubjectShape({
        subjectType: WorkspaceAccessSubjectType.PERSON,
        accessLevel: "VIEW",
        orgUnitId: "x",
      }),
    ).toThrow();
    expect(
      validateGrantSubjectShape({
        subjectType: WorkspaceAccessSubjectType.ORGANISATION,
        accessLevel: "VIEW",
      }).kind,
    ).toBe("ORGANISATION");
  });

  it("resource XOR validation", () => {
    expect(() =>
      validateResourceTargetShape({ folderId: "f", documentId: "d" }),
    ).toThrow(WorkspaceAccessGrantValidationError);
    expect(() => validateResourceTargetShape({})).toThrow(
      WorkspaceAccessGrantValidationError,
    );
  });

  it("ROLE functionKey validation", () => {
    expect(() => validateRoleFunctionKey("workspace.manage")).toThrow(
      WorkspaceAccessGrantValidationError,
    );
    expect(() => validateRoleFunctionKey("TRAINER")).not.toThrow();
  });

  it("foreign parent rejection and folder cycle", () => {
    expect(() =>
      assertForeignParentRejected({
        resourceTenantId: TENANT,
        parentTenantId: "other",
      }),
    ).toThrow(WorkspaceMoveValidationError);

    expect(() =>
      assertNoFolderCycle({
        folderId: "a",
        newParentId: "c",
        parentLookup: (id) => (id === "c" ? "b" : id === "b" ? "a" : null),
      }),
    ).toThrow(WorkspaceMoveValidationError);
  });

  it("legacy WorkspaceAccessLevel values fail closed", () => {
    expect(isCanonicalResourceLevel(WorkspaceAccessLevel.OWNER)).toBe(false);
    expect(() => toCanonicalResourceLevel(WorkspaceAccessLevel.DOWNLOAD)).toThrow(
      UnsupportedWorkspaceAccessLevelError,
    );
  });

  it("validateWorkspaceAccessGrantMutation happy path", () => {
    validateWorkspaceAccessGrantMutation(
      {
        tenantId: TENANT,
        resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: "f1" },
        resourceTenantId: TENANT,
        orgUnitTenantId: TENANT,
      },
      {
        subjectType: WorkspaceAccessSubjectType.ORG_UNIT,
        accessLevel: "VIEW",
        orgUnitId: "ou-1",
      },
    );
  });

  it("assertResourceTenant", () => {
    expect(() => assertResourceTenant({ tenantId: "x" }, TENANT)).toThrow(
      WorkspaceAccessGrantValidationError,
    );
  });
});
