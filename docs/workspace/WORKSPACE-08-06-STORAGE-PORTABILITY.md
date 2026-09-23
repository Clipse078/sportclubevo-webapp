# WORKSPACE-08-06 — Storage / infrastructure portability + Swiss-hosting seams

**Status:** Implemented (portability seams only — no production cutover)  
**Branch:** `cursor/workspace-08-governance-scale-portability`  
**Migration:** `20260923220000_workspace_08_06_storage_provider_identity`  
**Prerequisite migrations (immutable):** W08-01 … W08-05

---

## CURRENT_STORAGE_COUPLING

| Area | Before W08-06 | After W08-06 |
|------|---------------|--------------|
| Domain services | Imported concrete `workspaceStorageProvider` from Vercel module | Resolve provider via registry from persisted `storageProvider` or configured upload provider |
| `@vercel/blob` | `upload-storage.ts` | Isolated to `storage/adapters/vercel-blob-workspace-storage.ts` |
| Version rows | `storageKey` only | `(storageProvider, storageKey)` durable identity |
| Purge shared-key safety | `storageKey` only | `(storageProvider, storageKey)` |
| Upload provider | Implicit Vercel | `WORKSPACE_STORAGE_PROVIDER` (default `vercel-blob`) |

## TARGET_STORAGE_ARCHITECTURE

```
Workspace domain/services
        |
WorkspaceStorageProvider (interface)
        |
WorkspaceStorageProviderRegistry
        |
+----------------------+------------------------+
| Vercel Blob adapter  | S3-compatible adapter  |
| (existing behaviour) | (private SOS-compatible)|
```

## PROVIDER_IDENTITIES

| ID | Meaning |
|----|---------|
| `vercel-blob` | Dedicated private Vercel Blob store (legacy + default upload on STAGE) |
| `s3-compatible` | Private S3 API store (Exoscale SOS, AWS S3, MinIO, …) selected by env endpoint/region/bucket |

No vendor-specific provider IDs in domain logic beyond these two stable identities.

## STORAGE_KEY_CONTRACT

Canonical durable locator: **`storageProvider` + `storageKey`**.

Keys remain tenant-scoped: `workspace/tenants/{tenantId}/documents/{documentId}/versions/{versionId}/{filename}`.

## STORAGE_URL_LEGACY_STATUS

`storageUrl` remains optional on version rows for legacy Vercel compatibility. **New `s3-compatible` writes set `storageUrl = null`.** Signed URLs are never canonical identity and must not be persisted for S3-compatible objects.

## PROVIDER_FACTORY

- `getWorkspaceStorageProvider(providerId)` — historical reads, purge, preview  
- `getConfiguredWorkspaceUploadStorageProvider()` — new uploads/restores (server config only)  
- Unknown provider → fail closed (`WorkspaceStorageOperationError`)

## VERCEL_ADAPTER

`VercelBlobWorkspaceStorage` — unchanged behavioural contract; isolated module; private Blob store env vars unchanged.

## S3_COMPATIBLE_ADAPTER

`S3CompatibleWorkspaceStorage` using `@aws-sdk/client-s3`. Private objects only (no public-read ACL). Upload conflict via HEAD + conditional semantics.

## EXOSCALE_COMPATIBILITY

Example profile (no credentials):

```json
{
  "WORKSPACE_STORAGE_PROVIDER": "s3-compatible",
  "WORKSPACE_S3_ENDPOINT": "https://sos-ch-gva-2.exo.io",
  "WORKSPACE_S3_REGION": "ch-gva-2",
  "WORKSPACE_S3_BUCKET": "sportclubevo-workspace-example",
  "WORKSPACE_S3_FORCE_PATH_STYLE": "false"
}
```

`ch-dk-2` and other SOS regions remain valid via configuration — not hard-coded.

## PRIVATE_OBJECT_POLICY

All S3-compatible objects are private. Access only through authorized Workspace server flows after ACL + scan gate (+ optional break-glass). No permanent public URLs.

## CONFIGURATION

| Variable | Purpose |
|----------|---------|
| `WORKSPACE_STORAGE_PROVIDER` | Upload provider (`vercel-blob` default) |
| `WORKSPACE_S3_ENDPOINT` | S3-compatible endpoint |
| `WORKSPACE_S3_REGION` | Region (required for S3 adapter) |
| `WORKSPACE_S3_BUCKET` | Bucket |
| `WORKSPACE_S3_ACCESS_KEY_ID` | Access key |
| `WORKSPACE_S3_SECRET_ACCESS_KEY` | Secret key |
| `WORKSPACE_S3_FORCE_PATH_STYLE` | Optional path-style addressing |

Validation fails closed; secrets never logged.

## CREDENTIAL_SECURITY

Storage credentials never appear in client bundles, DTOs, audit payloads, job payloads, or version rows.

## UPLOAD / DOWNLOAD / PREVIEW / HISTORICAL_VERSIONS

- **Upload:** configured provider only (not client-selected).  
- **Download/preview/historical:** persisted `storageProvider` on the immutable version row.  
- **Restore:** read source provider; write new bytes via configured upload provider.

## W07_REFERENCES

Task/Requirement references continue to target exact `WorkspaceDocumentVersion.id` — storage provider opaque to W07.

## SCANNER_INTERACTION

Malware scan jobs reference version id + internal `storageKey` metadata only — no S3 credentials or presigned URLs in job payloads.

## PURGE / SHARED_KEY_IDENTITY

Purge deletes each version object via its own provider. Shared physical object identity is `(storageProvider, storageKey)`.

## ERROR_TAXONOMY

Provider errors normalized to bounded classes in `storage-errors.ts` (`NOT_FOUND`, `AUTHENTICATION_FAILED`, …). Raw vendor errors are not exposed to ordinary API callers.

## OBSERVABILITY

Logs may include provider id, operation, bounded error class — never storage secrets, signed URLs, or credentials.

## DEFAULT_PROVIDER_SWITCH

Changing `WORKSPACE_STORAGE_PROVIDER` affects **new writes only**. Historical rows retain persisted provider; no automatic migration or dual-write.

## FUTURE_MIGRATION_SEAM

Future cutover (out of scope): copy object → verify checksum → atomic metadata switch → audit → source cleanup.

## CHECKSUM_STATUS

`checksum` (SHA-256) already stored on versions — suitable for future migration verification.

## SWISS_STORAGE_CAPABLE = YES

Architecture supports Swiss-region S3-compatible object storage via configuration.

## SWISS_STORAGE_CONFIGURED = NO

Unless deployment env explicitly sets Swiss SOS endpoint (not done in W08-06).

## SWISS_STORAGE_VERIFIED = NO

No live Exoscale bucket or residency verification in this slice.

## FULL_PLATFORM_SWISS_RESIDENCY

**NO** — requires database, compute, logs, audit, scanner workers, backups, and object store alignment.

| Boundary | Residency driver |
|----------|------------------|
| DATABASE_RESIDENCY | Postgres host region (e.g. Neon) |
| RUNTIME_RESIDENCY | Deployment platform region |
| LOG_RESIDENCY | Log vendor / retention region |
| SCAN_RESIDENCY | Scanner worker region |

Adapter availability ≠ verified residency.

## RESIDUAL_RISKS

- STAGE remains on Vercel Blob until an explicit future cutover.  
- Mixed-provider documents possible after cutover — purge/download paths must stay provider-aware (covered by tests).  
- `storageUrl` on legacy Vercel rows may contain provider URLs — not used as canonical identity.

## W08_07_SEAMS

Large subtree destructive operations (W08-07) should reuse provider registry for async storage phases; no migration logic in W08-06.
