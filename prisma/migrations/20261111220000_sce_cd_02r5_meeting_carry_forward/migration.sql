-- SCE-CD-02R5 — carry-forward source link for agenda items
ALTER TABLE "MeetingAgendaItem" ADD COLUMN "sourceAgendaItemId" TEXT;

CREATE INDEX "MeetingAgendaItem_sourceAgendaItemId_idx" ON "MeetingAgendaItem"("sourceAgendaItemId");

ALTER TABLE "MeetingAgendaItem" ADD CONSTRAINT "MeetingAgendaItem_sourceAgendaItemId_fkey"
  FOREIGN KEY ("sourceAgendaItemId") REFERENCES "MeetingAgendaItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
