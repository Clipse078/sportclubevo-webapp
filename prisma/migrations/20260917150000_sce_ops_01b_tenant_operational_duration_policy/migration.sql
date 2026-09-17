-- SCE-OPS-01B: extend tenant operational duration policy with TRAINING and TOURNAMENT defaults.
-- Additive only; preserves existing Match duration rows from SCE-OPS-01A.

ALTER TABLE "TenantMatchOperationalPolicy"
ADD COLUMN "defaultTrainingDurationMinutes" INTEGER,
ADD COLUMN "defaultTournamentDurationMinutes" INTEGER;
