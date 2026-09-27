import type { PlatformCommunicationKind } from "@prisma/client";

/** Template kinds supported in COMM-16 (structured team types excluded). */
export const PLATFORM_COMMUNICATION_TEMPLATE_KINDS = [
  "CAMPAIGN",
  "MESSAGE",
  "ANNOUNCEMENT",
  "ALERT",
] as const satisfies readonly PlatformCommunicationKind[];

export type PlatformCommunicationTemplateKind =
  (typeof PLATFORM_COMMUNICATION_TEMPLATE_KINDS)[number];

export function isPlatformCommunicationTemplateKind(
  value: string,
): value is PlatformCommunicationTemplateKind {
  return (PLATFORM_COMMUNICATION_TEMPLATE_KINDS as readonly string[]).includes(value);
}
