/**
 * SCE-ZIELGRUPPEN-02 — tenant-scoped external communication contacts.
 */

import { prisma } from "@/lib/db/prisma";
import {
  classifyCommunicationExternalEmail,
  normalizeCommunicationExternalContactEmail,
} from "@/lib/communication/external-contacts/external-contact-email";

export class CommunicationExternalContactError extends Error {
  constructor(
    message: string,
    readonly code: "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "FORBIDDEN" = "VALIDATION",
  ) {
    super(message);
    this.name = "CommunicationExternalContactError";
  }
}

export async function findOrCreateCommunicationExternalContact(input: {
  tenantId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  sourceKey?: string | null;
  createdByUserId?: string | null;
}) {
  const normalized = normalizeCommunicationExternalContactEmail(input.email);
  if (!normalized) {
    throw new CommunicationExternalContactError("Ungültige E-Mail-Adresse.", "VALIDATION");
  }

  const existing = await prisma.communicationExternalContact.findUnique({
    where: {
      tenantId_emailNormalized: { tenantId: input.tenantId, emailNormalized: normalized },
    },
  });
  if (existing) {
    if (existing.status === "ARCHIVED") {
      return prisma.communicationExternalContact.update({
        where: { id: existing.id },
        data: { status: "ACTIVE" },
      });
    }
    return existing;
  }

  return prisma.communicationExternalContact.create({
    data: {
      tenantId: input.tenantId,
      emailNormalized: normalized,
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName?.trim() || null,
      displayName: input.displayName?.trim() || null,
      sourceKey: input.sourceKey?.trim() || null,
      createdByUserId: input.createdByUserId ?? null,
    },
  });
}

export async function searchCommunicationExternalContacts(input: {
  tenantId: string;
  query: string;
  limit?: number;
}) {
  const term = input.query.trim();
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const rows = await prisma.communicationExternalContact.findMany({
    where: {
      tenantId: input.tenantId,
      status: "ACTIVE",
      ...(term.length >= 2
        ? {
            OR: [
              { emailNormalized: { contains: term.toLowerCase() } },
              { displayName: { contains: term, mode: "insensitive" } },
              { firstName: { contains: term, mode: "insensitive" } },
              { lastName: { contains: term, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { emailNormalized: "asc" },
    take: limit,
    select: {
      id: true,
      emailNormalized: true,
      displayName: true,
      firstName: true,
      lastName: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    label:
      row.displayName?.trim() ||
      `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() ||
      row.emailNormalized,
    description: row.emailNormalized,
  }));
}

export function validateExternalContactEmailForEntry(raw: string) {
  return classifyCommunicationExternalEmail(raw);
}
