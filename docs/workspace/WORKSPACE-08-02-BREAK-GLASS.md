# WORKSPACE-08-02 — Governance authorization + explicit break-glass

**Status:** Implemented on branch `cursor/workspace-08-governance-scale-portability`  
**Baseline:** STAGE @ `7987a9650f760085117a261709411bbd19905e44`  
**Discovery:** `WORKSPACE-08D-DISCOVERY.md` (unchanged)

## BREAK_GLASS_PURPOSE

Explicit, exceptional, tenant-scoped governance allowing a specifically authorized actor to temporarily read a bounded Workspace scope for a stated reason — without replacing ACL, admin bypass, or platform superuser modes.

## JUSTIFIED_SCENARIOS

| Scenario | Requires content access? |
|----------|-------------------------|
| Orphaned restricted content (legal/governance read) | **REQUIRES_CONTENT_ACCESS** |
| Security incident forensic read | **REQUIRES_CONTENT_ACCESS** |
| Lawful/governance request (exact resource) | **REQUIRES_CONTENT_ACCESS** |
| Departed tenant admin (role reassignment) | **ADMINISTRATIVE_RECOVERY_ONLY** |
| Corrupted ACL (policy repair) | **ADMINISTRATIVE_RECOVERY_ONLY** — prefer ACL governance APIs |
| Tenant recovery (structural) | **ADMINISTRATIVE_RECOVERY_ONLY** unless read required |

Break-glass is implemented only for **read** paths that opt in explicitly.

## PERMISSIONS

| Key | Purpose |
|-----|---------|
| `workspace.break_glass` | Activate/end own session |
| `workspace.governance.manage` | Revoke another actor's session (same tenant) |
| `workspace.audit.view` | Unchanged — separate |

Non-implications: `workspace.manage`, document MANAGE, creator, club admin bundle, and `workspace.audit.view` do **not** imply break-glass.

## SESSION_MODEL

`WorkspaceBreakGlassSession` — canonical DB state (not User/Person/Role/cookie claims).

Fields: tenant, actor user (+ optional person), scope, reason, TTL (`expiresAt`), end/revoke timestamps, status.

## SCOPE_MODEL

- `DOCUMENT` — single `WorkspaceDocument.id`
- `FOLDER_SUBTREE` — folder + descendants; documents must live in subtree (no root-only escape)

No tenant-wide scope in W08-02.

## TTL

Default 60 minutes; allowed 15–60; hard max 60. Expired rows fail authorization without a cleanup job.

## ACTIVATION / USE / END / REVOCATION

- Activation: transactional with `WORKSPACE_BREAK_GLASS_ACTIVATED`
- Each opt-in read: mandatory `WORKSPACE_BREAK_GLASS_USED` (fail-closed if audit insert fails)
- Self end: `WORKSPACE_BREAK_GLASS_ENDED`
- Governance revoke: `WORKSPACE_BREAK_GLASS_REVOKED`

## ZERO_DISCLOSURE

Possessing `workspace.break_glass` does not expand list/search/metadata visibility. Only explicit break-glass-aware read routes honor an active session within scope.

Target workflow: canonical resource ID from governance process + `validate-target` (no title/path search).

## ALLOWED_OPERATIONS (W08-02)

Document view (direct link), version history GET, download, preview — **read-only**, opt-in per route via `authorizeWorkspaceDocumentRead({ breakGlass: "allowed" })`.

## FORBIDDEN_OPERATIONS

Edit, manage, ACL mutation, move, archive/trash/restore, permanent delete, version upload, Task/Requirement mutation.

## SCAN_POLICY_INTERACTION

`BREAK_GLASS_DOES_NOT_BYPASS_SCAN_POLICY` — future W08-04 malware gates remain authoritative.

## CHILD_FAMILY_BOUNDARY

Sentinel `WORKSPACE_DOMAIN_ONLY_NOT_PLATFORM_PRIVACY_OVERRIDE` — not a Mobile/family privacy master key.

## MIGRATION

`20260923140000_workspace_08_02_break_glass_governance` — additive; does not modify W08-01 migration.

## RESIDUAL_RISKS

- Concurrent USE vs REVOKE: authorization re-reads DB at use time; narrow race window possible.
- Folder subtree scope does not auto-expand to documents moved out during session (fail-closed on scope check).
