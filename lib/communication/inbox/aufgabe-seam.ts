/**
 * SCE-COMM-15 — seam for future Email → Aufgabe actions (AUFGABEN domain owns tasks).
 */
export type CommunicationCenterAufgabeSeamReference = {
  tenantId: string;
  conversationId: string;
  messageId?: string | null;
  sourceLabel: "COMMUNICATION_CENTER_INBOX";
};

export function buildCommunicationCenterAufgabeSeamReference(input: {
  tenantId: string;
  conversationId: string;
  messageId?: string | null;
}): CommunicationCenterAufgabeSeamReference {
  return {
    tenantId: input.tenantId,
    conversationId: input.conversationId,
    messageId: input.messageId ?? null,
    sourceLabel: "COMMUNICATION_CENTER_INBOX",
  };
}
