-- SCE-TOURNAMENT-PLANNER-01H-R1 — persist composer generation preferences on competition configuration.

CREATE TYPE "TournamentFixtureHomeAwayRelevance" AS ENUM ('OFF', 'ON');

ALTER TABLE "TournamentCompetitionConfiguration"
  ADD COLUMN "fixtureHomeAwayRelevance" "TournamentFixtureHomeAwayRelevance" NOT NULL DEFAULT 'OFF',
  ADD COLUMN "roundRobinMeetingsPerOpponent" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "automaticGroupCount" INTEGER,
  ADD COLUMN "knockoutQualifiersPerGroup" INTEGER;
