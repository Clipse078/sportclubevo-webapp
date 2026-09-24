import {
  getPersonallyRelevantTeamIds,
  resolvePersonalContext,
} from "@/lib/dashboard/personal-context";

export async function resolvePersonalTeamIds(args: {
  tenantId: string;
  userId: string | null | undefined;
}): Promise<{ teamIds: string[]; hasLinkedPerson: boolean }> {
  if (!args.userId) {
    return { teamIds: [], hasLinkedPerson: false };
  }

  const context = await resolvePersonalContext({
    tenantId: args.tenantId,
    userId: args.userId,
  });

  return {
    teamIds: getPersonallyRelevantTeamIds(context),
    hasLinkedPerson: context.hasLinkedPerson,
  };
}
