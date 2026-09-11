import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type {
  BillingContractRecord,
  BillingProductRecord,
  InvoiceIssuerSnapshotRecord,
  InvoiceLineRecord,
  InvoiceRecipientSnapshotRecord,
  InvoiceRecord,
  InvoiceTaxSnapshotRecord,
} from "./native-billing-commercial-types";

const contractSelect = {
  id: true,
  key: true,
  contractNumber: true,
  legalEntityId: true,
  billingCustomerId: true,
  billingProductId: true,
  productName: true,
  productDescription: true,
  status: true,
  currency: true,
  monthlyNetAmountMinor: true,
  billingInterval: true,
  vatTreatment: true,
  startDate: true,
  endDate: true,
  minimumTermMonths: true,
  paymentTermsDays: true,
  invoiceRecipientProfileId: true,
  description: true,
  internalNote: true,
  createdAt: true,
  updatedAt: true,
} as const;

const invoiceSelect = {
  id: true,
  key: true,
  invoiceNumber: true,
  legalEntityId: true,
  billingCustomerId: true,
  billingContractId: true,
  status: true,
  currency: true,
  periodStart: true,
  periodEnd: true,
  invoiceDate: true,
  dueDate: true,
  paymentTermsDays: true,
  netTotalMinor: true,
  vatTotalMinor: true,
  grossTotalMinor: true,
  contractLabel: true,
  finalizedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const lineSelect = {
  id: true,
  invoiceId: true,
  description: true,
  quantity: true,
  unitPriceNetMinor: true,
  lineNetMinor: true,
  vatRateBps: true,
  vatMinor: true,
  lineGrossMinor: true,
  sortOrder: true,
} as const;

function mapLine(row: {
  id: string;
  invoiceId: string;
  description: string;
  quantity: Prisma.Decimal;
  unitPriceNetMinor: number;
  lineNetMinor: number;
  vatRateBps: number;
  vatMinor: number;
  lineGrossMinor: number;
  sortOrder: number;
}): InvoiceLineRecord {
  return {
    ...row,
    quantity: row.quantity.toString(),
  };
}

export async function listBillingProducts(): Promise<BillingProductRecord[]> {
  return prisma.billingProduct.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      catalogueMonthlyNetMinor: true,
      status: true,
      sortOrder: true,
    },
  });
}

export async function findBillingProductById(id: string): Promise<BillingProductRecord | null> {
  return prisma.billingProduct.findUnique({
    where: { id },
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      catalogueMonthlyNetMinor: true,
      status: true,
      sortOrder: true,
    },
  });
}

export async function listBillingContracts(): Promise<BillingContractRecord[]> {
  return prisma.billingContract.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: contractSelect,
  });
}

export async function findBillingContractByKey(
  key: string,
): Promise<BillingContractRecord | null> {
  return prisma.billingContract.findUnique({
    where: { key },
    select: contractSelect,
  });
}

export async function findBillingContractById(
  id: string,
): Promise<BillingContractRecord | null> {
  return prisma.billingContract.findUnique({
    where: { id },
    select: contractSelect,
  });
}

export async function createBillingContractRecord(
  data: Prisma.BillingContractCreateInput,
): Promise<BillingContractRecord> {
  return prisma.billingContract.create({
    data,
    select: contractSelect,
  });
}

export async function updateBillingContractRecord(
  id: string,
  data: Prisma.BillingContractUpdateInput,
): Promise<BillingContractRecord> {
  return prisma.billingContract.update({
    where: { id },
    data,
    select: contractSelect,
  });
}

