-- SCE-CD-03 — Connected Club Development (Task context types for Beschluss & Initiative)

ALTER TYPE "TaskContextType" ADD VALUE IF NOT EXISTS 'MEETING_DECISION';
ALTER TYPE "TaskContextType" ADD VALUE IF NOT EXISTS 'INITIATIVE';
