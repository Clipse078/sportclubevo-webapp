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
- **AND binds tighter than OR** — segments of consecutive `AND`-connected conditions are intersected; segments are unioned.
- **Exclude** — explicit Person ids subtracted after union.
- **Dedupe** — final Person id list is unique.

Legacy flat relational draft rows (person/team/org/role/targetGroup ids) map to **OR-of-singletons** when no composition JSON is present.

## Relation to Communication / Zielgruppen

Communication uses `CommunicationAudienceSpec` (UNION components). Requirements reuse the same *idea* (structural rules → persons) but persist a simpler linear condition list suited to admin UX (UND/ODER), not the full Communication component model.

TargetGroup expansion uses the canonical `resolveTargetGroup` resolver via `requirement-audience-resolvers.ts`.
