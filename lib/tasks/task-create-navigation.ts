import type { TaskContextType } from "@prisma/client";

export function buildContextualTaskCreateHref(
  contextType: TaskContextType,
  contextId: string,
  extras?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams({
    contextType,
    contextId,
  });
  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      if (value?.trim()) params.set(key, value.trim());
    }
  }
  return `/dashboard/aufgaben/neu?${params.toString()}`;
}
