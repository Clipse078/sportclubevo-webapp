# SCE-COMM-UX-06 — Zielgruppen Workspace

**Programme:** SCE COMM  
**Branch:** `cursor/comm-ux-06-target-groups`  
**Routes:** `/dashboard/communication/zielgruppen`, `/new`, `/[id]`  
**Architecture:** COMM-01, COMM-02, COMM-03 (unchanged domain contracts)

---

## Canonical ownership

Zielgruppen remain **organisation-wide Communication resources** on tenant-scoped `TargetGroup` rows. Campaigns, Mitteilungen, Vorlagen, and Aufgaben **reference** saved groups via `savedTargetGroupIds` — no parallel audience engine (`CampaignTargetGroup`, etc.) was introduced.

---

## Rule model

| Concern | Implementation |
|---------|----------------|
| Persistence | `TargetGroup.ruleJson` v2 envelope (`schemaVersion: 2`) |
| Audience contract | `CommunicationAudienceSpec` + optional `structuralExclusion` |
| Legacy resolver | Derived `resolverClause` (`TargetGroupClause` tree) |
| Editor state | `ZielgruppeEditorDefinition` in `editor-model.ts` |

---

## Selector types (COMM-02 editor)

- Ganze Organisation (structural, no stored person IDs)
- Organisationseinheit (`orgUnitIds`)
- Team (`teamIds` — stable `Team.id`, active season at resolve time)
- Rolle (`roleIds` in UI → `roleKeys` in spec)
- Person include / exclude (`personIds`)
- Structural NOT: exclude org unit, team, role

**Sponsor selectors:** not part of canonical Zielgruppe rules (COMM-13 remains on campaign/club composers).

---

## Boolean semantics

- **UNION (ODER):** default — any structural/include criterion matches.
- **INTERSECTION (UND):** all structural/include criteria must match.
- **Excludes:** explicit person exclusions and structural NOT selectors subtract after inclusion (exclude wins).

UI copy matches engine semantics — no nested query builder beyond canonical support.

---

## Dynamic vs static

All saved Zielgruppen are **dynamically resolved** at preview/send time from current org membership. There is no separate “static snapshot Zielgruppe” type. Historical truth for sent communications lives in **dispatch recipient snapshots** (COMM-03), not in the TargetGroup row.

---

## Overview UX

- COMM-UX-01 shell (`CommunicationWorkspaceHeader`, `CommunicationContentSurface`)
- H1 **Zielgruppen** + reusable-audience description
- **Neue Zielgruppe** when `communication.zielgruppen.manage`
- Search (name, description) + status filter (aktiv / archiviert / alle)
- Desktop table + mobile cards — rule character, summary, last changed (no per-row recipient resolution)
- Empty + filtered-empty states

Display helpers: `lib/communication/zielgruppen/zielgruppen-display.ts`

---

## Builder UX (create / edit)

Four-step wizard:

1. **Grundlagen** — name, description (status on edit)
2. **Regeln / Empfänger** — selector chips + searchable adds
3. **Vorschau** — explicit **Vorschau aktualisieren** (COMM-03 preview)
4. **Überprüfen** — human-readable summary + save

Detail default: read sections + **Bearbeiten** (`?edit=1`) opens wizard.

Human-readable lines: `human-readable-rules.ts` — no raw JSON/IDs in normal UX.

---

## Preview

- Engine: `previewZielgruppeRecipients()` → `resolveCommunicationRecipients` (`PREVIEW`)
- On-demand only (not per keystroke)
- Copy distinguishes preview from guaranteed channel delivery (scope, consent COMM-17, safeguarding COMM-18)

---

## Usage visibility

`getZielgruppeUsageSummary()` — bounded, persisted references only:

- Kampagnen / Mitteilungen (`PlatformCommunication.audienceSpecJson`)
- Vorlagen (`PlatformCommunicationTemplate.audienceSpecJson`)
- Aufgaben (`RequirementDraftAudienceTargetGroup`)
- Anmeldungen (registration link count)

No historical inference from recomputed audience specs.

---

## History / edit semantics

Editing a Zielgruppe affects **future** dynamic resolution only. Published communications retain immutable recipient snapshots and analytics.

---

## Delete / archive

- Default removal: **ARCHIVE** (`status: ARCHIVED`) with confirmation in UI
- Permanent delete: existing `org.delete` hard-delete flow (registrations: `SetNull`)

---

## Consent & safeguarding boundaries

- Zielgruppe membership **≠** commercial consent (COMM-17 at delivery)
- Safeguarding/guardian substitution applies at dispatch (COMM-18), not in TargetGroup definition
- Subject remains the child in audience resolution

---

## Authorization

| Permission | Capability |
|------------|------------|
| `communication.zielgruppen.view` | List, detail, preview, person search |
| `communication.zielgruppen.manage` | Create, edit, archive |

Server: `/api/target-groups/*`, server actions, preview service enforce independently of UI.

---

## Responsive & accessibility

- Stacked wizard steps and rule sections on narrow viewports
- Searchable selector popovers with labels, `aria-expanded`, keyboard-focusable options
- Chip remove: `aria-label` per item
- Preview results: `role="status"` + `aria-live="polite"`

---

## Performance

- Overview: structural summaries only (no full resolve per row)
- Preview: explicit action
- Person/org/team/role search: debounced server actions
- Usage: capped lists (`MAX_COMMUNICATION_SCAN`, `MAX_LIST_ITEMS`)

---

## Schema

**No schema changes** in UX-06.

---

## Deferred

- Creator person display on TargetGroup (no `createdByUserId` on model today — timestamps only)
- Dynamisch/Statisch list filter (not a persisted canonical category)
- Sponsor selectors inside Zielgruppe rules (not in COMM-02 contract)

---

## Tests

- `app/(admin)/dashboard/communication/__tests__/comm-ux-06-zielgruppen.test.tsx`
- `lib/communication/zielgruppen/__tests__/human-readable-rules.test.ts`
- Regression: COMM-01, COMM-02, COMM-03, COMM-UX-04/05 suites
