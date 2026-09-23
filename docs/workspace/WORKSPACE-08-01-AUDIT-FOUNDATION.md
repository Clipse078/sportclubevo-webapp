# WORKSPACE-08-01 — Durable audit foundation

**Status:** Implemented on branch `cursor/workspace-08-governance-scale-portability`  
**Baseline:** STAGE @ `7987a9650f760085117a261709411bbd19905e44`  
**Discovery:** `WORKSPACE-08D-DISCOVERY.md` (authoritative)

## Audit contract

| Field | Rule |
|-------|------|
| `tenantId` | Required for workspace governance writes |
| `actorUserId` | Canonical authenticated actor (`User.id`) |
| `actorPersonId` | Optional in `metadataJson` when same-tenant Person mapping exists |
| System jobs | `actorUserId` null + `metadataJson.source = "system"` (W08-05+) |
| `action` | Canonical strings in `lib/workspace/audit/workspace-audit-actions.ts` |
| `outcome` | `SUCCESS` \| `DENIED` \| `FAILURE` in `metadataJson` |
| `workspaceDocumentVersionId` | Optional column for version-scoped events |
| Resource identity | `WorkspaceFolder.id`, `WorkspaceDocument.id`, `WorkspaceDocumentVersion.id` |
| Metadata | Bounded; sanitizer strips storage keys/URLs/secrets |

## Writers

- **Mandatory (transactional):** `writeWorkspaceGovernanceAudit()` — paired with security mutations.
- **Denied (non-transactional):** `recordWorkspaceAccessDeniedAudit()` — does not change denial responses.
- **Best-effort (non-governance):** `logAction()` — operational CRUD only; not sufficient alone for mandatory governance evidence.

## Read authorization

- Permission: **`workspace.audit.view`** (`PERMISSIONS.WORKSPACE_AUDIT_VIEW`)
- Not implied by `workspace.manage`, document MANAGE, or creator identity.
- API: `GET /api/workspace/audit` (tenant-scoped, paginated).
- UI: `/dashboard/workspace/audit` (permission-gated).

## Append-only semantics

See `lib/workspace/audit/append-only-contract.ts`:

- Application: no update/delete audit API for tenants.
- DB: INSERT-only role deferred to ops / W08-08.
- Hash chain: **DEFERRED**.
- WORM export: **OPTIONAL** (W08-06).

## Transaction semantics

Successful security mutations prefer the same DB transaction as the audit insert. Audit insert failure rolls back the mutation when using `writeWorkspaceGovernanceAudit` inside `$transaction`.

## Future W08 seams

Reserved action names for break-glass, retention, hold, purge, and scan state (`WorkspaceAuditFutureAction`) — not emitted in W08-01.

## Migration

`20260923120000_workspace_08_01_durable_audit_foundation` — adds `AuditLog.workspaceDocumentVersionId`, query indexes, and `workspace.audit.view` permission row (idempotent).
