-- SCE public reference foundation (global sequence for Strategie, Ziel, Aufgabe, Anliegen).

CREATE TABLE "ScePublicNumberSequence" (
    "id" TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "ScePublicNumberSequence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScePublicNumberLedger" (
    "scePublicNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScePublicNumberLedger_pkey" PRIMARY KEY ("scePublicNumber")
);

ALTER TABLE "ClubStrategy" ADD COLUMN "scePublicNumber" INTEGER;
ALTER TABLE "Target" ADD COLUMN "scePublicNumber" INTEGER;
ALTER TABLE "Task" ADD COLUMN "scePublicNumber" INTEGER;
ALTER TABLE "ClubMeldung" ADD COLUMN "scePublicNumber" INTEGER;

CREATE UNIQUE INDEX "ClubStrategy_scePublicNumber_key" ON "ClubStrategy"("scePublicNumber");
CREATE UNIQUE INDEX "Target_scePublicNumber_key" ON "Target"("scePublicNumber");
CREATE UNIQUE INDEX "Task_scePublicNumber_key" ON "Task"("scePublicNumber");
CREATE UNIQUE INDEX "ClubMeldung_scePublicNumber_key" ON "ClubMeldung"("scePublicNumber");