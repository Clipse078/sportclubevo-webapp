# WORKSPACE-01 — Workspace access identity

**Status:** Canonical domain contract (WORKSPACE-01 foundation)  
**Scope:** Person vs User, audience identity, creator semantics — not WORKSPACE-02 runtime resolution.

---

## Person vs User

| Concept | Role in Workspace ACL |
|---------|------------------------|
| **Person** | Canonical subject for **specific-person** grants (`WorkspaceAccessGrant.personId`). Stable across account linking. |
| **User** | Authenticated session identity. Access is **executable** only when resolved to a same-tenant Person. |

Grants are stored on **Person.id**, not User.id.

---

## Authenticated actor mapping

```
Session User (tenant T)
  → Person where Person.tenantId = T and Person.userId = User.id
  → Person.id used for PERSON grant evaluation (WORKSPACE-02)
```

Implementation seam: `resolveActorWorkspaceIdentity` in `lib/workspace/access/identity.ts`.

---

## Person without User

- A Person grant **may exist** before a User account exists (e.g. roster-only person).
- Grant storage does **not** require login.
- **Executable access requires authentication** — a Person without a linked User does not authenticate and cannot consume the grant interactively until linked.

---

## Account linking and unlinking

- Linking User ↔ Person does **not** rewrite existing Person grants.
- Unlinking does **not** delete Person grants; the grant remains on `Person.id`.
- Replacing or relinking accounts must not silently transfer grants to a different Person.

---

## Tenant boundary

- Users from **another tenant** cannot consume grants in tenant T.
- All subject references (Person, OrgUnit, Team, role scope) must belong to the **same tenant** as the resource (domain validation in `grant-validation.ts`).

---

## Creator behaviour

New **root** resources (WORKSPACE-01 defaults):

- `accessInheritanceMode = EXPLICIT`
- **ORGANISATION** grant at **VIEW** (tenant-wide workspace audience envelope)
- When creator maps to a same-tenant Person: additional **PERSON** grant at **MANAGE**

New **child** resources default to **INHERIT**.

`createdByUserId` is **audit provenance only** — it is **not** an authorization bypass (`isCreatedByUserAuthorizationBypass` always false).

Create-flow persistence wiring may land in WORKSPACE-02 when route enforcement is safe; the canonical helper is `buildDefaultRootResourcePolicy`.

---

## OrgUnit identity

- **ORG_UNIT** audience grants reference canonical `OrgUnit.id`.
- Grants do **not** snapshot members; effective membership is resolved dynamically in **WORKSPACE-02**.

---

## Team identity

- **TEAM** audience grants reference canonical `Team.id`.
- No Workspace-specific team membership table; use canonical SCE team relationships at query time (WORKSPACE-02).

---

## Role identity (organisational vs technical RBAC)

| Type | Example | Workspace usage |
|------|---------|-----------------|
| **Organisational function** | `PersonAssignment.functionKey` (`TRAINER`, `SPIELER`, …) | **ROLE** grant `roleFunctionKey` |
| **Technical RBAC** | `workspace.view`, `Role.key` permission bundles | Tenant capability — **separate** from resource ACL |

ROLE grants use `roleFunctionKey` + optional `roleScopeOrgUnitId` / `roleScopeTeamId`. Technical permission keys must **not** be used as organisational role grants.

---

## Dynamic membership boundary

Org unit, team, and role audiences are **predicates** evaluated against current SCE membership in WORKSPACE-02. WORKSPACE-01 defines pure intersection semantics so descendants cannot outlive parent conditions (see discovery §8.4, §9).

---

## Future WORKSPACE-02 responsibilities

- Resolve actors against ORG_UNIT / TEAM / ROLE predicates
- `buildWorkspaceReadWhere` / download enforcement
- Query-time cap with tenant capabilities (`workspace.view` + effective resource level)

---

## Future Mobile compatibility

Domain types live in `lib/workspace/access/` without UI coupling. Mobile clients must use the same services, respect tenant id, grant revocation, and must not treat cached metadata as authorization.
