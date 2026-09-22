# WORKSPACE-04 — Storage security benchmark decision record

**Benchmark:** Dropbox Business, Microsoft SharePoint / OneDrive, Vercel private Blob (2026 review).

## Current storage state (pre-W04 baseline)

- Dedicated private Vercel Blob store (`WORKSPACE_BLOB_*` env), separate from public assets.
- Server-side `put`/`get`/`del` with `access: "private"` for new Workspace uploads.
- `storageKey` persisted on `WorkspaceDocumentVersion`; optional `storageUrl` is not used as authorization.
- Download/preview API routes enforce W02 VIEW before streaming content.

## Risks discovered

| Risk | Classification |
|------|----------------|
| Legacy keys used tenant slug segments instead of immutable tenant id | Addressed for new uploads; legacy keys remain authorization-gated |
| MIME trust from browser alone | Mitigated via `validateWorkspaceDocumentUpload` (extension + signature checks) |
| Inline preview broader than explicit allowlist | Tightened via `preview-policy` (PDF + safe raster only) |
| SVG / HTML active content | Blocked from inline preview; SVG blocked from upload allowlist |
| Optional public historical blobs (if any) | **W04-A1 STAGE read-only audit (2026-09-22):** 6 active legacy `workspace/{slug}/…` version rows; all persisted `storageUrl` values returned HTTP 403 on unauthenticated HEAD — **CASE L1** (legacy locators remain; no anonymous retrieval via stored provider URLs). No mass rewrite in W04. |

## Dropbox Business patterns (reference)

- Private-by-default content, app authorization before bytes, short-lived access, upload policies.

## SharePoint / OneDrive patterns (reference)

- Malware scanning, preview allowlists, attachment download headers, no permanent anonymous document URLs.

## Vercel private Blob capabilities adopted

- Private store + token/server `get` streaming (no browser token).
- Immutable pathname keys with `allowOverwrite: false` for version immutability.

## Adopted for SCE

- Provider-neutral storage contract (`WorkspaceStorageProvider`, stored object locator).
- Tenant-scoped secure key namespace: `workspace/tenants/{tenantId}/documents/{documentId}/versions/{versionId}/…`
- Canonical upload policy module (size, MIME, blocked extensions, filename sanitization).
- Explicit preview allowlist and safe download headers (`attachment`, `nosniff`).
- Upload EDIT destination guard; download/preview VIEW guards unchanged from W02.
- Legacy storage key compatibility without anonymous bypass.

## Intentional SCE differences

- No malware scanner integration in W04 (honest `NOT_SCANNED` seam only).
- No external / anonymous sharing (deferred to W06).
- No Google Drive migration seam (programme removed).
- Root uploads remain gated by tenant `WORKSPACE_MANAGE` capability plus W02 folder EDIT when `folderId` is set.

## Deferred security capabilities

| Capability | Target |
|------------|--------|
| Malware scanning persistence + BLOCKED enforcement | WORKSPACE-08 |
| Signed short-lived read URLs (if needed for scale) | Evaluate with provider ops |
| Immutable acknowledgement / version product | WORKSPACE-05 |
| Audit / governance / Swiss-hosting migration | WORKSPACE-08 |

## Malware scanning status

**Not implemented.** `WorkspaceContentSecurityStatus` extension point only. `NOT_SCANNED` must not be interpreted as clean.

## Legacy storage compatibility

- Keys matching `workspace/{slug}/…` (pre-W04) remain valid storage references when resolved from authorized version rows.
- New uploads use tenant-id namespace only.
- No mass delete/re-upload of STAGE objects in W04.
- **W04-A1 classification:** **L1** — STAGE holds 6 legacy-namespace version rows (0 new-namespace rows yet); anonymous probe of stored URLs: 0/6 publicly reachable (403). Keep legacy resolver; no provider-layer blocker for W04 closure.

## Swiss-hosting portability

- Domain depends on `storageKey` + provider enum, not permanent HTTP URLs.
- Vercel SDK isolated to `upload-storage` adapter.

## Google Drive

Out of scope — removed from programme roadmap.
