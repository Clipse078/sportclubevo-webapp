-- SCE-CD-02R1 — Meetings 2.0 UX: people refs, initiative links, planned duration

ALTER TABLE "Meeting" ADD COLUMN "plannedDurationMin" INTEGER;

ALTER TABLE "MeetingAgendaItem" ADD COLUMN "ownerPersonId" TEXT;
ALTER TABLE "MeetingAgendaItem" ADD COLUMN "initiativeId" TEXT;

ALTER TABLE "MeetingDecision" ADD COLUMN "ownerPersonId" TEXT;
ALTER TABLE "MeetingAction" ADD COLUMN "ownerPersonId" TEXT;
ALTER TABLE "MeetingParticipant" ADD COLUMN "personId" TEXT;

CREATE INDEX "MeetingAgendaItem_initiativeId_idx" ON "MeetingAgendaItem"("initiativeId");

ALTER TABLE "MeetingAgendaItem" ADD CONSTRAINT "MeetingAgendaItem_initiativeId_fkey"
  FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE SET NULL ON UPDATE CASCADE;
