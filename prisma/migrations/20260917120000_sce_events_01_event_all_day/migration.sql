-- SCE-EVENTS-01: genuine all-day semantics for Veranstaltungen (Event.type=OTHER).
ALTER TABLE "Event" ADD COLUMN "allDay" BOOLEAN NOT NULL DEFAULT false;
