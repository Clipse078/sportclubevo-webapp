# WORKSPACE-05 — Workspace document version invariants

`WorkspaceDocumentVersion` rows are **immutable historical facts**. Once persisted, identity and content locator fields are not rewritten.

## Invariants

| ID | Invariant |
|----|-----------|
| V1 | A `WorkspaceDocument` has zero, one, or many versions according to creation semantics. |
| V2 | Every persisted version has immutable identity (`id`, content locator, sequence, actor, timestamp). |
| V3 | Every version belongs to exactly one `WorkspaceDocument`. |
| V4 | Version ordering is deterministic (`versionNumber`, then `createdAt`, then `id`). |
| V5 | Current/latest version is `WorkspaceDocument.currentVersionId` (canonical pointer). |
| V6 | Historical version content cannot be overwritten by uploading another file. |
| V7 | Restore creates a **new** version (SharePoint-style — history is not rewound). |
| V8 | Restore never changes historical version bytes/metadata. |
| V9 | Historical access derives from **current** document ACL (VIEW). |
| V10 | Versions have no independent ACL. |
| V11 | Cross-tenant version lookup fails closed (zero disclosure). |
| V12 | Document archive does not delete version history. |
| V13 | Acknowledgement references may target `WorkspaceDocumentVersion.id` permanently. |
| V14 | Future Task/Requirement linkage must not rely on mutable "latest". |
| V15 | Storage-provider implementation is irrelevant to version identity (`storageKey` locator only). |

## Canonical reference (acknowledgement readiness)

```ts
WorkspaceDocumentVersionRef { tenantId, documentId, versionId }
```

Authoritative immutable identifier: **`WorkspaceDocumentVersion.id`**.

Never use `documentId + "latest"`, filename, display version number alone, `storageKey`, or `storageUrl` as acknowledgement identity.

## Future acknowledgement semantics (WORKSPACE-07)

If person X acknowledges version V3 and later V4 is uploaded, X acknowledged **V3 only**. A newer version may require a new acknowledgement under future business rules.
