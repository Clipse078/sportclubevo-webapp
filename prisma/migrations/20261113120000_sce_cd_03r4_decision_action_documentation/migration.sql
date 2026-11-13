-- SCE-CD-03R4 — Beschluss Begründung + Massnahme documentation (additive, nullable).

ALTER TABLE "MeetingDecision" ADD COLUMN IF NOT EXISTS "rationale" TEXT;

ALTER TABLE "MeetingAction" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "MeetingAction" ADD COLUMN IF NOT EXISTS "expectedOutcome" TEXT;
