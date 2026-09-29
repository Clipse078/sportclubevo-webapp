# Requirement audience composition (SCE-SELECTOR-02R5)

## Product invariant

Structural Requirement audience selections are **recipient rules**. Only **Persons** are final acknowledgement recipients (`RequirementRecipient.subjectPersonId`).

Flow:

1. Author defines audience rules while requirement is `DRAFT` (live resolution).
2. Server resolves rules → deduplicated Person ids (preview + activation).
3. Activation creates immutable `RequirementRecipient` rows per Person.
4. Membership changes after activation do not alter historical recipients.

## Canonical engine

All entity discovery uses the shared SCE selector:

- `SceListSelectorPanel` / `useSceListSelectorQuery`
- `/api/sce/selector/discover` with closed `authContext=REQUIREMENT_AUDIENCE`
- Thin adapter: `SceRecipientSelector` + `RequirementAudienceBuilder`

No parallel person/team/org/role/target-group pickers for Requirements.

## Composition semantics

Stored in `Requirement.draftAudienceCompositionJson` (version 1):

- **Conditions** — ordered list with connectors `AND` | `OR` between items.
- **Exclude** — explicit Person ids subtracted after union.
- **Dedupe** — final Person id list is unique.

Legacy flat relational draft rows (person/team/org/role/targetGroup ids) map to **OR-of-singletons** when no composition JSON is present.

## AND/OR precedence

- Consecutive **UND** conditions form one segment; person sets inside a segment are **intersected**.
- **ODER** starts a new segment; segments are **unioned** (deduplicated).
- Example: `Trainer UND Kinderfussball ODER Sportleitung` → `(Trainer ∩ Kinderfussball) ∪ Sportleitung`.
- **Ausschluss** subtracts explicit Person ids after the union.

## Preview UX (UAT1)

- Structural chips show muted **Erweiterung** counts (input expansion hints).
- **Ergebnis** shows the server-resolved final Person count after UND/ODER, dedupe, and Ausschluss.
- Zero results show an explicit warning: nobody must confirm with the current combination.


## Relation to Communication / Zielgruppen

Communication uses `CommunicationAudienceSpec` (UNION components). Requirements reuse the same *idea* (structural rules → persons) but persist a simpler linear condition list suited to admin UX (UND/ODER), not the full Communication component model.

TargetGroup expansion uses the canonical `resolveTargetGroup` resolver via `requirement-audience-resolvers.ts`.
