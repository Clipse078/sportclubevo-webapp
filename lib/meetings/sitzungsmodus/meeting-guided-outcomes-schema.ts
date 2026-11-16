/**
 * Durable outcome ↔ Traktandum relationships for guided meeting capture (ledger).
 *
 * | Outcome   | Storage                         | Traktandum link                         |
 * |-----------|---------------------------------|-----------------------------------------|
 * | Beschluss | MeetingDecision                 | sourceAgendaItemId (FK, indexed)        |
 * | Pendenz   | MeetingAction (Sitzungsmassnahme)| linkedRefs.agendaItemId (JSON, protocol)|
 * | Notiz     | MeetingAgendaItem.notes         | row id (same entity)                    |
 *
 * MeetingAction has no sourceAgendaItemId column; use linkedRefs per meeting-protocol-linked-refs.ts.
 * A future migration may add a formal FK mirroring MeetingDecision (AUFGABEN-04 / SCE-CD scope).
 */

export const MEETING_GUIDED_OUTCOMES_SCHEMA_NOTE =
  "Pendenz→Traktandum: MeetingAction.linkedRefs.agendaItemId (Json); Beschluss→Traktandum: MeetingDecision.sourceAgendaItemId." as const;