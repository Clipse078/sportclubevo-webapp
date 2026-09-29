/**
 * SCE-ZIELGRUPPEN-02 — resolve external communication contacts from audience specs.
 */

import { prisma } from "@/lib/db/prisma";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import { normalizePeopleAccessEmail } from "@/lib/admin/people-access/email-normalize";
import { sortPersonIds } from "@/lib/communication/platform/recipient-resolution/set-algebra";

export async function resolveExternalContactIdsFromAudience(input: {
  tenantId: string;
  audience: CommunicationAudienceSpec;
}): Promise<string[]> {
  const includeIds = new Set<string>();
  const excludeIds = new Set<string>();

  for (const component of input.audience.components) {
    for (const id of component.external?.includeExternalContactIds ?? []) {
      if (id.trim()) includeIds.add(id.trim());
    }
    for (const id of component.external?.excludeExternalContactIds ?? []) {
      if (id.trim()) excludeIds.add(id.trim());
    }
  }

  for (const excluded of excludeIds) {
    includeIds.delete(excluded);
  }

  if (includeIds.size === 0) return [];

  const rows = await prisma.communicationExternalContact.findMany({
    where: {
      tenantId: input.tenantId,
      id: { in: [...includeIds] },
      status: "ACTIVE",
    },
    select: { id: true },
  });
  const active = rows.map((r) => r.id).filter((id) => !excludeIds.has(id));
  return active.sort();
}

export async function dedupeExternalContactsAgainstPersonEmails(input: {
  tenantId: string;
  personIds: readonly string[];
  externalContactIds: readonly string[];
}): Promise<string[]> {
  if (input.externalContactIds.length === 0) return [];

  const persons = await prisma.person.findMany({
    where: { tenantId: input.tenantId, id: { in: [...input.personIds] } },
    select: {
      email: true,
      user: { select: { email: true } },
    },
  });
  const personEmails = new Set<string>();
  for (const person of persons) {
    const direct = person.email?.trim();
    if (direct) personEmails.add(normalizePeopleAccessEmail(direct));
    const userEmail = person.user?.email?.trim();
    if (userEmail) personEmails.add(normalizePeopleAccessEmail(userEmail));
  }

  const externals = await prisma.communicationExternalContact.findMany({
    where: {
      tenantId: input.tenantId,
      id: { in: [...input.externalContactIds] },
      status: "ACTIVE",
    },
    select: { id: true, emailNormalized: true },
  });

  const kept = externals
    .filter((row) => !personEmails.has(row.emailNormalized))
    .map((row) => row.id);

  return kept.sort();
}

export async function loadPersonIdsMatchingExternalEmails(input: {
  tenantId: string;
  externalContactIds: readonly string[];
}): Promise<string[]> {
  if (input.externalContactIds.length === 0) return [];
  const externals = await prisma.communicationExternalContact.findMany({
    where: { tenantId: input.tenantId, id: { in: [...input.externalContactIds] } },
    select: { emailNormalized: true },
  });
  const emails = externals.map((e) => e.emailNormalized);
  if (emails.length === 0) return [];

  const persons = await prisma.person.findMany({
    where: {
      tenantId: input.tenantId,
      isActive: true,
      OR: [
        { email: { in: emails, mode: "insensitive" } },
        { user: { email: { in: emails, mode: "insensitive" } } },
      ],
    },
    select: { id: true },
  });
  return sortPersonIds(persons.map((p) => p.id));
}
