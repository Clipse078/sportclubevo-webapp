const REQUIREMENT_ACTION_ID = /^requirement:([^:]+)$/;

export function parseRequirementPersonalActionId(
  personalActionId: string,
): { recipientId: string } | null {
  const match = REQUIREMENT_ACTION_ID.exec(personalActionId);
  if (!match) {
    return null;
  }
  return { recipientId: match[1] };
}
