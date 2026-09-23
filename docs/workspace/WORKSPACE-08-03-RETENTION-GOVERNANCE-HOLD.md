# WORKSPACE-08-03 — Reference-aware retention, trash purge, governance hold

**Branch:** `cursor/workspace-08-governance-scale-portability`  
**Migration:** `20260923160000_workspace_08_03_retention_governance_hold`

## Retention

- Default trash retention: **60 days** (`WORKSPACE_DEFAULT_TRASH_RETENTION_DAYS`).
- Tenant override: `WorkspaceTrashRetentionPolicy.trashRetentionDays` (30–180).
- Purge eligibility starts at `trashedAt + retentionDays`.

## Governance hold

- Model: `WorkspaceGovernanceHold` with scopes `DOCUMENT` and `FOLDER_SUBTREE`.
- **FOLDER_SUBTREE** protection is evaluated **dynamically** at purge time using the document’s current `folderId` and folder ancestor chain.
- Create/release requires `workspace.governance.manage` (not implied by `workspace.manage`, `workspace.break_glass`, or `workspace.audit.view`).

## Purge

- Canonical eligibility: `evaluateWorkspaceDocumentPurgeEligibility`.
- Execution: `purgeWorkspaceDocumentPermanently` (storage before DB; shared-key check; missing object tolerated).
- Cron: `GET /api/cron/workspace-trash-purge` (Bearer `CRON_SECRET`, bounded batches).

## Reference classification (W07 baseline)

| Class | Examples |
|-------|----------|
| **Blocking** | `TaskDocumentReference`, `RequirementWorkspaceDocumentVersionReference` |
| **Non-blocking** | `CommunicationAttachment.sourceDocumentId` (`ON DELETE SET NULL`) |
| **Cascade-safe** | `WorkspaceAccessGrant`, favorites/recents, ended break-glass session rows cleared before document delete |
