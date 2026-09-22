# AUFGABEN-06G1 — Requirements foundation

## Boundaries

| Concept | Role |
| --- | --- |
| **Task** | Collaborative operational work — one shared task state |
| **Requirement** | Individual obligation campaign — N independent `RequirementRecipient` rows |
| **Domain obligation** | Canonical domain records (`ParticipationResponse`, `AttendanceRecord`, `Registration`, …) — never duplicated as recipients |
| **PersonalAction** | Non-persisted derived inbox — Requirement adapter arrives in 06G3 |

## Identity

- **Subject** — `RequirementRecipient.subjectPersonId` (the Person who owes the obligation)
- **Actor (User)** — `respondedByUserId` (authenticated user executing the response)
- **Actor (Person)** — `responseActorPersonId` when resolvable (self or guardian)

## Audience

While **DRAFT**, explicit Person IDs are stored relationally in `RequirementDraftAudiencePerson`.

On **activation**, exactly one `RequirementRecipient` is created per Person (deduplicated). Recipient rows are the authoritative audience snapshot; draft rows are removed. Active audience is frozen in 06G1.

## Authorization

Dedicated capabilities (`requirements.view`, `requirements.create`, `requirements.manage`, `requirements.view_aggregate`) are independent from `tasks.*`. Recipients respond via relationship authorization (self/guardian), not management capabilities.

Creator identity (`createdByUserId`) does **not** bypass capability checks.
