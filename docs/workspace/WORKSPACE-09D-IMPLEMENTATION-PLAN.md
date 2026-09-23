# WORKSPACE-09D — W09 implementation plan

**Baseline STAGE SHA:** `704a7c4571524bd0fd2dc10df238110a23a3201b`  
**Sequence revised** from discovery evidence: **inspector/tasks before access UX polish**; **rename/move APIs** after command shell exists.

---

## Package overview

| Package | Theme |
|---------|--------|
| **W09-01** | Shell + command surface + upload/dnd + create folder + selection architecture |
| **W09-02** | Document inspector + Tasks + Requirements |
| **W09-03** | Versioning + new-version upload + preview + malware UX |
| **W09-04** | Access management + inheritance UX |
| **W09-05** | Rename/move/lifecycle completeness + folder trash UI |
| **W09-06** | Responsive + a11y + loading/error/async + favorites + polish |
| **W09-07** | Security regression + mobile DTO/API + acceptance |

---

## W09-01 — Workspace command surface + upload architecture

| Field | Content |
|-------|---------|
| **SCOPE** | `WorkspaceCommandBar`, lifecycle compact nav (replace discovery strip prominence), unify multi-file upload on button, idle drop hint, local sort, breadcrumb integration, document-selected primary actions (download visible), `available-actions` stub (server) |
| **DEPENDENCIES** | None (UI-only + optional sort query) |
| **BACKEND_REQUIRED** | Optional: sort param on `GET /documents`; no schema |
| **UI_REQUIRED** | Command bar component; refactor `page.tsx` layout; demote `WorkspaceDiscoveryPanel` |
| **SECURITY_RISKS** | UI must not show actions server would deny; use server-computed flags |
| **TESTS** | Component tests for bar states; upload multi-file; existing upload tests extended |
| **ACCEPTANCE** | User finds Hochladen/+Neu without opening tree; drag hint visible on empty folder; no regression on ACL upload denial |

---

## W09-02 — Document inspector + Tasks + Requirements

| Field | Content |
|-------|---------|
| **SCOPE** | Tabbed inspector; `ContextRelatedTasksPanel` always when doc selected; new Requirements list panel; +Aufgabe/+Anforderung flows from command bar; exact-version indicator |
| **DEPENDENCIES** | W09-01 command bar entry points |
| **BACKEND_REQUIRED** | `GET` aggregate endpoint or SSR props: linked tasks + requirement refs for document/version; reuse W07 services |
| **UI_REQUIRED** | `WorkspaceDocumentRequirementsPanel`, link/create modals |
| **SECURITY_RISKS** | Dual auth preserved; zero disclosure on unauthorized doc |
| **TESTS** | Integration tests for resolver; UI tests for empty/linked states |
| **ACCEPTANCE** | Requirements visible alongside tasks; new links store version id for requirements |

---

## W09-03 — Versioning + preview + malware UX

| Field | Content |
|-------|---------|
| **SCOPE** | Neue Version upload via `POST …/versions`; version tab; scan badges; blocked download messaging; preview expand/full-screen |
| **DEPENDENCIES** | W09-01 bar action; W09-02 version context |
| **BACKEND_REQUIRED** | Expose scan state on list/detail DTOs (read-only fields) |
| **UI_REQUIRED** | New version upload flow; malware copy mapping |
| **SECURITY_RISKS** | Never bypass `content-delivery-gate`; no public URLs |
| **TESTS** | Preview/download tests with scan states; version upload e2e |
| **ACCEPTANCE** | New version without creating duplicate document row; scan pending visible |

---

## W09-04 — Access management + inheritance UX

| Field | Content |
|-------|---------|
| **SCOPE** | Extend access summary: inherited vs explicit, source folder; inspector Zugriff tab; improve grant editor labels |
| **DEPENDENCIES** | W09-02 inspector tabs |
| **BACKEND_REQUIRED** | Extend `access-summary` DTO with provenance |
| **UI_REQUIRED** | Redesigned `WorkspaceAccessSummaryPanel` |
| **SECURITY_RISKS** | Summary must not leak unauthorized audiences |
| **TESTS** | Access summary unit tests; inheritance fixtures |
| **ACCEPTANCE** | User can answer WHO/WHAT/WHY without raw grant ids |

---

## W09-05 — Rename, move, lifecycle completeness

| Field | Content |
|-------|---------|
| **SCOPE** | Document rename/move APIs + UI; folder trash UI; restore flows in archived/trash views; destructive hierarchy; remove DEMNÄCHST; folder inspector restructure |
| **DEPENDENCIES** | W09-01 overflow slots; W06/W08 lifecycle services |
| **BACKEND_REQUIRED** | `document-rename-service`, `document-move-service` (if missing); wire folder trash action |
| **UI_REQUIRED** | Trash/archived management views; move/rename dialogs |
| **SECURITY_RISKS** | Move must preserve inheritance rules (`folder-move-authorization`); reference-safe delete |
| **TESTS** | W06/W08 sentinels + new move/rename tests |
| **ACCEPTANCE** | No PLACEHOLDER on rename/move; permanent delete only in trash/destructive contexts |

---

## W09-06 — Responsive, a11y, async, polish

| Field | Content |
|-------|---------|
| **SCOPE** | Tree drawer; resizable inspector; command bar overflow; favorite toggle; async subtree progress UI; i18n cleanup; loading/error consistency |
| **DEPENDENCIES** | W09-01–05 feature-complete |
| **BACKEND_REQUIRED** | Subtree poll endpoint already exists |
| **UI_REQUIRED** | Star control; toast system; aria-live uploads |
| **SECURITY_RISKS** | Low |
| **TESTS** | a11y tests; runtime boundary tests extended |
| **ACCEPTANCE** | Tablet usable; keyboard navigates command bar; async folder delete never shows false success |

---

## W09-07 — Security, regression, mobile readiness, acceptance

| Field | Content |
|-------|---------|
| **SCOPE** | `WorkspaceAvailableActionsDto` + mobile summary/detail endpoints; full regression; milestone sign-off |
| **DEPENDENCIES** | W09-01–06 |
| **BACKEND_REQUIRED** | BFF routes under `/api/workspace/...` documented in discovery §26 |
| **UI_REQUIRED** | None new (acceptance pass) |
| **SECURITY_RISKS** | Pen-test action enumeration; tenant isolation |
| **TESTS** | W09 acceptance sentinel; full workspace suite |
| **ACCEPTANCE** | **DOCUMENT WORKSPACE CLOSED — MOBILE READY** criteria met |

---

## Dependency graph

```
W09-01 ─┬─► W09-02 ─► W09-04
        ├─► W09-03
        └─► W09-05 (partial parallel after 01)
W09-02 + W09-03 + W09-04 + W09-05 ─► W09-06 ─► W09-07
```

---

## Milestone acceptance (W09-07)

| Gate | Criteria |
|------|----------|
| **TECHNICAL** | All workspace vitest sentinels green; no P0/P1 |
| **PRODUCT** | Command bar + core actions discoverable without ⋮ |
| **ACTION** | Action matrix: no MISSING for DOWNLOAD, UPLOAD, NEW VERSION, RENAME, MOVE, CREATE FOLDER, TASK, REQUIREMENT |
| **SECURITY** | No ACL bypass; scan gates enforced |
| **ACCESSIBILITY** | Command bar + table keyboard documented and tested |
| **RESPONSIVE** | Tablet contract implemented |
| **MOBILE_READY** | DTOs + available-actions API stable |

---

## Result

Implementation contract ready. **Do not merge 09D PR for implementation** — use this plan for W09 execution starting with **W09-01**.
