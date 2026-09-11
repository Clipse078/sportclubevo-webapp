import { Prisma } from "@prisma/client";
import { logAction } from "@/lib/audit/log-action";
import { allocateUniqueBillingKey } from "./billing-business-key";
import {
  NATIVE_BILLING_AUDIT_ACTIONS,
  NATIVE_BILLING_AUDIT_MODULE,
} from "./native-billing-audit";
import {
  invoiceSequenceYearFromDate,
} from "./invoice-numbering";
import {
  allocateNextInvoiceNumber,
  contractNumberExists,
  createBillingContractRecord,
  createInvoiceDraftRecord,
  findBillingContractById,
  findBillingContractByKey,
  findBillingProductById,
  findInvoiceById,
  findInvoiceByKey,
  findInvoiceIssuerSnapshot,
  findInvoiceRecipientSnapshot,
  findInvoiceTaxSnapshots,
  listBillingContracts,
  listBillingProducts,
  listInvoiceLines,
  listInvoices,
  persistInvoiceFinalization,
  replaceInvoiceLines,
  updateBillingContractRecord,
  updateInvoiceRecord,
  updateInvoiceDraftRecord,
} from "./native-billing-commercial-repository";
import {
  isInvoiceMutable,
  type BillingContractRecord,
  type InvoiceRecord,
} from "./native-billing-commercial-types";
import {
  findBillingCustomerById,
  findBillingProfileById,
  findLegalEntityById,
} from "./native-billing-repository";
import {
  NativeBillingConflictError,
  NativeBillingNotFoundError,
  NativeBillingValidationError,
} from "./native-billing-types";
import {
  calculateLineAmounts,
  sumInvoiceTotals,
  SWISS_VAT_STANDARD_LABEL,
  vatRateBpsFromTreatment,
} from "./swiss-vat";

function assertChf(currency: string): void {
  if (currency.trim().toUpperCase() !== "CHF") {
    throw new NativeBillingValidationError("Nur CHF wird unterstützt.");
  }
}

