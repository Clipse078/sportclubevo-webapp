-- Widen SCE public reference counters to signed BIGINT (64-bit) for values above INT32.

ALTER TABLE "ScePublicNumberSequence"
    ALTER COLUMN "nextNumber" SET DATA TYPE BIGINT USING "nextNumber"::BIGINT,
    ALTER COLUMN "nextNumber" SET DEFAULT 1;

ALTER TABLE "ScePublicNumberLedger"
    ALTER COLUMN "scePublicNumber" SET DATA TYPE BIGINT USING "scePublicNumber"::BIGINT;

ALTER TABLE "ClubStrategy"
    ALTER COLUMN "scePublicNumber" SET DATA TYPE BIGINT USING "scePublicNumber"::BIGINT;

ALTER TABLE "Target"
    ALTER COLUMN "scePublicNumber" SET DATA TYPE BIGINT USING "scePublicNumber"::BIGINT;

ALTER TABLE "Task"
    ALTER COLUMN "scePublicNumber" SET DATA TYPE BIGINT USING "scePublicNumber"::BIGINT;

ALTER TABLE "ClubMeldung"
    ALTER COLUMN "scePublicNumber" SET DATA TYPE BIGINT USING "scePublicNumber"::BIGINT;