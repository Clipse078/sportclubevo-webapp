# SCE Tenant Documentation Workspace — Confluence parity (release 1)

| Confluence capability | SCE release scope | Reused SCE components |
| --- | --- | --- |
| Spaces | `TenantDocumentationSpace` tenant-scoped; default seed `vereinsleitung` | Tenant isolation (`getActiveTenant`), RBAC module permissions |
| Nested page tree | `TenantDocumentationPage` parent/child; stable ID routes `/dashboard/dokumentation/p/[pageId]` | Workspace ACL audience matching (`audience-match.ts`) |
| Draft vs published | One `TenantDocumentationPageDraft` per page; readers see `publishedVersion` | TipTap JSON (`lib/cms/rich-text.ts`) |
| Real-time co-editing | Yjs durable state in Postgres + HTTP sync API | Auth.js session, `requireApiPermission` |
| Presence | `TenantDocumentationCollaborationPresence` | Workspace actor membership resolution |
| Publish / immutable versions | `TenantDocumentationPageVersion` with actor + timestamp | — |
| Version history / restore | Publish creates monotonic `versionNumber`; restore rewrites draft + publishes | — |
| Permission-aware search | Published title + `plainText` only; drafts excluded | `resolveEffectivePageAccess` |
| Page move | `moveDocumentationPage` with destination access check | Workspace move authorization pattern |
| **@mentions (inline)** | TipTap `taskDescriptionMention` mark via shared `SceInlineMentionMark` + `SceInlineMentionSuggest`; tenant people search | `searchTenantDescriptionMentionCandidates`, `person-user-identity` |
| Publish mention notifications | `TENANT_DOCUMENTATION_MENTION` on new mentions only; dedup per `publishedVersionId+userId` | `createNotificationIdempotent`, task/meldung mention patterns |
| Comments / inline review threads | Deferred — attach to `pageId` / `publishedVersionId` | Shared mention components ready for Aktivität workstream |

## Out of scope (shared collaboration workstream)

- Page comments
- Inline review threads
- @mentions

Attach future collaboration primitives to:

- `TenantDocumentationPage.id` (page-scoped threads)
- `TenantDocumentationPageVersion.id` (published anchor)
- `TenantDocumentationPageDraft.revision` (draft co-editing epoch)