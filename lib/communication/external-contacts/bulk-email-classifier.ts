/**
 * SCE-ZIELGRUPPEN-02 — review classification for bulk external email entry.
 */

import { prisma } from "@/lib/db/prisma";
import { classifyCommunicationExternalEmail } from "@/lib/communication/external-contacts/external-contact-email";
import { normalizePeopleAccessEmail } from "@/lib/admin/people-access/email-normalize";

export type BulkEmailReviewState =
  | "EXISTING_PERSON"
  | "EXISTING_EXTERNAL"
  | "NEW_EXTERNAL"
  | "INVALID"
  | "POSSIBLE_TYPO";

export type BulkEmailReviewRow = {
  raw: string;
  normalized: string | null;
  state: BulkEmailReviewState;
  personId?: string;
  externalContactId?: string;
  suggestion?: string;
  message?: string;
};

export async function classifyBulkEmailEntries(input: {
  tenantId: string;
  entries: readonly string[];
}): Promise<BulkEmailReviewRow[]> {
  const rows: BulkEmailReviewRow[] = [];

  for (const raw of input.entries) {
    const classified = classifyCommunicationExternalEmail(raw);
    if (!classified.ok) {
      rows.push({
        raw,
        normalized: classified.normalized || null,
        state: classified.suggestion ? "POSSIBLE_TYPO" : "INVALID",
        suggestion: classified.suggestion,
        message: classified.message,
      });
      continue;
    }

    const normalized = classified.normalized;
    const emailNorm = normalizePeopleAccessEmail(normalized);

    const person = await prisma.person.findFirst({
      where: {
        tenantId: input.tenantId,
        isActive: true,
        OR: [
          { email: { equals: normalized, mode: "insensitive" } },
          { user: { email: { equals: normalized, mode: "insensitive" } } },
        ],
      },
      select: { id: true },
    });
    if (person) {
      rows.push({
        raw,
        normalized,
        state: "EXISTING_PERSON",
        personId: person.id,
      });
      continue;
    }

    const external = await prisma.communicationExternalContact.findFirst({
      where: { tenantId: input.tenantId, emailNormalized: emailNorm, status: "ACTIVE" },
      select: { id: true },
    });
    if (external) {
      rows.push({
        raw,
        normalized,
        state: "EXISTING_EXTERNAL",
        externalContactId: external.id,
      });
      continue;
    }

    rows.push({
      raw,
      normalized,
      state: "NEW_EXTERNAL",
    });
  }

  return rows;
}
