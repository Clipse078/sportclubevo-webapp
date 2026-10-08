-- SCE-PLANNER-UX-08-08A: prevent silent cascade removal of facility allocation history
-- when a FacilityResource is deleted. Forward-safe: existing rows unchanged.

ALTER TABLE "TrainingAllocation" DROP CONSTRAINT "TrainingAllocation_facilityResourceId_fkey";
ALTER TABLE "TrainingAllocation" ADD CONSTRAINT "TrainingAllocation_facilityResourceId_fkey"
  FOREIGN KEY ("facilityResourceId") REFERENCES "FacilityResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TrainingSessionAllocation" DROP CONSTRAINT "TrainingSessionAllocation_facilityResourceId_fkey";
ALTER TABLE "TrainingSessionAllocation" ADD CONSTRAINT "TrainingSessionAllocation_facilityResourceId_fkey"
  FOREIGN KEY ("facilityResourceId") REFERENCES "FacilityResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TournamentResourceAllocation" DROP CONSTRAINT "TournamentResourceAllocation_facilityResourceId_fkey";
ALTER TABLE "TournamentResourceAllocation" ADD CONSTRAINT "TournamentResourceAllocation_facilityResourceId_fkey"
  FOREIGN KEY ("facilityResourceId") REFERENCES "FacilityResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TournamentParticipantAllocation" DROP CONSTRAINT "TournamentParticipantAllocation_facilityResourceId_fkey";
ALTER TABLE "TournamentParticipantAllocation" ADD CONSTRAINT "TournamentParticipantAllocation_facilityResourceId_fkey"
  FOREIGN KEY ("facilityResourceId") REFERENCES "FacilityResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EventFacilityAllocation" DROP CONSTRAINT "EventFacilityAllocation_facilityResourceId_fkey";
ALTER TABLE "EventFacilityAllocation" ADD CONSTRAINT "EventFacilityAllocation_facilityResourceId_fkey"
  FOREIGN KEY ("facilityResourceId") REFERENCES "FacilityResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WeekplannerPlanAllocation" DROP CONSTRAINT "WeekplannerPlanAllocation_facilityResourceId_fkey";
ALTER TABLE "WeekplannerPlanAllocation" ADD CONSTRAINT "WeekplannerPlanAllocation_facilityResourceId_fkey"
  FOREIGN KEY ("facilityResourceId") REFERENCES "FacilityResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
