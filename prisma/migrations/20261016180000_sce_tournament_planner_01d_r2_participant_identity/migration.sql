-- SCE-TOURNAMENT-PLANNER-01D-R2 — allow multiple TournamentParticipants per canonical Team
-- within one tournament (tournament-local display names, e.g. Rot/Blau squads from same Team).

DROP INDEX IF EXISTS "TournamentParticipant_eventId_teamId_key";
