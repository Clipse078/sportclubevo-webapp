import { CD_STRATEGY_AUTHORING_COPY } from "./product-copy";

/** Client-safe label for Ziel «Verantwortlich» (assignee only). */
export function formatTargetResponsiblePresentation(label: string | null | undefined): string {
  const trimmed = label?.trim();
  if (trimmed) return trimmed;
  return CD_STRATEGY_AUTHORING_COPY.unassignedResponsible;
}