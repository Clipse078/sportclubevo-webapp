-- PR #1017 — Vereinsentwicklung workflow status «Wartet» (additive enum value).
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'WAITING';