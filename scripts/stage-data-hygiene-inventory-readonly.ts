/**
 * Read-only STAGE / connected DB hygiene inventory (no mutations).
 * Usage: npx tsx scripts/stage-data-hygiene-inventory-readonly.ts
 */
import { prisma } from "@/lib/db/prisma";

type Classification = "KEEP" | "DELETE CANDIDATE" | "UNCERTAIN";

const SYNTHETIC_TENANT_PATTERNS = [
  /^rollover/i,
  /^cross-org/i,
  /^rperm/i,
  /test/i,
  /demo/i,
  /synthetic/i,
  /fixture/i,
];

const PROTECTED_TENANT_KEYS = new Set(["fc-allschwil"]);
const PROTECTED_USER_EMAILS = new Set([
  "hello@tulip-digital.ch",
  "it@fcallschwil.ch",
]);

function classifyTenant(key: string, name: string): Classification {
  if (PROTECTED_TENANT_KEYS.has(key)) return "KEEP";
  if (SYNTHETIC_TENANT_PATTERNS.some((p) => p.test(key) || p.test(name))) {
    return "DELETE CANDIDATE";
  }
  return "UNCERTAIN";
}

function classifyUser(email: string): Classification {
  const lower = email.toLowerCase();
  if (PROTECTED_USER_EMAILS.has(lower)) return "KEEP";
  if (/test|demo|rollover|rperm|cross-org|example\.com|@localhost/.test(lower)) {
    return "DELETE CANDIDATE";
  }
  return "UNCERTAIN";
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }

  const [
    tenants,
    users,
    billingCustomers,
    legalEntities,
    billingContracts,
    invoices,
    tenantBillingAccounts,
    billingBankAccounts,
  ] = await Promise.all([
    prisma.tenant.findMany({ select: { id: true, key: true, name: true, status: true } }),
    prisma.user.findMany({ select: { id: true, email: true, isActive: true, tenantId: true } }),
    prisma.billingCustomer.findMany({ select: { id: true, key: true, displayName: true, status: true } }),
    prisma.legalEntity.findMany({ select: { id: true, key: true, displayName: true, status: true } }),
    prisma.billingContract.findMany({ select: { id: true, key: true, contractNumber: true, status: true } }),
    prisma.invoice.findMany({ select: { id: true, key: true, status: true, invoiceNumber: true } }),
    prisma.tenantBillingAccount.findMany({
      select: { id: true, tenantId: true, stripeCustomerId: true },
    }),
    prisma.billingBankAccount.findMany({ select: { id: true, label: true, legalEntityId: true } }),
  ]);

  const inventory = {
    meta: {
      generatedAt: new Date().toISOString(),
      databaseHost: url.replace(/:[^:@]+@/, ":***@").split("?")[0],
      counts: {
        tenants: tenants.length,
        users: users.length,
        billingCustomers: billingCustomers.length,
        legalEntities: legalEntities.length,
        billingContracts: billingContracts.length,
        invoices: invoices.length,
        tenantBillingAccounts: tenantBillingAccounts.length,
        billingBankAccounts: billingBankAccounts.length,
      },
    },
    tenants: tenants.map((t) => ({
      key: t.key,
      name: t.name,
      status: t.status,
      classification: classifyTenant(t.key, t.name),
      cascadeNotes:
        "Tenant has Restrict relations to BillingCustomerTenant; UserMembership/UserRole may reference tenantId.",
    })),
    users: users.map((u) => ({
      email: u.email,
      isActive: u.isActive,
      tenantId: u.tenantId,
      classification: classifyUser(u.email),
      cascadeNotes: "User deletion cascades memberships, roles, audit references — review dependencies.",
    })),
    billingCustomers,
    legalEntities: legalEntities.map((le) => ({
      ...le,
      classification: /changed/i.test(le.displayName) || /test|demo/i.test(le.key)
        ? "DELETE CANDIDATE"
        : "UNCERTAIN",
      cascadeNotes: "LegalEntity links BillingBankAccount (Restrict); contracts reference legalEntityId.",
    })),
    billingContracts,
    invoices,
    tenantBillingAccounts: tenantBillingAccounts.map((a) => ({
      ...a,
      classification: "UNCERTAIN",
      cascadeNotes: "Stripe mapping only; native billing uses BillingCustomer separately.",
    })),
    billingBankAccounts: billingBankAccounts.map((a) => ({
      id: a.id,
      label: a.label,
      classification: "UNCERTAIN",
      cascadeNotes: "Encrypted IBAN fields; tied to LegalEntity.",
    })),
  };

  console.log(JSON.stringify(inventory, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
