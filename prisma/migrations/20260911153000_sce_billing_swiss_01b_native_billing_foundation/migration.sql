-- SCE-BILLING-SWISS-01B — Native commercial billing foundation (schema only).

CREATE TYPE "LegalEntityStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "LegalEntityType" AS ENUM ('COMPANY', 'ASSOCIATION', 'OTHER');
CREATE TYPE "BillingCustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "BillingProfileType" AS ENUM ('BILLING', 'DELIVERY');
CREATE TYPE "BillingReferenceStrategy" AS ENUM ('QRR', 'SCOR', 'NON');

CREATE TABLE "LegalEntity" (
    "id"              TEXT NOT NULL,
    "key"             TEXT NOT NULL,
    "displayName"     TEXT NOT NULL,
    "legalName"       TEXT NOT NULL,
    "entityType"      "LegalEntityType",
    "uid"             TEXT,
    "vatId"           TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'CHF',
    "status"          "LegalEntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "addressLine1"    TEXT NOT NULL,
    "houseNumber"     TEXT,
    "postalCode"      TEXT NOT NULL,
    "city"            TEXT NOT NULL,
    "countryCode"     TEXT NOT NULL,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalEntity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegalEntity_key_key" ON "LegalEntity"("key");

CREATE TABLE "BillingCustomer" (
    "id"              TEXT NOT NULL,
    "key"             TEXT NOT NULL,
    "displayName"     TEXT NOT NULL,
    "legalName"       TEXT,
    "status"          "BillingCustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "defaultLanguage" TEXT,
    "defaultCurrency" TEXT,
    "primaryEmail"    TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingCustomer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingCustomer_key_key" ON "BillingCustomer"("key");

CREATE TABLE "BillingCustomerTenant" (
    "id"                TEXT NOT NULL,
    "billingCustomerId" TEXT NOT NULL,
    "tenantId"          TEXT NOT NULL,
    "linkRole"          TEXT,
    "activeFrom"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeUntil"       TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingCustomerTenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingCustomerTenant_billingCustomerId_tenantId_key"
    ON "BillingCustomerTenant"("billingCustomerId", "tenantId");
CREATE INDEX "BillingCustomerTenant_tenantId_idx" ON "BillingCustomerTenant"("tenantId");
CREATE INDEX "BillingCustomerTenant_billingCustomerId_idx" ON "BillingCustomerTenant"("billingCustomerId");

CREATE TABLE "BillingProfile" (
    "id"                TEXT NOT NULL,
    "billingCustomerId" TEXT NOT NULL,
    "profileType"       "BillingProfileType" NOT NULL,
    "companyOrName"     TEXT NOT NULL,
    "street"            TEXT NOT NULL,
    "houseNumber"       TEXT,
    "postalCode"        TEXT NOT NULL,
    "city"              TEXT NOT NULL,
    "countryCode"       TEXT NOT NULL,
    "invoiceEmail"      TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingProfile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BillingProfile_billingCustomerId_idx" ON "BillingProfile"("billingCustomerId");

CREATE TABLE "BillingBankAccount" (
    "id"                   TEXT NOT NULL,
    "legalEntityId"        TEXT NOT NULL,
    "label"                TEXT NOT NULL,
    "bankName"             TEXT,
    "currency"             TEXT NOT NULL DEFAULT 'CHF',
    "iban"                 TEXT NOT NULL,
    "qrIban"               TEXT,
    "referenceStrategy"    "BillingReferenceStrategy" NOT NULL DEFAULT 'NON',
    "creditorName"         TEXT NOT NULL,
    "creditorAddressLine1" TEXT NOT NULL,
    "creditorHouseNumber"  TEXT,
    "creditorPostalCode"   TEXT NOT NULL,
    "creditorCity"         TEXT NOT NULL,
    "creditorCountryCode"  TEXT NOT NULL,
    "activeFrom"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeUntil"          TIMESTAMP(3),
    "isDefault"            BOOLEAN NOT NULL DEFAULT false,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingBankAccount_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BillingBankAccount_legalEntityId_idx" ON "BillingBankAccount"("legalEntityId");

ALTER TABLE "BillingCustomerTenant" ADD CONSTRAINT "BillingCustomerTenant_billingCustomerId_fkey"
    FOREIGN KEY ("billingCustomerId") REFERENCES "BillingCustomer"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BillingCustomerTenant" ADD CONSTRAINT "BillingCustomerTenant_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BillingProfile" ADD CONSTRAINT "BillingProfile_billingCustomerId_fkey"
    FOREIGN KEY ("billingCustomerId") REFERENCES "BillingCustomer"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BillingBankAccount" ADD CONSTRAINT "BillingBankAccount_legalEntityId_fkey"
    FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
