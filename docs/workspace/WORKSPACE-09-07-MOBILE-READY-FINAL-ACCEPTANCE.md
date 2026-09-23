# WORKSPACE-09-07 — Mobile-ready contract & final acceptance

**Status:** PASS (product closure package)  
**Branch:** `cursor/workspace-09-product-completion-ux`  
**Implementation PR:** #704  
**Starting HEAD:** `f1d6a77940bbddf7f4f589c4bf71f29937ea187e`  
**STAGE base:** `704a7c4571524bd0fd2dc10df238110a23a3201b`

---

## 1. Mission outcome

Document Workspace is **product-complete** for web and **mobile-ready** via stable server contracts:

- Canonical **`WorkspaceResourceAvailableActionsDto`** (typed boolean flags).
- **Embedded** on folder browse list rows (`availableActions` on `WorkspaceDocumentListItemDto`).
- **Public list/inspector DTOs** without storage keys or raw uploader user IDs on list surfaces.
- **Dual-domain** Task/Requirement actions merged only when `resolveDocumentWorkflowCapabilities` succeeds (zero disclosure preserved).
- **Mutations** remain independently authorized; `availableActions` is UX-only.

No React Native / Expo / duplicate mobile UI was built (by design).

---

## 2. Canonical available-actions source

| Concern | Source |
|--------|--------|
| VIEW / EDIT / MANAGE | `lib/workspace/access/workspace-authorization.ts` |
| Club Admin dynamic MANAGE | `isCanonicalTenantClubAdmin` on actor (no synthetic ACL) |
| Content delivery | `WorkspaceVersionScanPublicDto.contentAvailable` |
| Preview mime gate | `lib/workspace/storage/preview-policy.ts` |
| Lifecycle | `deriveWorkspaceDocumentLifecycle` / folder lifecycle |
| Permanent delete (advertised) | TRASHED + resource MANAGE + tenant `WORKSPACE_DELETE` (governance/reference still enforced on mutation) |
| createTask / createRequirement | `resolveDocumentWorkflowCapabilities` (Tasks/Requirements domains) |

Implementation: `lib/workspace/command/workspace-available-actions.ts`  
List embedding: `lib/workspace/command/enrich-document-list-available-actions.ts`  
Web command-bar tiers: `lib/workspace/command/available-actions-stub.ts` → `mapAvailableActionsToCommandTiers`

---

## 3. Delivery model (no N+1 HTTP)

- **Folder browse (SSR page):** one pass `enrichWorkspaceDocumentListWithAvailableActions` after ACL + scan enrichment.
- **Inspector:** document carries `availableActions`; inspector payload includes the same contract.
- **Dual-domain flags:** resolved once per selected document on page load (not per row) unless extended later with batch eligibility.

Future mobile BFF should reuse the same functions/DTO serializers under `lib/workspace/public-dto/`.

---

## 4. Mobile-safe DTO boundary

| DTO | Location | Notes |
|-----|----------|-------|
| List item public | `workspace-resource-public-dto.ts` | No `storageKey`, `createdByUserId` |
| Version history public | `document-version-history-public-dto.ts` (W09-03A) | Uploader display name only |
| Access management | `access-management-dto.ts` | Audience labels, not grant table internals |
| Inspector document | `document-inspector-dto.ts` | Includes `availableActions` |

Internal service DTOs (`document-dto.ts` download shape) remain server-only.

---

## 5. Product completeness (W09D reconciliation)

| Class | Items |
|-------|-------|
| **COMPLETE** | Folder tree, browse, upload, versions, preview/download gates, access UI, rename/move, lifecycle, favorites/recent, tasks/requirements inspector, command bar, responsive/a11y/i18n structure (W09-06R1) |
| **INTENTIONAL_DEFERRED** | Grid/tiles density |
| **INTENTIONAL_NO_UI** | Universal Search (post-W09 programme) |
| **OUT OF SCOPE** | Google Drive import, Mobile-D UI, Performance programme |

No core **Demnächst** / fake controls on Workspace surfaces (verified in W09-07 tests).

---

## 6. Infrastructure residuals (non-blockers)

| Item | Type |
|------|------|
| Real AV provider wiring | Deployment / W08 residual |
| Swiss storage verification | Deployment / W08 residual |
| Historical migration checksum drift | Known repo/ops residual |
| Global EN/FR/IT route activation | Global locale rollout — not Workspace blocker |

---

## 7. Security acceptance

- Creator provenance does not affect `computeWorkspaceDocumentAvailableActions`.
- Client flags are not authoritative; API routes call `assertWorkspaceDocumentEdit/Manage` etc.
- Zero disclosure: inaccessible resources → `emptyAvailableActions()` when compute invoked without view.

Tests: `lib/workspace/__tests__/w09-07-mobile-ready-contract.test.ts` plus existing W01–W09-06R1 sentinels.

---

## 8. Closure statement

**DOCUMENT WORKSPACE CLOSED — MOBILE READY** (API/DTO + available-actions).  
Merge PR #704 after final human review; do not start Mobile-D / Search / Performance from this package.
