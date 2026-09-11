-- SCE-BILLING-SWISS-01C — Native contracts & invoices

CREATE TYPE "BillingProductStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "BillingContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'TERMINATED');
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY');
CREATE TYPE "SwissVatTreatment" AS ENUM ('STANDARD_81');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'FINALIZED', 'OPEN', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID', 'CREDITED');

CREATE TABLE "BillingProduct" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "catalogueMonthlyNetMinor" INTEGER,
    "status" "BillingProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingProduct_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingProduct_key_key" ON "BillingProduct"("key");

CREATE TABLE "BillingContract" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "billingCustomerId" TEXT NOT NULL,
    "billingProductId" TEXT,
    "productName" TEXT NOT NULL,
    "productDescription" TEXT,
    "status" "BillingContractStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "monthlyNetAmountMinor" INTEGER NOT NULL,
    "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "vatTreatment" "SwissVatTreatment" NOT NULL DEFAULT 'STANDARD_81',
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "minimumTermMonths" INTEGER,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "invoiceRecipientProfileId" TEXT,
    "description" TEXT,
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingContract_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingContract_key_key" ON "BillingContract"("key");
CREATE UNIQUE INDEX "BillingContract_legalEntityId_contractNumber_key" ON "BillingContract"("legalEntityId", "contractNumber");
CREATE INDEX "BillingContract_billingCustomerId_idx" ON "BillingContract"("billingCustomerId");
CREATE INDEX "BillingContract_legalEntityId_idx" ON "BillingContract"("legalEntityId");
CREATE INDEX "BillingContract_status_idx" ON "BillingContract"("status");

CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "legalEntityId" TEXT NOT NULL,
    "billingCustomerId" TEXT NOT NULL,
    "billingContractId" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "invoiceDate" DATE,
    "dueDate" DATE,
    "paymentTermsDays" INTEGER,
    "netTotalMinor" INTEGER NOT NULL DEFAULT 0,
    "vatTotalMinor" INTEGER NOT NULL DEFAULT 0,
    "grossTotalMinor" INTEGER NOT NULL DEFAULT 0,
    "contractLabel" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invoice_key_key" ON "Invoice"("key");
CREATE UNIQUE INDEX "Invoice_legalEntityId_invoiceNumber_key" ON "Invoice"("legalEntityId", "invoiceNumber");
CREATE INDEX "Invoice_billingCustomerId_idx" ON "Invoice"("billingCustomerId");
CREATE INDEX "Invoice_billingContractId_idx" ON "Invoice"("billingContractId");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_invoiceDate_idx" ON "Invoice"("invoiceDate");

CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unitPriceNetMinor" INTEGER NOT NULL,
    "lineNetMinor" INTEGER NOT NULL,
    "vatRateBps" INTEGER NOT NULL,
    "vatMinor" INTEGER NOT NULL,
    "lineGrossMinor" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

CREATE TABLE "InvoiceTaxSnapshot" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "taxLabel" TEXT NOT NULL,
    "taxRateBps" INTEGER NOT NULL,
    "taxableBaseMinor" INTEGER NOT NULL,
    "taxAmountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceTaxSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InvoiceTaxSnapshot_invoiceId_idx" ON "InvoiceTaxSnapshot"("invoiceId");

CREATE TABLE "InvoiceIssuerSnapshot" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "uid" TEXT,
    "vatId" TEXT,
    "addressLine1" TEXT NOT NULL,
    "houseNumber" TEXT,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceIssuerSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvoiceIssuerSnapshot_invoiceId_key" ON "InvoiceIssuerSnapshot"("invoiceId");

CREATE TABLE "InvoiceRecipientSnapshot" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "companyOrName" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "houseNumber" TEXT,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "invoiceEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceRecipientSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvoiceRecipientSnapshot_invoiceId_key" ON "InvoiceRecipientSnapshot"("invoiceId");

CREATE TABLE "InvoiceSequence" (
    "id" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "sequenceYear" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvoiceSequence_legalEntityId_sequenceYear_key" ON "InvoiceSequence"("legalEntityId", "sequenceYear");
CREATE INDEX "InvoiceSequence_legalEntityId_idx" ON "InvoiceSequence"("legalEntityId");

ALTER TABLE "BillingContract" ADD CONSTRAINT "BillingContract_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingContract" ADD CONSTRAINT "BillingContract_billingCustomerId_fkey" FOREIGN KEY ("billingCustomerId") REFERENCES "BillingCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingContract" ADD CONSTRAINT "BillingContract_billingProductId_fkey" FOREIGN KEY ("billingProductId") REFERENCES "BillingProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingContract" ADD CONSTRAINT "BillingContract_invoiceRecipientProfileId_fkey" FOREIGN KEY ("invoiceRecipientProfileId") REFERENCES "BillingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_billingCustomerId_fkey" FOREIGN KEY ("billingCustomerId") REFERENCES "BillingCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_billingContractId_fkey" FOREIGN KEY ("billingContractId") REFERENCES "BillingContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceTaxSnapshot" ADD CONSTRAINT "InvoiceTaxSnapshot_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceIssuerSnapshot" ADD CONSTRAINT "InvoiceIssuerSnapshot_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceRecipientSnapshot" ADD CONSTRAINT "InvoiceRecipientSnapshot_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceSequence" ADD CONSTRAINT "InvoiceSequence_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Swiss commercial catalogue (reference only; contract holds agreed price).
INSERT INTO "BillingProduct" ("id", "key", "name", "description", "catalogueMonthlyNetMinor", "status", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('bp_sce_platform', 'sce-platform', 'SportClubEvo Platform', 'SCE Plattform-Abo', 19900, 'ACTIVE', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('bp_club_service', 'club-service', 'Club Service', 'Club Service Paket', 24900, 'ACTIVE', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('bp_connected', 'connected', 'Connected', 'Ab CHF 299 / Monat (Katalogpreis)', 29900, 'ACTIVE', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('bp_club_complete', 'club-complete', 'Club Complete', 'Ab CHF 399 / Monat (Katalogpreis)', 39900, 'ACTIVE', 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
