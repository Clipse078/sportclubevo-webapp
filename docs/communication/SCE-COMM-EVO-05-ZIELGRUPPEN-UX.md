# SCE-COMM-EVO-05 — Zielgruppen UX Rebuild

## Objective

Premium visual audience builder for club administrators on top of the **canonical** communication audience engine. EVO-05 does **not** introduce a second recipient engine, Zielgruppe model, or client-side recipient authority.

## Canonical stack

| Layer | Location |
| --- | --- |
| Persistence | `TargetGroup.ruleJson` v2 (`CommunicationAudienceSpec` + resolver clause) |
| Resolution | COMM-03 `resolveCommunicationRecipients` |
| Preview | `previewZielgruppeRecipients` / EVO-03 audience preview patterns |
| Human summary | `human-audience-summary.ts` + `human-readable-rules.ts` |

## Builder model

The UI edits a **semantic** `ZielgruppeEditorDefinition` (see `editor-model.ts`). Visual rule rows (`visual-rules.ts`) map to the same flat arrays the server already validates:

- **Einschliessen**: Organisationseinheit, Team, Rolle, Person, optional **Ganze Organisation**
- **Kombination**: `Alle Bedingungen` (= `INTERSECTION`) or `Mindestens eine Bedingung` (= `UNION`)
- **Ausschliessen**: structural NOT (OrgUnit, Team, Rolle) + explicit Person excludes

Nested boolean groups beyond one include group are **not** faked; the backend supports a single structural composition mode plus explicit excludes.

## AND / OR

| UI label | Backend |
| --- | --- |
| Alle Bedingungen | `compositionMode: INTERSECTION` on structural leaves |
| Mindestens eine Bedingung | `compositionMode: UNION` |

## Include / exclude precedence

Exclusions always win: a person matching include and exclude is **excluded**. The builder states this in the Ausschliessen section help text. Resolution is server-side only.

## Live preview

`ZielgruppePreviewPanel` debounces (~450ms) calls to `previewZielgruppeRecipientsAction`, which uses COMM-03 in `PREVIEW` mode. Shows effective count and a bounded name sample subject to sender scope.

## Dynamic membership

Copy: *Die Mitglieder dieser Zielgruppe werden beim Versand anhand der aktuellen Vereinsdaten ermittelt.* Historical sends keep snapshot recipients (COMM-12 / dispatch snapshots).

## Scheduled communication (COMM-16)

Campaigns scheduled with a Zielgruppe resolve membership **at execution time** unless a snapshot was frozen at schedule time. Editing a Zielgruppe before execution changes who receives the next run.

## Safeguarding & consent

- COMM-18 guardian expansion remains delivery-time policy; preview may show scope notices.
- COMM-17 consent is **not** stored in TargetGroup rules; membership ≠ marketing consent.

## Authorization & security

- Manage Zielgruppen (`COMMUNICATION_ZIELGRUPPEN_MANAGE`) vs communicate scope stay separate.
- Server validates tenant ownership of OrgUnit, Team, Person, Role IDs; forged role keys are rejected on save.
- Preview respects permission scope (no directory bypass).

## Legacy compatibility

- v2 rule documents round-trip through `rule-mapper.ts`.
- v1 `TargetGroupClause` trees use `legacyClauseToEditorDefinition` (best-effort); unsupported shapes should block with explanation rather than silent loss.

## Overview actions

List: name, human summary, usage reference count (bounded scan), status, **Öffnen / Bearbeiten / Duplizieren**. Archive via detail actions (soft `ARCHIVED` status).

## Duplicate

`POST /api/target-groups/:id/duplicate` — copies name (default `Kopie von …`), description, and rules; new key; no usage or timestamps.

## Examples (canonical)

| Intent | Include | Mode | Exclude |
| --- | --- | --- | --- |
| Alle Trainer der Junioren | OrgUnit Junioren + Rolle Trainer | Alle Bedingungen | — |
| Junioren F oder E | Team F1, Team F2 | Mindestens eine Bedingung | — |
| Alle ausser Vorstand | Ganze Organisation | — | Rolle Vorstand |
| Junioren F ohne Team F2 | OrgUnit / Team F1 | — | Team F2 |

## Mobile & a11y

Rule rows stack as cards; composition uses radio labels with help text; preview collapses below builder on small screens; remove buttons are keyboard reachable.