export async function contractNumberExists(
  legalEntityId: string,
  contractNumber: string,
  excludeId?: string,
): Promise<boolean> {
  const row = await prisma.billingContract.findFirst({
    where: {
      legalEntityId,
      contractNumber,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  return row !== null;
}

export async function listInvoices(): Promise<InvoiceRecord[]> {
  return prisma.invoice.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: invoiceSelect,
  });
}

export async function findInvoiceByKey(key: string): Promise<InvoiceRecord | null> {
  return prisma.invoice.findUnique({
    where: { key },
    select: invoiceSelect,
  });
}

export async function findInvoiceById(id: string): Promise<InvoiceRecord | null> {
  return prisma.invoice.findUnique({
    where: { id },
    select: invoiceSelect,
  });
}

export async function listInvoiceLines(invoiceId: string): Promise<InvoiceLineRecord[]> {
  const rows = await prisma.invoiceLine.findMany({
    where: { invoiceId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: lineSelect,
  });
  return rows.map(mapLine);
}

export async function findInvoiceTaxSnapshots(
  invoiceId: string,
): Promise<InvoiceTaxSnapshotRecord[]> {
  return prisma.invoiceTaxSnapshot.findMany({
    where: { invoiceId },
    select: {
      id: true,
      invoiceId: true,
      taxLabel: true,
      taxRateBps: true,
      taxableBaseMinor: true,
      taxAmountMinor: true,
      currency: true,
    },
  });
}

export async function findInvoiceIssuerSnapshot(
  invoiceId: string,
): Promise<InvoiceIssuerSnapshotRecord | null> {
  return prisma.invoiceIssuerSnapshot.findUnique({
    where: { invoiceId },
    select: {
      id: true,
      invoiceId: true,
      legalName: true,
      displayName: true,
      uid: true,
      vatId: true,
      addressLine1: true,
      houseNumber: true,
      postalCode: true,
      city: true,
      countryCode: true,
      currency: true,
    },
  });
}

export async function findInvoiceRecipientSnapshot(
  invoiceId: string,
): Promise<InvoiceRecipientSnapshotRecord | null> {
  return prisma.invoiceRecipientSnapshot.findUnique({
    where: { invoiceId },
    select: {
      id: true,
      invoiceId: true,
      companyOrName: true,
      street: true,
      houseNumber: true,
      postalCode: true,
      city: true,
      countryCode: true,
      invoiceEmail: true,
    },
  });
}

export async function createInvoiceDraftRecord(
  data: Prisma.InvoiceCreateInput,
): Promise<InvoiceRecord> {
  return prisma.invoice.create({
    data,
    select: invoiceSelect,
  });
}

export async function replaceInvoiceLines(
  invoiceId: string,
  lines: Array<{
    description: string;
    quantity: Prisma.Decimal;
    unitPriceNetMinor: number;
    lineNetMinor: number;
    vatRateBps: number;
    vatMinor: number;
    lineGrossMinor: number;
    sortOrder: number;
  }>,
  totals: { netTotalMinor: number; vatTotalMinor: number; grossTotalMinor: number },
): Promise<InvoiceLineRecord[]> {
  await prisma.$transaction([
    prisma.invoiceLine.deleteMany({ where: { invoiceId } }),
    prisma.invoiceLine.createMany({
      data: lines.map((line) => ({
        invoiceId,
        ...line,
      })),
    }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: totals,
    }),
  ]);
  return listInvoiceLines(invoiceId);
}

export async function updateInvoiceRecord(
  id: string,
  data: Prisma.InvoiceUpdateInput,
): Promise<InvoiceRecord> {
  return prisma.invoice.update({
    where: { id },
    data,
    select: invoiceSelect,
  });
}

/** @deprecated Use updateInvoiceRecord */
export const updateInvoiceDraftRecord = updateInvoiceRecord;

export type FinalizeInvoicePersistence = {
  invoiceId: string;
  invoiceNumber: string;
  finalizedAt: Date;
  invoiceDate: Date;
  dueDate: Date;
  paymentTermsDays: number;
  netTotalMinor: number;
  vatTotalMinor: number;
  grossTotalMinor: number;
  contractLabel: string | null;
  issuer: Omit<InvoiceIssuerSnapshotRecord, "id" | "invoiceId">;
  recipient: Omit<InvoiceRecipientSnapshotRecord, "id" | "invoiceId">;
  taxSnapshots: Array<Omit<InvoiceTaxSnapshotRecord, "id" | "invoiceId">>;
  lines: Array<{
    description: string;
    quantity: Prisma.Decimal;
    unitPriceNetMinor: number;
    lineNetMinor: number;
    vatRateBps: number;
    vatMinor: number;
    lineGrossMinor: number;
    sortOrder: number;
  }>;
};

export async function allocateNextInvoiceNumber(
  legalEntityId: string,
  sequenceYear: number,
): Promise<{ sequenceNumber: number; invoiceNumber: string }> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.invoiceSequence.findUnique({
      where: {
        legalEntityId_sequenceYear: { legalEntityId, sequenceYear },
      },
    });

    let sequenceNumber: number;
    if (!existing) {
      const created = await tx.invoiceSequence.create({
        data: {
          legalEntity: { connect: { id: legalEntityId } },
          sequenceYear,
          lastNumber: 1,
        },
      });
      sequenceNumber = created.lastNumber;
    } else {
      const updated = await tx.invoiceSequence.update({
        where: { id: existing.id },
        data: { lastNumber: { increment: 1 } },
      });
      sequenceNumber = updated.lastNumber;
    }

    const { formatInvoiceNumber } = await import("./invoice-numbering");
    return {
      sequenceNumber,
      invoiceNumber: formatInvoiceNumber(sequenceYear, sequenceNumber),
    };
  });
}

export async function persistInvoiceFinalization(
  payload: FinalizeInvoicePersistence,
): Promise<InvoiceRecord> {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: payload.invoiceId },
      select: { status: true, invoiceNumber: true },
    });
    if (!invoice) {
      throw new Error("Invoice not found");
    }
    if (invoice.status !== "DRAFT") {
      if (invoice.invoiceNumber) {
        return tx.invoice.findUniqueOrThrow({
          where: { id: payload.invoiceId },
          select: invoiceSelect,
        });
      }
      throw new Error("Invoice is not draft");
    }

    await tx.invoiceLine.deleteMany({ where: { invoiceId: payload.invoiceId } });
    await tx.invoiceLine.createMany({
      data: payload.lines.map((line) => ({
        invoiceId: payload.invoiceId,
        ...line,
      })),
    });

    await tx.invoiceTaxSnapshot.deleteMany({ where: { invoiceId: payload.invoiceId } });
    await tx.invoiceTaxSnapshot.createMany({
      data: payload.taxSnapshots.map((snap) => ({
        invoiceId: payload.invoiceId,
        ...snap,
      })),
    });

    await tx.invoiceIssuerSnapshot.upsert({
      where: { invoiceId: payload.invoiceId },
      create: { invoiceId: payload.invoiceId, ...payload.issuer },
      update: payload.issuer,
    });

    await tx.invoiceRecipientSnapshot.upsert({
      where: { invoiceId: payload.invoiceId },
      create: { invoiceId: payload.invoiceId, ...payload.recipient },
      update: payload.recipient,
    });

    return tx.invoice.update({
      where: { id: payload.invoiceId },
      data: {
        invoiceNumber: payload.invoiceNumber,
        status: "FINALIZED",
        finalizedAt: payload.finalizedAt,
        invoiceDate: payload.invoiceDate,
        dueDate: payload.dueDate,
        paymentTermsDays: payload.paymentTermsDays,
        netTotalMinor: payload.netTotalMinor,
        vatTotalMinor: payload.vatTotalMinor,
        grossTotalMinor: payload.grossTotalMinor,
        contractLabel: payload.contractLabel,
      },
      select: invoiceSelect,
    });
  });
}
