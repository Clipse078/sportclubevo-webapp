-- Ensure WAITING exists on TaskStatus (enum append cannot run in a Prisma transaction).
CREATE OR REPLACE FUNCTION sce_cd_add_task_status_waiting() RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'TaskStatus'
      AND e.enumlabel = 'WAITING'
  ) THEN
    ALTER TYPE "TaskStatus" ADD VALUE 'WAITING';
  END IF;
END;
$$;

SELECT sce_cd_add_task_status_waiting();
DROP FUNCTION sce_cd_add_task_status_waiting();