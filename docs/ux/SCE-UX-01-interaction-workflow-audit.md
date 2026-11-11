# SCE-UX-01 — Interaction & Workflow Architecture Audit

| Field | Value |
| --- | --- |
| **Package** | `SCE-UX-01` |
| **Branch** | `cursor/sce-ux-01-interaction-workflow-audit-438b` |
| **Base** | `STAGE` @ `ec538e537` (includes merged PR #953 `29c3423c`) |
| **Design principle** | *Simple understanding. Shallow navigation. Deep capability.* |
| **Scope** | Audit + architecture contract only — **no** application-wide redesign, **no** Club Development 2.0 implementation |
| **Evidence contract** | `lib/ux/sce-ux-01-interaction-architecture.ts` |

## Executive summary

SportClubEvo already has a **mature interaction stack** from Design System 2.0 and DS-06/DS-09: `Dialog` + `Sheet` on `SceModalOverlay`, modal-first create composers, `SceActivityComposer` for sporting activities, `SceContextTabs` with dirty navigation for activity records, and Finance-aligned `SceWorkspaceChrome` for full-page workspaces.

The main gaps are **consistency**, not missing primitives:

1. **Oversized overlays** — several Sheets/Drawers exceed ~400–850 LOC (registrations, player release, people-access wizard) without tabbed decomposition or dirty guards.
2. **Dual entry models** — intentional DS-09 modal-first + `/new` deep links, plus legacy full-page-only flows (team register, aufgaben full create, activity `/new`).
3. **Legacy local tabs** — `PersonDetailTabs`, registration drawer tabs vs canonical `SceContextTabs`.
4. **Club Development** — Targets/Initiatives/Meetings follow modal-first composers; **hub + Processes** are not yet aligned (hub is demo data; processes route exists but interaction model is unset for 2.0).
5. **Dirty-state coverage** — strong on activity composers and match record; **weak or absent** on many workspace `Dialog` composers and large Sheets.

This audit defines **decision rules** and **six small implementation packages**, prioritizing Club Development composer parity (`SCE-UX-01A`) without migrating unrelated working surfaces.

---

## Phase A — Preflight (completed)

| Check | Result |
| --- | --- |
| Repository | `Clipse078/sportclubevo-webapp` |
| Working tree | Clean before branch |
| `origin/STAGE` | Fast-forwarded to `ec538e537` |
| PR #953 merge SHA | Present on `origin/STAGE` (`29c3423c`) |
| Feature branch | `cursor/sce-ux-01-interaction-workflow-audit-438b` |

---

## Phase B — Existing interaction audit (evidence-based)

### Canonical primitive registry (reuse — do not fork)

| Concern | Canonical location | Notes |
| --- | --- | --- |
| Centered modal / workspace composer | `components/ui/Dialog.tsx` | `size="workspace"`, `bodyLayout="flex"`, mobile viewport shell |
| Contextual side panel | `components/ui/Sheet.tsx` | `contextualPanel` for Wochenplaner (DS2-06-D) |
| Overlay portal + focus | `components/ui/SceModalOverlay.tsx`, `lib/ui/use-sce-modal-dialog.ts` | Shared with Dialog and Sheet |
| Destructive confirm | `components/sce/actions/SceConfirmDialog.tsx` | No parallel confirm modals |
| Activity multi-tab create/edit | `components/sce/activity-composer/SceActivityComposer.tsx` | Overlay · page · fullscreen; guided steps |
| Detail workspace tabs | `components/sce/context-tabs/SceContextTabs.tsx` | URL `?tab=`; dirty guard |
| Full-page workspace chrome | `components/sce/workspace/SceWorkspaceChrome.tsx` | Finance reference (DS2-06) |
| Inline disclosure | `components/sce/page/SceInlineEditor.tsx`, `SceExpandablePanel.tsx` | Low adoption outside facilities/reference |
| Modal-first create policy | `lib/design-system/sce-create-flow-foundation.ts` | DS-09: list/modal canonical; `/new` deep link |
| Modal retention inventory | `lib/design-system/sce-ds2-06-modal-migration-inventory.ts` | Conflicts, governance, confirm retain modal |
| Entity pickers | `docs/ux/sce-selector-inventory.md` | Canonical vs domain-specific |

### Domain findings

#### Club Development (Vereinsentwicklung)

| Surface | Pattern observed | Evidence |
| --- | --- | --- |
| Hub | Full-page list/KPI (demo) | `app/(admin)/vereinsleitung/club-entwicklung/page.tsx` — `DEMO_PROCESSES`, not persisted |
| Ziele | Modal-first + deep link | `CreateTargetComposerDialog` → `TargetNewPageClient layout=composer` |
| Initiativen | Modal-first + deep link | `CreateInitiativeComposerDialog` → `InitiativeForm layout=composer` |
| Meetings | Modal-first + deep link | `CreateMeetingComposerDialog` |
| Prozesse | Route in IA | `/vereinsleitung/prozesse` — interaction pattern not unified with siblings |

**Club Development 2.0 implication:** Reuse existing composer forms; add workspace shell + dirty guard + process create parity — do **not** introduce a second modal system.

#### Finance

| Pattern | Examples |
| --- | --- |
| Full-page workspace | Finance tabs under `SceWorkspaceChrome` |
| Sheet inspection | `FinancePublication*Sheet`, commitment panels |
| Retained modals | Scenario governance, expected event dialogs (`sce-ds2-06-modal-migration-inventory`) |

Reference behaviour for **shallow navigation** (tabs stay visible; edits in panel or modal).

#### Teams & persons

| Pattern | Examples | Issue |
| --- | --- | --- |
| Full-page guided | `TeamRegistrationWizard` at `/dashboard/teams/register` | Documented exception to modal-first |
| Large Sheets | `TeamSquadManagementCard`, `PlayerReleasePlanningSheet` (~847 LOC) | Drawer pattern strained — consider tabbed Sheet or routed subflow (UX-01C) |
| Person create | `PersonCreateSheet` | Dual entry with `/dashboard/persons/new` |
| Person detail | `PersonDetailWorkspace` + `PersonDetailTabs` | Legacy local tabs (SCE-CONTEXT-TABS-STANDARD § out of scope) |
| Inline on cards | Team settings publication | Unsaved discard on server prop change (tested) |

#### Matches & tournaments

| Pattern | Examples |
| --- | --- |
| Guided composer | `MatchCreateForm`, `TournamentCreateForm`, `TrainingCreateForm` → `SceActivityComposer` |
| Full-page record | `SpieleMatchRecordWorkspace` + dirty hint + `SceContextTabs` |
| Nested modal | `SceClubTeamSelectorDialog` over composer — **justified** per DS-06 |
| Progressive disclosure | `SceMatchCardCollapsibleOperationalDetails` (accordion, not modal) |

#### Planning

| Pattern | Examples |
| --- | --- |
| Contextual Sheet | `WeekplannerOperationalPlanningSheet`, activity editor shell |
| Focused modal | `PlanningHubConflictWorkspaceDialog`, `PlanningHubManipulationModalShell` |
| Activity create overlay | Planning hub → composer overlay (per SCE-ACTIVITY-CREATION) |

#### Administration

| Pattern | Examples |
| --- | --- |
| Multi-step modal | `PeopleAccessWizardDialog` (4 steps, `WizardStepIndicator` on roles) |
| Drawer tabs | `PersonAccessDrawer` |
| Modal-first | Roles, tenants, platform users (`*CreateComposerDialog`) |
| Full-page task create | `AufgabenFullCreateClient` with `SceWorkspaceChrome` |
| Short contextual modal | `ContextualTaskCreateDialog` from activity/task context |

### Cross-cutting observations

| Topic | Finding |
| --- | --- |
| **Oversized modals/drawers** | `RegistrationDetailDrawer` (~863 LOC), `PeopleAccessWizard` (~856 LOC), `PlayerReleasePlanningSheet` (~847 LOC) |
| **Full-page forms** | Activity `/new`, Aufgaben full create, team register, CMS/page builder, finance structure builder |
| **Drawers vs Sheets** | Product uses `Sheet` for drawers; naming varies (`*Drawer` vs `*Sheet`) but same primitive |
| **Multi-step** | Activity composer guided workflow (free navigation + reviewed-step semantics); people-access wizard; team registration wizard |
| **Cancellation** | Composer: dirty close guard; many Dialog composers: backdrop/Escape → immediate `onClose` |
| **Unsaved changes** | `SceContextDirtyGuardProvider` on activity tab shells; `beforeunload` on `PageBuilderClient`; sparse elsewhere |
| **Validation feedback** | Activity composer tab error map; task forms inline `setError`; toast via `ToastProvider` (DS2-07G) |
| **Free-text vs canonical entity** | Task context uses search API (`TaskContextField`) — acceptable but should align with selector inventory (UX-01E); assignees use `TaskPeopleMultiPicker` (canonical) |
| **Navigation inconsistency** | Route tabs (team cockpit) vs query tabs (activities) vs local tabs (person, registration) |

### Modal-first create adoption (DS-09 snapshot)

All representative creates in `SCE_CREATE_FLOW_REPRESENTATIVE_AUDIT` are `MODAL_FIRST_DS09`. Documented full-page exceptions list is **empty** post DS-10R1 — de-facto exceptions remain:

- Sporting activity `/new` (composer page mode)
- `/dashboard/teams/register`
- `/dashboard/aufgaben/...` full create client

These are **valid** when classified in the decision matrix as `FULL_PAGE_WORKFLOW` or `GUIDED_STEPS`, not modal debt.

---

## Phase C — Interaction architecture (decision rules)

### Decision matrix

| # | Pattern | Use when | Canonical | Dirty guard | Mobile |
| --- | --- | --- | --- | --- | --- |
| 1 | **Inline editing** | ≤3 related fields; list/card context must stay visible | `SceInlineEditor`, inline expand | Optional | Full-width expand |
| 2 | **Modal** | Short create/edit, confirm, reversible decision | `Dialog`, `SceConfirmDialog`, `*CreateComposerDialog` | Recommended | Full-viewport dialog shell |
| 3 | **Drawer** | Inspect + light edit; preserve grid/list context | `Sheet`, `contextualPanel` for planning | Recommended | End sheet, full height |
| 4 | **Full-page workflow** | Complex tabs, CMS, registration, finance structure | `SceWorkspaceChrome` + `SceContextTabs` | **Required** | Document scroll |
| 5 | **Guided steps** | Sequenced validation; user can review ahead | Composer `guidedWorkflow`, wizards | **Required** | Sticky footer nav |

### Keyboard & focus

- All `Dialog` / `Sheet` use `useSceModalDialog` (focus trap, Escape, initial focus on title).
- Activity composer adds overlay lifecycle (`applySceModalOpenSideEffects`) and restore on close.
- **Gap:** Workspace Dialog composers should mirror composer dirty-close for Escape/backdrop when forms are dirty (UX-01B).

### Error handling

- **Field-level:** domain forms (`InitiativeForm`, task clients).
- **Tab-level:** activity composer (`validateDraft`, `firstInvalidTab`).
- **Toast:** global provider; use for async save outcomes, not for every inline validation.

### Draft preservation

- Activity composer: explicit draft save adapters (domain-specific, 01C+).
- Page builder: `beforeunload` when dirty.
- **Gap:** Club Development composers lack shared dirty/draft contract.

### Anti-patterns (avoid)

| Anti-pattern | Prefer |
| --- | --- |
| Modal → modal stacks | Elevated layer only (`SceClubTeamSelectorDialog` exception); else Sheet secondary panel or combobox |
| New overlay system | `Dialog` / `Sheet` / `SceActivityComposer` only |
| Locked wizard with no tab escape | Composer guided semantics (01E-R6) |
| Free-text foreign keys for browseable entities | `SceListSelectorPanel` / domain picker per selector inventory |
| Migrating working Finance/Match flows for visual-only parity | Touch only when changing interaction class |

---

## Phase D — Prioritized implementation roadmap

| ID | Title | Priority | Club Dev 2.0 |
| --- | --- | --- | --- |
| **SCE-UX-01A** | Club Development composer contract | **1** | **Primary** — unify create/edit shell for Targets/Initiatives/Meetings/Processes |
| **SCE-UX-01B** | Unsaved-change guard matrix | **1** | Required before 2.0 multi-field forms |
| **SCE-UX-01C** | Oversized surface split guidelines | 2 | Process checklist UI may trigger split |
| **SCE-UX-01D** | Context tab legacy migration register | 2 | Person/process links from hub |
| **SCE-UX-01E** | Canonical entity selection enforcement | 2 | Initiative owners, process owners |
| **SCE-UX-01F** | Club Development hub workspace shell | 3 | Replace demo hub; shallow links to lists |

### Recommended first package: **SCE-UX-01A**

**Scope:** Shared `SceWorkspaceChrome` on Vereinsentwicklung list routes; extract a thin `SceClubDevelopmentComposerShell` wrapping existing `Dialog size=workspace` + `layout=composer` forms; document dirty-close behaviour; align Process create with Target/Initiative modal-first pattern.

**Out of scope for 01A:** Process engine, KPI persistence, initiative workflow automation.

### Dependencies

| Package | Depends on |
| --- | --- |
| 01A | DS2-06 page patterns, `sce-create-flow-foundation` |
| 01B | `ContextDirtyNavigationContext`, `use-composer-close-guard` |
| 01C | 01B |
| 01D | SCE-UI-ROLLOUT-01B |
| 01E | `sce-selector-inventory.md` |
| 01F | 01A, SCE-NAV-IA-V2-01 |

### Risks

| Risk | Mitigation |
| --- | --- |
| Workspace dialogs grow too tall | Cap fields per modal; route to full-page only when >12 fields or >3 tabs |
| Dirty guard fatigue | Same German copy as activity composer; confirm only when dirty |
| Club Development 2.0 scope creep | 01A limits to shell + parity; F is hub-only |
| Regression in team release Sheet | 01C is guidelines + incremental splits, not big-bang |

---

## Phase E — Validation

| Command | Purpose |
| --- | --- |
| `vitest run lib/ux/__tests__/sce-ux-01-interaction-audit.test.ts` | Audit contract structure |
| `npm run test:design-system` | Existing DS governance regression |

---

## Related documentation

- [DS2-06 unified page architecture](../design-system-v2/18-ds2-06-unified-page-architecture-delivery.md)
- [SCE Activity Creation](../design/SCE-ACTIVITY-CREATION.md)
- [SCE Context Tabs Standard](../design/SCE-CONTEXT-TABS-STANDARD.md)
- [DS-06 Action & Dialog Inventory](../design/SCE-DESIGN-SYSTEM-06-ACTION-DIALOG-INVENTORY.md)
- [SCE Selector Inventory](./sce-selector-inventory.md)
- [SCE Admin Access UX-01](../admin/SCE-ADMIN-ACCESS-UX-01-PEOPLE-INVITATIONS-ACCESS.md)

---

## Classification

| Item | Value |
| --- | --- |
| `SCHEMA_CHANGED` | `false` |
| `REDESIGN_SHIPPED` | `false` |
| `CLUB_DEVELOPMENT_2_0_STARTED` | `false` |
