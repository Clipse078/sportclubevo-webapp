/**
 * SCE-BILLING-FCA-01 — STAGE FC Allschwil contract invoice recipient profile linkage.
 *
 * Idempotently ensures a canonical BillingProfile exists and links FCA-2026-001.
 * Does not mutate finalized invoices, payment instructions, or delivery state.
 */

import type { PrismaClient } from "@prisma/client";
import { resolveInvoiceRecipientProfileForContract } from "@/lib/billing/invoice-recipient-profile-resolution";
import { updateBillingContract } from "@/lib/billing/native-billing-commercial-service";
import { createBillingProfile } from "@/lib/billing/native-billing-service";
import {
  PROTECTED_FCA_CONTRACT_NUMBER,
  PROTECTED_FCA_CUSTOMER_KEY,
  PROTECTED_FCA_INVOICE_ACTIVE_NUMBER,
  STAGE_CANONICAL_DATABASE_FINGERPRINT,
} from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import type { BillingProfileRecord } from "@/lib/billing/native-billing-types";
import {
  evaluateOperationalMutationGuard,
  assertOperationalMutationAllowed,
} from "@/lib/server/operational-database-guard";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
  requireBillingDataEnvironment,
} from "@/lib/server/runtime-identity";
import { getRuntimeEnvironment } from "@/lib/env";

export const OPERATION_ID = "sce-billing-fca-01-recipient-profile";
export const EXECUTE_CONFIRMATION = "SCE-BILLING-FCA-01-RECIPIENT-PROFILE";
export const FCA_DEFAULT_LANGUAGE = "de-CH";

export type FcaCanonicalRecipientSpec = {
  companyOrName: string;
  street: string;
  houseNumber: string | null;
  postalCode: string;
  city: string;
  countryCode: string;
  invoiceEmail: string;
};

export const FCA_CANONICAL_RECIPIENT_SPEC: FcaCanonicalRecipientSpec = {
  companyOrName: "FC Allschwil",
  street: "Hegenheimermattweg",
  houseNumber: "130",
  postalCode: "4123",
  city: "Allschwil",
  countryCode: "CH",
  invoiceEmail: "finanzen@fcallschwil.ch",
};

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function recipientProfileMatchesCanonical(
  profile: Pick<
    BillingProfileRecord,
    | "profileType"
    | "companyOrName"
    | "street"
    | "houseNumber"
    | "postalCode"
    | "city"
    | "countryCode"
    | "invoiceEmail"
  >,
  spec: FcaCanonicalRecipientSpec = FCA_CANONICAL_RECIPIENT_SPEC,
): boolean {
  if (profile.profileType !== "BILLING") return false;
  return (
    normalizeText(profile.companyOrName).localeCompare(spec.companyOrName, "de") === 0 &&
    normalizeText(profile.street).localeCompare(spec.street, "de") === 0 &&
    normalizeText(profile.houseNumber) === normalizeText(spec.houseNumber) &&
    normalizeText(profile.postalCode) === spec.postalCode &&
    normalizeText(profile.city).localeCompare(spec.city, "de") === 0 &&
    normalizeText(profile.countryCode).toUpperCase() === spec.countryCode &&
    normalizeEmail(profile.invoiceEmail) === normalizeEmail(spec.invoiceEmail)
  );
}

export function selectCanonicalRecipientProfile(
  profiles: BillingProfileRecord[],
  spec: FcaCanonicalRecipientSpec = FCA_CANONICAL_RECIPIENT_SPEC,
): BillingProfileRecord | null {
  const matches = profiles.filter((p) => recipientProfileMatchesCanonical(p, spec));
  if (matches.length > 1) {
    throw new Error(
      `Multiple canonical invoice recipient profiles found for ${spec.invoiceEmail}.`,
    );
  }
  return matches[0] ?? null;
}

export type FcaInvoiceIntegritySnapshot = {
  invoiceNumber: string;
  status: string;
  invoiceDate: string | null;
  dueDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  netTotalMinor: number;
  vatTotalMinor: number;
  grossTotalMinor: number;
  paidTotalMinor: number;
  outstandingMinor: number;
  recipient: {
    companyOrName: string;
    street: string;
    houseNumber: string | null;
    postalCode: string;
    city: string;
    countryCode: string;
    invoiceEmail: string | null;
  } | null;
  paymentInstruction: {
    reference: string | null;
    amountMinor: number;
    currency: string;
  } | null;
  deliveryStatuses: string[];
  updatedAt: string;
};

export type FcaLinkageInventory = {
  customerKey: string;
  customerId: string;
  contractKey: string;
  contractNumber: string;
  invoiceRecipientProfileIdBefore: string | null;
  profiles: BillingProfileRecord[];
  canonicalProfileId: string | null;
  invoiceIntegrity: FcaInvoiceIntegritySnapshot | null;
  defaultLanguage: string | null;
};

