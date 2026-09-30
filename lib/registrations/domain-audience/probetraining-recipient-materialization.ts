/**
 * SCE-PROBETRAINING-COMM-01 — map Probetraining registrations to canonical audience components.
 *
 * Linked persons → explicit Person ids (COMM-03 + COMM-17/18).
 * Unlinked adults → tenant external contacts (ZIELGRUPPEN-02).
 * Unlinked minors → guardian payload email only; never raw child registration email.
 */

import type { Registration } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { findOrCreateCommunicationExternalContact } from "@/lib/communication/external-contacts/external-contact-service";
import { getRegistrationDetailFields } from "@/lib/registrations/detail-view";
import { resolveRegistrationBirthYear } from "@/lib/registrations/birth-year";
import type { ZielgruppeAudienceComponent } from "@/lib/communication/platform/audience/zielgruppe-definition";

const MINOR_AGE_THRESHOLD_YEARS = 18;

type RegistrationRow = Pick<
  Registration,
  | "id"
  | "tenantId"
  | "personId"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "message"
  | "source"
  | "birthYear"
  | "birthDate"
  | "payloadJson"
  | "submittedAt"
> & {
  person?: { dateOfBirth: Date | null } | null;
};

function isApplicantMinor(registration: RegistrationRow): boolean {
  const birthYear = resolveRegistrationBirthYear(
    {
      birthYear: registration.birthYear,
      birthDate: registration.birthDate?.toISOString() ?? null,
      payloadJson: registration.payloadJson,
    },
    undefined,
    registration.person?.dateOfBirth?.toISOString() ?? null,
  );
  if (birthYear == null) return false;
  const age = new Date().getFullYear() - birthYear;
  return age < MINOR_AGE_THRESHOLD_YEARS;
}

async function externalContactForUnlinkedRegistration(
  registration: RegistrationRow,
  senderUserId: string,
): Promise<string | null> {
  if (registration.personId) return null;

  const fields = getRegistrationDetailFields({
    id: registration.id,
    firstName: registration.firstName,
    lastName: registration.lastName,
    email: registration.email,
    phone: registration.phone,
    message: registration.message,
    source: registration.source,
    birthYear: registration.birthYear,
    birthDate: registration.birthDate?.toISOString() ?? null,
    payloadJson: registration.payloadJson,
    submittedAt: registration.submittedAt.toISOString(),
  });
  const minor = isApplicantMinor(registration);

  if (minor) {
    const guardianEmail = fields.parent?.email?.trim();
    if (!guardianEmail) {
      return null;
    }
    const contact = await findOrCreateCommunicationExternalContact({
      tenantId: registration.tenantId,
      email: guardianEmail,
      displayName: fields.parent?.name ?? null,
      sourceKey: "probetraining.guardian",
      createdByUserId: senderUserId,
    });
    return contact.id;
  }

  const contact = await findOrCreateCommunicationExternalContact({
    tenantId: registration.tenantId,
    email: registration.email,
    firstName: registration.firstName,
    lastName: registration.lastName,
    sourceKey: "probetraining.applicant",
    createdByUserId: senderUserId,
  });
  return contact.id;
}

export async function materializeProbetrainingRegistrationsToAudienceComponent(input: {
  tenantId: string;
  senderUserId: string;
  registrations: RegistrationRow[];
}): Promise<ZielgruppeAudienceComponent> {
  const personIds: string[] = [];
  const externalContactIds: string[] = [];

  for (const registration of input.registrations) {
    if (registration.tenantId !== input.tenantId) {
      continue;
    }
    if (registration.personId) {
      personIds.push(registration.personId);
      continue;
    }
    const externalId = await externalContactForUnlinkedRegistration(
      registration,
      input.senderUserId,
    );
    if (externalId) {
      externalContactIds.push(externalId);
    }
  }

  const uniquePersonIds = [...new Set(personIds)].sort();
  const uniqueExternalIds = [...new Set(externalContactIds)].sort();

  const component: ZielgruppeAudienceComponent = {};
  if (uniquePersonIds.length > 0) {
    component.explicit = { includePersonIds: uniquePersonIds };
  }
  if (uniqueExternalIds.length > 0) {
    component.external = { includeExternalContactIds: uniqueExternalIds };
  }

  if (!component.explicit && !component.external) {
    throw new Error("Keine adressierbaren Empfänger für diese Probetraining-Gruppe gefunden.");
  }

  return component;
}

export async function loadProbetrainingRegistrationsForCandidate(input: {
  tenantId: string;
  statuses: readonly import("@prisma/client").RegistrationStatus[];
}): Promise<RegistrationRow[]> {
  return prisma.registration.findMany({
    where: {
      tenantId: input.tenantId,
      type: "PROBETRAINING",
      status: { in: [...input.statuses] },
    },
    select: {
      id: true,
      tenantId: true,
      personId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      message: true,
      source: true,
      birthYear: true,
      birthDate: true,
      payloadJson: true,
      submittedAt: true,
      person: { select: { dateOfBirth: true } },
    },
    orderBy: [{ submittedAt: "desc" }, { id: "asc" }],
    take: 5000,
  });
}
