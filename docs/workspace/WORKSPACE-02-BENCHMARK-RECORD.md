# WORKSPACE-02 — External benchmark decision record

**BENCHMARK:** Dropbox Business + Microsoft SharePoint/OneDrive permission patterns (2026 review).

## Adopted (conceptual alignment, not product cloning)

- Inheritance-first permission design (parent envelope constrains descendants).
- Group / dynamic audience access (organisational subjects, not per-user materialization by default).
- Security-trimmed discovery (unauthorized resources excluded at query boundaries).
- Protected direct resource access (no metadata oracle via ID guessing).
- Permission-aware moves (destination envelope + no silent widening).
- Scalable group/inheritance preference over `people × documents` ACL rows.

## Intentional SCE differences

- **Child cannot escape ancestor security boundary:** effective child access = parent effective access **INTERSECT** child explicit restriction.
- **Native organisational audiences:** `ORGANISATION`, `ORG_UNIT`, `TEAM`, `ROLE` resolved from current membership state — not snapshotted into Person grant rows.
- **Tenant admin non-bypass:** broad `workspace.manage` does **not** grant universal access to deliberately restricted resources (`pureWorkspaceAclGrantsResourceAccess` returns null effective level).
- **External sharing:** deferred (no anonymous/public workspace links in W02).

## Deferred

| Topic | Package |
|-------|---------|
| Access-management UX, effective/inherited explanation | WORKSPACE-03 |
| Storage/provider hardening | WORKSPACE-04 |
| Governance / emergency audited access (break-glass) | WORKSPACE-09 |

## W02-R1 invariants (operational)

1. **Security-trimmed zero disclosure** — `buildWorkspaceReadWhere` / authorized ID sets; no load-all-then-filter in callers.
2. **ACL scalability** — resolve actor membership once per request context; batch graph evaluation; no Team/OrgUnit/Role → Person grant explosion.
3. **Admin difference** — resource ACL remains authoritative for content access; tenant capability alone is insufficient for restricted resources.
