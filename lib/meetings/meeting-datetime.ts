/**
 * Canonical meeting wall-clock ↔ UTC conversion.
 *
 * Meetings use the same tenant IANA timezone contract as Events/Tournaments
 * (`lib/events/tenant-local-datetime.ts`). HTML `datetime-local` values are
 * tenant-local; persisted `Meeting.meetingDate` is a UTC instant.
 */

import { prisma } from "@/lib/db/prisma";
import {
  parseTenantLocalDateTimeInput,
  resolveTenantEventTimezone,
  utcInstantToDateTimeLocalValue,
} from "@/lib/events/tenant-local-datetime";

export { resolveTenantEventTimezone as resolveMeetingTenantTimezone };

export async function loadMeetingTenantTimezone(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { timezone: true },
  });
  return resolveTenantEventTimezone(tenant?.timezone);
}

export function formatMeetingDateTimeLocalValue(
  instant: Date | string | null | undefined,
  timeZone: string,
): string {
  return utcInstantToDateTimeLocalValue(instant, timeZone);
}

export function parseMeetingDateTimeInput(
  raw: string,
  timeZone: string,
): Date | null {
  return parseTenantLocalDateTimeInput(raw, timeZone);
}

/**
 * True when the submitted datetime-local label maps to the same UTC instant.
 * Used to reject ambiguous DST gap times where the library would shift wall clock.
 */
export function meetingDateTimeLocalRoundTrips(
  raw: string,
  instant: Date,
  timeZone: string,
): boolean {
  return utcInstantToDateTimeLocalValue(instant, timeZone) === raw.trim();
}