export type FcaLinkageResult = {
  inventory: FcaLinkageInventory;
  profileId: string;
  profileReused: boolean;
  contractLinked: boolean;
  invoiceRecipientProfileIdAfter: string;
  invoiceIntegrityUnchanged: boolean;
  defaultLanguageUpdated: boolean;
};

function dateOnlyIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export async function loadFcaActiveInvoiceIntegritySnapshot(
  prisma: PrismaClient,
  invoiceNumber: string = PROTECTED_FCA_INVOICE_ACTIVE_NUMBER,
): Promise<FcaInvoiceIntegritySnapshot | null> {
  const invoice = await prisma.invoice.findFirst({
    where: { invoiceNumber },
    select: {
      invoiceNumber: true,
      status: true,
      invoiceDate: true,
      dueDate: true,
      periodStart: true,
      periodEnd: true,
      netTotalMinor: true,
      vatTotalMinor: true,
      grossTotalMinor: true,
      updatedAt: true,
      recipientSnapshot: {
        select: {
          companyOrName: true,
          street: true,
          houseNumber: true,
          postalCode: true,
          city: true,
          countryCode: true,
          invoiceEmail: true,
        },
      },
      paymentInstruction: {
        select: {
          reference: true,
          amountMinor: true,
          currency: true,
        },
      },
      deliveries: { select: { status: true } },
      payments: { select: { amountMinor: true, status: true } },
    },
  });
  if (!invoice?.invoiceNumber) return null;

  const paidTotalMinor = invoice.payments
    .filter((p) => p.status === "CONFIRMED")
    .reduce((sum, p) => sum + p.amountMinor, 0);
  const outstandingMinor = Math.max(invoice.grossTotalMinor - paidTotalMinor, 0);

  return {
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    invoiceDate: dateOnlyIso(invoice.invoiceDate),
    dueDate: dateOnlyIso(invoice.dueDate),
    periodStart: dateOnlyIso(invoice.periodStart),
    periodEnd: dateOnlyIso(invoice.periodEnd),
    netTotalMinor: invoice.netTotalMinor,
    vatTotalMinor: invoice.vatTotalMinor,
    grossTotalMinor: invoice.grossTotalMinor,
    paidTotalMinor,
    outstandingMinor,
    recipient: invoice.recipientSnapshot,
    paymentInstruction: invoice.paymentInstruction,
    deliveryStatuses: invoice.deliveries.map((d) => d.status),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

export function invoiceIntegritySnapshotsEqual(
  before: FcaInvoiceIntegritySnapshot | null,
  after: FcaInvoiceIntegritySnapshot | null,
): boolean {
  if (!before || !after) return before === after;
  return JSON.stringify(before) === JSON.stringify(after);
}

export async function collectFcaRecipientLinkageInventory(
  prisma: PrismaClient,
): Promise<FcaLinkageInventory> {
  const customer = await prisma.billingCustomer.findUnique({
    where: { key: PROTECTED_FCA_CUSTOMER_KEY },
    select: {
      id: true,
      key: true,
      defaultLanguage: true,
      profiles: true,
    },
  });
  if (!customer) {
    throw new Error(`Protected FCA billing customer ${PROTECTED_FCA_CUSTOMER_KEY} not found.`);
  }

  const contract = await prisma.billingContract.findFirst({
    where: {
      billingCustomerId: customer.id,
      contractNumber: PROTECTED_FCA_CONTRACT_NUMBER,
    },
    select: {
      key: true,
      contractNumber: true,
      invoiceRecipientProfileId: true,
    },
  });
  if (!contract) {
    throw new Error(`Protected FCA contract ${PROTECTED_FCA_CONTRACT_NUMBER} not found.`);
  }

  const canonicalProfileId =
    selectCanonicalRecipientProfile(customer.profiles)?.id ?? null;
  const invoiceIntegrity = await loadFcaActiveInvoiceIntegritySnapshot(prisma);

  return {
    customerKey: customer.key,
    customerId: customer.id,
    contractKey: contract.key,
    contractNumber: contract.contractNumber,
    invoiceRecipientProfileIdBefore: contract.invoiceRecipientProfileId,
    profiles: customer.profiles,
    canonicalProfileId,
    invoiceIntegrity,
    defaultLanguage: customer.defaultLanguage,
  };
}

export type FcaLinkageExecuteInput = {
  actorUserId: string;
  spec?: FcaCanonicalRecipientSpec;
};

export async function applyFcaRecipientProfileLinkage(
  prisma: PrismaClient,
  inventoryBefore: FcaLinkageInventory,
  input: FcaLinkageExecuteInput,
): Promise<FcaLinkageResult> {
  const spec = input.spec ?? FCA_CANONICAL_RECIPIENT_SPEC;
  const invoiceBefore = inventoryBefore.invoiceIntegrity;

  let profile = selectCanonicalRecipientProfile(inventoryBefore.profiles, spec);
  let profileReused = Boolean(profile);

  if (!profile) {
    profile = await createBillingProfile({
      customerKey: inventoryBefore.customerKey,
      profileType: "BILLING",
      companyOrName: spec.companyOrName,
      street: spec.street,
      houseNumber: spec.houseNumber,
      postalCode: spec.postalCode,
      city: spec.city,
      countryCode: spec.countryCode,
      invoiceEmail: spec.invoiceEmail,
      actorUserId: input.actorUserId,
    });
    profileReused = false;
  }

  let contractLinked = false;
  let invoiceRecipientProfileIdAfter =
    inventoryBefore.invoiceRecipientProfileIdBefore ?? profile.id;

  if (inventoryBefore.invoiceRecipientProfileIdBefore !== profile.id) {
    const updated = await updateBillingContract({
      contractKey: inventoryBefore.contractKey,
      invoiceRecipientProfileId: profile.id,
      actorUserId: input.actorUserId,
    });
    contractLinked = true;
    invoiceRecipientProfileIdAfter = updated.invoiceRecipientProfileId ?? profile.id;
  }

  let defaultLanguageUpdated = false;
  if (!inventoryBefore.defaultLanguage) {
    await prisma.billingCustomer.update({
      where: { id: inventoryBefore.customerId },
      data: { defaultLanguage: FCA_DEFAULT_LANGUAGE },
    });
    defaultLanguageUpdated = true;
  }

  const invoiceAfter = await loadFcaActiveInvoiceIntegritySnapshot(prisma);
  const invoiceIntegrityUnchanged = invoiceIntegritySnapshotsEqual(
    invoiceBefore,
    invoiceAfter,
  );
  if (!invoiceIntegrityUnchanged) {
    throw new Error(
      "FCA invoice integrity check failed after linkage — aborting (invoice snapshot mutated).",
    );
  }

  const contractRow = await prisma.billingContract.findUnique({
    where: { key: inventoryBefore.contractKey },
    select: { id: true },
  });
  if (!contractRow) {
    throw new Error("FCA contract missing after linkage.");
  }

  const resolved = await resolveInvoiceRecipientProfileForContract({
    billingCustomerId: inventoryBefore.customerId,
    billingContractId: contractRow.id,
  });

  if (!resolved || !recipientProfileMatchesCanonical(resolved, spec)) {
    throw new Error("Post-linkage recipient resolution does not match canonical FCA profile.");
  }

  return {
    inventory: inventoryBefore,
    profileId: profile.id,
    profileReused,
    contractLinked,
    invoiceRecipientProfileIdAfter,
    invoiceIntegrityUnchanged,
    defaultLanguageUpdated,
  };
}

export async function executeFcaRecipientProfileLinkage(
  prisma: PrismaClient,
  input: FcaLinkageExecuteInput,
): Promise<FcaLinkageResult> {
  const inventoryBefore = await collectFcaRecipientLinkageInventory(prisma);
  return applyFcaRecipientProfileLinkage(prisma, inventoryBefore, input);
}

export function expectedOperationAuthorization(env: NodeJS.ProcessEnv): string {
  const runtime = getRuntimeEnvironment({
    ...env,
    NODE_ENV: env.NODE_ENV ?? "development",
    APP_ENV: env.APP_ENV ?? "local",
  });
  return `${OPERATION_ID}:${runtime.appEnv}`;
}

export function assertFcaLinkageStageIdentityReadOnly(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const runtime = getRuntimeEnvironment({
    ...env,
    NODE_ENV: env.NODE_ENV ?? "development",
    APP_ENV: env.APP_ENV ?? "local",
  });
  if (!runtime.isStage) {
    throw new Error(
      `STAGE identity required: APP_ENV must be "stage" (got ${runtime.appEnv}).`,
    );
  }
  requireBillingDataEnvironment("STAGE", env);
  const fp = getDatabaseFingerprintFromEffectivePrismaSource(env);
  if (fp?.toLowerCase() !== STAGE_CANONICAL_DATABASE_FINGERPRINT) {
    throw new Error(
      `STAGE database fingerprint mismatch: got ${fp ?? "null"}, expected ${STAGE_CANONICAL_DATABASE_FINGERPRINT}.`,
    );
  }
  void getRuntimeDataEnvironment(env);
}

export function assertFcaLinkageExecuteAuthorized(
  input: { execute: boolean; confirm: string | null | undefined },
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (!input.execute) return;
  if (input.confirm?.trim() !== EXECUTE_CONFIRMATION) {
    throw new Error(`--execute requires --confirm ${EXECUTE_CONFIRMATION}`);
  }
  assertFcaLinkageStageIdentityReadOnly(env);
  assertOperationalMutationAllowed({
    operationId: OPERATION_ID,
    databaseUrl: env.DATABASE_URL,
    explicitIntent: true,
    allowedRemoteEnvironments: ["stage"],
  });
  const guard = evaluateOperationalMutationGuard(
    {
      operationId: OPERATION_ID,
      databaseUrl: env.DATABASE_URL,
      explicitIntent: true,
      allowedRemoteEnvironments: ["stage"],
    },
    env,
  );
  if (!guard.allowed) {
    throw new Error(guard.reason);
  }
}
