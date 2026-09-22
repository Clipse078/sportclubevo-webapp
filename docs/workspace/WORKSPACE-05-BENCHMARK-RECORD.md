# WORKSPACE-05 — Version hardening benchmark decision record

**Benchmark:** Dropbox Business, Microsoft SharePoint / OneDrive (2026 review).

## Current SCE version model

- `WorkspaceDocument` + append-only `WorkspaceDocumentVersion` rows.
- Monotonic integer `versionNumber` per document (`@@unique([documentId, versionNumber])`).
- Canonical current pointer: `WorkspaceDocument.currentVersionId`.
- Status enum `CURRENT` / `SUPERSEDED` (metadata only; ordering uses version number).
- Private tenant-scoped `storageKey` per version (W04); optional `storageUrl` never used for authorization.
- Version history API + UI; download/preview support optional `versionId` query parameter.

## Dropbox Business patterns (reference)

- Full version history with immutable past versions.
- Restore creates a new latest version; history is not rewound.
- Retention / plan limits on version count and age.

## SharePoint / OneDrive patterns (reference)

- Major versions as immutable snapshots; restore publishes **new** latest from old content.
- Approval / sign-off workflows separate from version storage.
- Governance retention labels and purge policies.

## Adopted for SCE (W05)

| Pattern | SCE decision |
|---------|----------------|
| Restore must not mutate history | **Adopted** — `restoreWorkspaceDocumentVersion` copies bytes to a new private object and appends version N+1. |
| Server-authoritative version numbers | **Adopted** — `_max(versionNumber) + 1` inside a transaction. |
| Historical VIEW from current document ACL | **Adopted** — API asserts document VIEW before list/download/preview/restore metadata. |
| Restore requires EDIT | **Adopted** — `assertWorkspaceDocumentEdit`. |
| Immutable acknowledgement target | **Adopted** — `WorkspaceDocumentVersion.id` (+ tenant/document context). |
| Zero disclosure on cross-tenant / unauthorized | **Adopted** — 404 «Dokument nicht gefunden.» |

## Intentional SCE differences

- No major/minor versioning scheme.
- No version comparison / diff engine.
- No approval, sign-off, or acknowledgement workflow (readiness only).
- No per-version ACL.
- Restore provenance encoded in `changeNote` prefix `RESTORED_FROM_VERSION:{id}` (no schema migration).

## Deferred

| Capability | Target |
|------------|--------|
| Retention / age-based purge / keep-last-N | WORKSPACE-08 |
| Governance-only historical version delete | WORKSPACE-08 |
| Requirement/Task acknowledgement integration | WORKSPACE-07 |
| Collaboration / external links | WORKSPACE-06 |

## Acknowledgement readiness

Canonical reference helper: `toWorkspaceDocumentVersionRefDto` in `lib/workspace/version/version-reference.ts`.

Future invariant: acknowledging V3 does **not** imply acknowledging V4.

## Retention decision (W05 default)

**No automatic age-based or count-based version purge.**

## Version deletion decision (W05 default)

**No ordinary user API to delete individual historical versions.** Document permanent delete (W06/W08 scope) may still cascade-remove all versions.

## Restore pattern

SharePoint-style: historical version N → authorized restore → new version N+1 becomes current; versions 1..N unchanged.

## Approval separation

Version history remains independent from future approval/acknowledgement workflows (WORKSPACE-07+).

## Storage strategy on restore

**Copy bytes to a new private object** under a new `versionId` segment (immutable, W04-safe). No in-place repoint of historical rows.