function parseDateOnly(value: string, field: string): Date {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new NativeBillingValidationError(`${field}: Datum im Format YYYY-MM-DD erwartet.`);
  }
  const date = new Date(`${trimmed}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new NativeBillingValidationError(`${field}: Ungültiges Datum.`);
  }
  return date;
}

function addDaysUtc(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export async function getBillingProductsCatalogue() {
  return listBillingProducts();
}

export async function getBillingContractsOverview() {
  const contracts = await listBillingContracts();
  return contracts;
}

export async function getBillingContractDetail(contractKey: string) {
  const contract = await findBillingContractByKey(contractKey);
  if (!contract) {
    throw new NativeBillingNotFoundError("Vertrag nicht gefunden.");
  }
  return contract;
}

export type CreateBillingContractInput = {
  legalEntityId: string;
  billingCustomerId: string;
  contractNumber: string;
  billingProductId?: string | null;
  productName?: string;
  monthlyNetAmountMinor: number;
  currency?: string;
  vatTreatment?: "STANDARD_81";
  startDate: string;
  endDate?: string | null;
  minimumTermMonths?: number | null;
  paymentTermsDays?: number;
  invoiceRecipientProfileId?: string | null;
  description?: string | null;
  internalNote?: string | null;
  actorUserId: string;
};

export async function createBillingContract(
  input: CreateBillingContractInput,
): Promise<BillingContractRecord> {
  const currency = (input.currency ?? "CHF").trim().toUpperCase();
  assertChf(currency);

  const contractNumber = input.contractNumber.trim();
  if (!contractNumber) {
    throw new NativeBillingValidationError("Vertragsnummer ist erforderlich.");
  }

  const entityRow = await findLegalEntityById(input.legalEntityId);
  if (!entityRow) {
    throw new NativeBillingNotFoundError("Legal Entity nicht gefunden.");
  }
  if (entityRow.status !== "ACTIVE") {
    throw new NativeBillingValidationError(
      "Rechtsträger ist nicht aktiv und kann nicht für neue Verträge verwendet werden.",
    );
  }

  const customer = await findBillingCustomerById(input.billingCustomerId);
  if (!customer) {
    throw new NativeBillingNotFoundError("Billing-Kunde nicht gefunden.");
  }

  if (await contractNumberExists(entityRow.id, contractNumber)) {
    throw new NativeBillingConflictError("Vertragsnummer existiert bereits für diese Legal Entity.");
  }

  let productName = input.productName?.trim() ?? "";
  let productDescription: string | null = null;
  const billingProductId: string | null = input.billingProductId ?? null;

  if (billingProductId) {
    const product = await findBillingProductById(billingProductId);
    if (!product) {
      throw new NativeBillingNotFoundError("Produkt nicht gefunden.");
    }
    if (!productName) {
      productName = product.name;
    }
    productDescription = product.description;
  }

  if (!productName) {
    throw new NativeBillingValidationError("Produktbezeichnung ist erforderlich.");
  }

  if (input.monthlyNetAmountMinor < 0) {
    throw new NativeBillingValidationError("Monatspreis muss positiv sein.");
  }

  if (input.invoiceRecipientProfileId) {
    const profile = await findBillingProfileById(input.invoiceRecipientProfileId);
    if (!profile || profile.billingCustomerId !== customer.id) {
      throw new NativeBillingValidationError("Rechnungsprofil gehört nicht zum Kunden.");
    }
  }

  const key = await allocateUniqueBillingKey("billingContract", contractNumber);

  const created = await createBillingContractRecord({
    key,
    contractNumber,
    legalEntity: { connect: { id: entityRow.id } },
    billingCustomer: { connect: { id: customer.id } },
    ...(billingProductId
      ? { billingProduct: { connect: { id: billingProductId } } }
      : {}),
    productName,
    productDescription,
    status: "DRAFT",
    currency,
    monthlyNetAmountMinor: input.monthlyNetAmountMinor,
    billingInterval: "MONTHLY",
    vatTreatment: input.vatTreatment ?? "STANDARD_81",
    startDate: parseDateOnly(input.startDate, "startDate"),
    endDate: input.endDate ? parseDateOnly(input.endDate, "endDate") : null,
    minimumTermMonths: input.minimumTermMonths ?? null,
    paymentTermsDays: input.paymentTermsDays ?? 30,
    ...(input.invoiceRecipientProfileId
      ? {
          invoiceRecipientProfile: { connect: { id: input.invoiceRecipientProfileId } },
        }
      : {}),
    description: input.description?.trim() || null,
    internalNote: input.internalNote?.trim() || null,
  });

  void logAction({
    actorUserId: input.actorUserId,
    moduleKey: NATIVE_BILLING_AUDIT_MODULE,
    entityType: "BillingContract",
    entityId: created.id,
    action: NATIVE_BILLING_AUDIT_ACTIONS.CONTRACT_CREATED,
    afterJson: {
      contractKey: created.key,
      contractNumber: created.contractNumber,
      billingCustomerId: created.billingCustomerId,
      monthlyNetAmountMinor: created.monthlyNetAmountMinor,
    },
  });

  return created;
}

export type UpdateBillingContractInput = {
  contractKey: string;
  productName?: string;
  monthlyNetAmountMinor?: number;
  status?: "DRAFT" | "ACTIVE" | "PAUSED" | "TERMINATED";
  endDate?: string | null;
  paymentTermsDays?: number;
  invoiceRecipientProfileId?: string | null;
  description?: string | null;
  internalNote?: string | null;
  actorUserId: string;
};

export async function updateBillingContract(
  input: UpdateBillingContractInput,
): Promise<BillingContractRecord> {
  const existing = await findBillingContractByKey(input.contractKey);
  if (!existing) {
    throw new NativeBillingNotFoundError("Vertrag nicht gefunden.");
  }

  const data: Prisma.BillingContractUpdateInput = {};
  if (input.productName !== undefined) {
    data.productName = input.productName.trim();
  }
  if (input.monthlyNetAmountMinor !== undefined) {
    if (input.monthlyNetAmountMinor < 0) {
      throw new NativeBillingValidationError("Monatspreis muss positiv sein.");
    }
    data.monthlyNetAmountMinor = input.monthlyNetAmountMinor;
  }
  if (input.endDate !== undefined) {
    data.endDate = input.endDate ? parseDateOnly(input.endDate, "endDate") : null;
  }
  if (input.paymentTermsDays !== undefined) {
    data.paymentTermsDays = input.paymentTermsDays;
  }
  if (input.description !== undefined) {
    data.description = input.description?.trim() || null;
  }
  if (input.internalNote !== undefined) {
    data.internalNote = input.internalNote?.trim() || null;
  }
  if (input.invoiceRecipientProfileId !== undefined) {
    if (input.invoiceRecipientProfileId) {
      const profile = await findBillingProfileById(input.invoiceRecipientProfileId);
      if (!profile || profile.billingCustomerId !== existing.billingCustomerId) {
        throw new NativeBillingValidationError("Rechnungsprofil gehört nicht zum Kunden.");
      }
      data.invoiceRecipientProfile = { connect: { id: input.invoiceRecipientProfileId } };
    } else {
      data.invoiceRecipientProfile = { disconnect: true };
    }
  }

  let auditAction: string = NATIVE_BILLING_AUDIT_ACTIONS.CONTRACT_UPDATED;
  if (input.status !== undefined && input.status !== existing.status) {
    data.status = input.status;
    if (input.status === "ACTIVE") {
      auditAction = NATIVE_BILLING_AUDIT_ACTIONS.CONTRACT_ACTIVATED;
    }
    if (input.status === "TERMINATED") {
      auditAction = NATIVE_BILLING_AUDIT_ACTIONS.CONTRACT_TERMINATED;
    }
  }

  const updated = await updateBillingContractRecord(existing.id, data);

  void logAction({
    actorUserId: input.actorUserId,
    moduleKey: NATIVE_BILLING_AUDIT_MODULE,
    entityType: "BillingContract",
    entityId: updated.id,
    action: auditAction,
    afterJson: { contractKey: updated.key, status: updated.status },
  });

  return updated;
}

export async function getInvoicesOverview() {
  return listInvoices();
}

export async function getInvoiceDetail(invoiceKey: string) {
  const invoice = await findInvoiceByKey(invoiceKey);
  if (!invoice) {
    throw new NativeBillingNotFoundError("Rechnung nicht gefunden.");
  }
  const [lines, taxSnapshots, issuer, recipient] = await Promise.all([
    listInvoiceLines(invoice.id),
    findInvoiceTaxSnapshots(invoice.id),
    findInvoiceIssuerSnapshot(invoice.id),
    findInvoiceRecipientSnapshot(invoice.id),
  ]);
  return { invoice, lines, taxSnapshots, issuer, recipient };
}

export type CreateDraftInvoiceInput = {
  billingContractId: string;
  periodStart: string;
  periodEnd: string;
  invoiceDate?: string | null;
  actorUserId: string;
};

export async function createDraftInvoiceFromContract(
  input: CreateDraftInvoiceInput,
): Promise<InvoiceRecord> {
  const contract = await findBillingContractById(input.billingContractId);
  if (!contract) {
    throw new NativeBillingNotFoundError("Vertrag nicht gefunden.");
  }
  if (contract.status !== "ACTIVE") {
    throw new NativeBillingValidationError("Nur aktive Verträge können abgerechnet werden.");
  }

  assertChf(contract.currency);

  const periodStart = parseDateOnly(input.periodStart, "periodStart");
  const periodEnd = parseDateOnly(input.periodEnd, "periodEnd");
  if (periodEnd < periodStart) {
    throw new NativeBillingValidationError("Leistungszeitraum ungültig.");
  }

  const rateBps = vatRateBpsFromTreatment(contract.vatTreatment);
  const lineAmounts = calculateLineAmounts(1, contract.monthlyNetAmountMinor, rateBps);
  const totals = sumInvoiceTotals([lineAmounts]);

  const invoiceDate = input.invoiceDate
    ? parseDateOnly(input.invoiceDate, "invoiceDate")
    : null;

  const key = await allocateUniqueBillingKey("invoice", `inv-${contract.contractNumber}`);

  const invoice = await createInvoiceDraftRecord({
    key,
    legalEntity: { connect: { id: contract.legalEntityId } },
    billingCustomer: { connect: { id: contract.billingCustomerId } },
    billingContract: { connect: { id: contract.id } },
    status: "DRAFT",
    currency: contract.currency,
    periodStart,
    periodEnd,
    invoiceDate,
    paymentTermsDays: contract.paymentTermsDays,
    netTotalMinor: totals.netTotalMinor,
    vatTotalMinor: totals.vatTotalMinor,
    grossTotalMinor: totals.grossTotalMinor,
    contractLabel: `${contract.productName} (${contract.contractNumber})`,
    lines: {
      create: [
        {
          description: `${contract.productName} — ${formatPeriodLabel(periodStart, periodEnd)}`,
          quantity: new Prisma.Decimal(1),
          unitPriceNetMinor: contract.monthlyNetAmountMinor,
          lineNetMinor: lineAmounts.lineNetMinor,
          vatRateBps: rateBps,
          vatMinor: lineAmounts.vatMinor,
          lineGrossMinor: lineAmounts.lineGrossMinor,
          sortOrder: 0,
        },
      ],
    },
  });

  void logAction({
    actorUserId: input.actorUserId,
    moduleKey: NATIVE_BILLING_AUDIT_MODULE,
    entityType: "Invoice",
    entityId: invoice.id,
    action: NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_DRAFT_CREATED,
    afterJson: {
      invoiceKey: invoice.key,
      billingCustomerId: invoice.billingCustomerId,
      billingContractId: contract.id,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    },
  });

  return invoice;
}

function formatPeriodLabel(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toISOString().slice(0, 10);
  return `${fmt(start)} – ${fmt(end)}`;
}

export type UpdateDraftInvoiceInput = {
  invoiceKey: string;
  periodStart?: string;
  periodEnd?: string;
  invoiceDate?: string | null;
  lines?: Array<{
    description: string;
    quantity: number;
    unitPriceNetMinor: number;
    vatRateBps?: number;
    sortOrder?: number;
  }>;
  actorUserId: string;
};

export async function updateDraftInvoice(input: UpdateDraftInvoiceInput): Promise<InvoiceRecord> {
  const invoice = await findInvoiceByKey(input.invoiceKey);
  if (!invoice) {
    throw new NativeBillingNotFoundError("Rechnung nicht gefunden.");
  }
  if (!isInvoiceMutable(invoice.status)) {
    throw new NativeBillingConflictError("Finalisierte Rechnungen können nicht bearbeitet werden.");
  }

  const patch: Prisma.InvoiceUpdateInput = {};
  if (input.periodStart) {
    patch.periodStart = parseDateOnly(input.periodStart, "periodStart");
  }
  if (input.periodEnd) {
    patch.periodEnd = parseDateOnly(input.periodEnd, "periodEnd");
  }
  if (input.invoiceDate !== undefined) {
    patch.invoiceDate = input.invoiceDate
      ? parseDateOnly(input.invoiceDate, "invoiceDate")
      : null;
  }

  if (Object.keys(patch).length > 0) {
    await updateInvoiceDraftRecord(invoice.id, patch);
  }

  if (input.lines && input.lines.length > 0) {
    assertChf(invoice.currency);
    const mapped = input.lines.map((line, index) => {
      const rateBps = line.vatRateBps ?? vatRateBpsFromTreatment("STANDARD_81");
      const amounts = calculateLineAmounts(line.quantity, line.unitPriceNetMinor, rateBps);
      return {
        description: line.description.trim(),
        quantity: new Prisma.Decimal(line.quantity),
        unitPriceNetMinor: line.unitPriceNetMinor,
        lineNetMinor: amounts.lineNetMinor,
        vatRateBps: rateBps,
        vatMinor: amounts.vatMinor,
        lineGrossMinor: amounts.lineGrossMinor,
        sortOrder: line.sortOrder ?? index,
      };
    });
    const totals = sumInvoiceTotals(mapped);
    await replaceInvoiceLines(invoice.id, mapped, totals);
  }

  const updated = await findInvoiceById(invoice.id);
  if (!updated) {
    throw new NativeBillingNotFoundError("Rechnung nicht gefunden.");
  }

  void logAction({
    actorUserId: input.actorUserId,
    moduleKey: NATIVE_BILLING_AUDIT_MODULE,
    entityType: "Invoice",
    entityId: updated.id,
    action: NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_DRAFT_UPDATED,
    afterJson: { invoiceKey: updated.key },
  });

  return updated;
}

export async function finalizeInvoice(
  invoiceKey: string,
  actorUserId: string,
): Promise<InvoiceRecord> {
  const detail = await getInvoiceDetail(invoiceKey);
  const { invoice, lines } = detail;

  if (invoice.status === "FINALIZED" && invoice.invoiceNumber) {
    return invoice;
  }
  if (!isInvoiceMutable(invoice.status)) {
    throw new NativeBillingConflictError("Rechnung kann nicht finalisiert werden.");
  }

  assertChf(invoice.currency);
  if (lines.length === 0) {
    throw new NativeBillingValidationError("Rechnung ohne Positionen kann nicht finalisiert werden.");
  }

  const issuerEntity = await findLegalEntityById(invoice.legalEntityId);
  if (!issuerEntity || issuerEntity.status !== "ACTIVE") {
    throw new NativeBillingValidationError("Aussteller (Legal Entity) unvollständig oder inaktiv.");
  }
  if (!issuerEntity.legalName || !issuerEntity.addressLine1) {
    throw new NativeBillingValidationError("Aussteller-Adresse unvollständig.");
  }

  const customer = await findBillingCustomerById(invoice.billingCustomerId);
  if (!customer) {
    throw new NativeBillingNotFoundError("Billing-Kunde nicht gefunden.");
  }

  let recipientProfile = null;
  const contract = invoice.billingContractId
    ? await findBillingContractById(invoice.billingContractId)
    : null;
  if (contract?.invoiceRecipientProfileId) {
    recipientProfile = await findBillingProfileById(contract.invoiceRecipientProfileId);
  }
  if (!recipientProfile) {
    const { listBillingProfilesForCustomer } = await import("./native-billing-repository");
    const profiles = await listBillingProfilesForCustomer(invoice.billingCustomerId);
    recipientProfile =
      profiles.find((p) => p.profileType === "BILLING") ?? profiles[0] ?? null;
  }
  if (!recipientProfile) {
    throw new NativeBillingValidationError("Rechnungsempfänger-Profil fehlt.");
  }

  const invoiceDate = invoice.invoiceDate ?? new Date();
  const paymentTermsDays =
    invoice.paymentTermsDays ?? contract?.paymentTermsDays ?? 30;
  const dueDate = addDaysUtc(invoiceDate, paymentTermsDays);

  const totals = sumInvoiceTotals(lines);
  for (const line of lines) {
    const expected = calculateLineAmounts(
      Number(line.quantity),
      line.unitPriceNetMinor,
      line.vatRateBps,
    );
    if (
      expected.lineNetMinor !== line.lineNetMinor ||
      expected.vatMinor !== line.vatMinor ||
      expected.lineGrossMinor !== line.lineGrossMinor
    ) {
      throw new NativeBillingValidationError("MWST-Berechnung der Positionen ist inkonsistent.");
    }
  }

  const sequenceYear = invoiceSequenceYearFromDate(invoiceDate);
  const { invoiceNumber } = await allocateNextInvoiceNumber(
    invoice.legalEntityId,
    sequenceYear,
  );

  const finalizedAt = new Date();
  const taxSnapshots = [
    {
      taxLabel: SWISS_VAT_STANDARD_LABEL,
      taxRateBps: lines[0]!.vatRateBps,
      taxableBaseMinor: totals.netTotalMinor,
      taxAmountMinor: totals.vatTotalMinor,
      currency: invoice.currency,
    },
  ];

  const finalized = await persistInvoiceFinalization({
    invoiceId: invoice.id,
    invoiceNumber,
    finalizedAt,
    invoiceDate,
    dueDate,
    paymentTermsDays,
    netTotalMinor: totals.netTotalMinor,
    vatTotalMinor: totals.vatTotalMinor,
    grossTotalMinor: totals.grossTotalMinor,
    contractLabel: invoice.contractLabel,
    issuer: {
      legalName: issuerEntity.legalName,
      displayName: issuerEntity.displayName,
      uid: issuerEntity.uid,
      vatId: issuerEntity.vatId,
      addressLine1: issuerEntity.addressLine1,
      houseNumber: issuerEntity.houseNumber,
      postalCode: issuerEntity.postalCode,
      city: issuerEntity.city,
      countryCode: issuerEntity.countryCode,
      currency: issuerEntity.defaultCurrency,
    },
    recipient: {
      companyOrName: recipientProfile.companyOrName,
      street: recipientProfile.street,
      houseNumber: recipientProfile.houseNumber,
      postalCode: recipientProfile.postalCode,
      city: recipientProfile.city,
      countryCode: recipientProfile.countryCode,
      invoiceEmail: recipientProfile.invoiceEmail,
    },
    taxSnapshots,
    lines: lines.map((line, index) => ({
      description: line.description,
      quantity: new Prisma.Decimal(line.quantity),
      unitPriceNetMinor: line.unitPriceNetMinor,
      lineNetMinor: line.lineNetMinor,
      vatRateBps: line.vatRateBps,
      vatMinor: line.vatMinor,
      lineGrossMinor: line.lineGrossMinor,
      sortOrder: line.sortOrder ?? index,
    })),
  });

  void logAction({
    actorUserId,
    moduleKey: NATIVE_BILLING_AUDIT_MODULE,
    entityType: "Invoice",
    entityId: finalized.id,
    action: NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_FINALIZED,
    afterJson: {
      invoiceId: finalized.id,
      invoiceNumber: finalized.invoiceNumber,
      billingCustomerId: finalized.billingCustomerId,
      netTotalMinor: finalized.netTotalMinor,
      vatTotalMinor: finalized.vatTotalMinor,
      grossTotalMinor: finalized.grossTotalMinor,
    },
  });

  return finalized;
}

export async function voidInvoice(invoiceKey: string, actorUserId: string): Promise<InvoiceRecord> {
  const invoice = await findInvoiceByKey(invoiceKey);
  if (!invoice) {
    throw new NativeBillingNotFoundError("Rechnung nicht gefunden.");
  }
  if (invoice.status === "DRAFT") {
    throw new NativeBillingValidationError("Entwürfe werden gelöscht, nicht storniert.");
  }
  if (invoice.status === "VOID") {
    return invoice;
  }
  if (invoice.status === "PAID" || invoice.status === "PARTIALLY_PAID") {
    throw new NativeBillingConflictError("Bezahlte Rechnungen können nicht storniert werden.");
  }

  const updated = await updateInvoiceRecord(invoice.id, { status: "VOID" });

  void logAction({
    actorUserId,
    moduleKey: NATIVE_BILLING_AUDIT_MODULE,
    entityType: "Invoice",
    entityId: updated.id,
    action: NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_VOIDED,
    afterJson: { invoiceKey: updated.key, invoiceNumber: updated.invoiceNumber },
  });

  return updated;
}
