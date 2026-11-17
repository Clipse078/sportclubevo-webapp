import type { MeetingStatus } from "@prisma/client";

export function shouldOfferGuidedSitzungsmodusSummary(input: {
  canManage: boolean;
  hasTimerScope: boolean;
  agendaCount: number;
  status: MeetingStatus;
}): boolean {
  if (!input.canManage || !input.hasTimerScope || input.agendaCount === 0) return false;
  return input.status !== "CANCELLED" && input.status !== "COMPLETED";
}