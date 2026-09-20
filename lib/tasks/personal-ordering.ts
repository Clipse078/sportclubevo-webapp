import { TaskStatus } from "@prisma/client";

export type PersonalOrderableTask = {
  id: string;
  dueAt: string | null;
  status: TaskStatus;
  createdAt: string;
  priority: string;
};

type UrgencyBucket = 0 | 1 | 2 | 3;

/**
 * Operational ordering for personal work:
 * 1 overdue → 2 due today/soon → 3 upcoming with deadline → 4 no deadline
 */
export function getPersonalTaskUrgencyBucket(
  task: PersonalOrderableTask,
  now: Date = new Date(),
): UrgencyBucket {
  if (
    task.status === TaskStatus.DONE ||
    task.status === TaskStatus.CANCELLED ||
    !task.dueAt
  ) {
    return task.dueAt ? 3 : 4;
  }

  const due = new Date(task.dueAt);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  if (due < startOfToday) return 0;
  if (due <= endOfToday) return 1;

  const soonLimit = new Date(endOfToday);
  soonLimit.setDate(soonLimit.getDate() + 3);
  if (due <= soonLimit) return 2;

  return 3;
}

export function comparePersonalTasks(
  a: PersonalOrderableTask,
  b: PersonalOrderableTask,
  now: Date = new Date(),
): number {
  const bucketDiff =
    getPersonalTaskUrgencyBucket(a, now) - getPersonalTaskUrgencyBucket(b, now);
  if (bucketDiff !== 0) return bucketDiff;

  if (a.dueAt && b.dueAt) {
    const dueDiff = new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    if (dueDiff !== 0) return dueDiff;
  } else if (a.dueAt && !b.dueAt) {
    return -1;
  } else if (!a.dueAt && b.dueAt) {
    return 1;
  }

  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

export function sortPersonalTasks<T extends PersonalOrderableTask>(
  tasks: T[],
  now: Date = new Date(),
): T[] {
  return [...tasks].sort((a, b) => comparePersonalTasks(a, b, now));
}
