/**
 * SWISS-01H3 read-only diagnostic (no mutations).
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/db/prisma";
import { parseCamt054Xml } from "@/lib/billing/camt054/parse-camt054-xml";
import { findInvoiceForCamt054QrrReference } from "@/lib/billing/camt054-reconciliation/camt054-invoice-matcher";
import { reconcileCamt054Statement } from "@/lib/billing/camt054-reconciliation/camt054-reconciliation-service";
import { getRuntimeEnvironment } from "@/lib/env";

function maskRef(r: string | null | undefined): string | null {
  if (!r) return null;
  if (r.length <= 8) return "*".repeat(r.length);
  return `${r.slice(0, 4)}...${r.slice(-4)}`;
}

function charClasses(s: string) {
  return {
    len: s.length,
    asciiDigits: /^[0-9]+$/.test(s),
    hasWhitespace: /\s/.test(s),
    hasNonAscii: /[^\x00-\x7F]/.test(s),
  };
}

function hostFrom(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    return new URL(url.trim()).hostname;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const runtime = getRuntimeEnvironment({
    ...process.env,
    APP_ENV: process.env.APP_ENV ?? "local",
    NODE_ENV: process.env.NODE_ENV ?? "development",
  });
  const dbHost = hostFrom(process.env.DATABASE_URL);
  const stageHost = hostFrom(process.env.STAGE_DB_URL);

  const inv = await prisma.invoice.findFirst({
    where: { invoiceNumber: "2026-000004" },
    select: {
      id: true,
      key: true,
      invoiceNumber: true,
      status: true,
      grossTotalMinor: true,
      legalEntityId: true,
      legalEntity: { select: { key: true, displayName: true } },
      _count: { select: { payments: true } },
    },
  });

  const pi = inv
    ? await prisma.invoicePaymentInstruction.findUnique({
        where: { invoiceId: inv.id },
        select: { reference: true, referenceType: true, paymentMethod: true },
      })
    : null;

  const fixture = readFileSync(
    "lib/billing/camt054/__tests__/fixtures/acceptance/a-exact-qrr-full.camt054.xml",
    "utf8",
  );
  const parsed = parseCamt054Xml(fixture);
  const tx = parsed.transactions[0];
  const matched = tx?.creditorReference
    ? await findInvoiceForCamt054QrrReference(
        tx.creditorReference,
        inv?.legalEntityId ?? "",
      )
    : null;

  const dbRef = pi?.reference ?? null;
  const fixRef = tx?.creditorReference ?? null;
  const norm = (s: string | null) => s?.replace(/\s+/g, "") ?? null;

  let apiReport: unknown = null;
  if (inv?.legalEntity.key && tx) {
    const actor = await prisma.user.findFirst({
      where: { email: "hello@tulip-digital.ch" },
      select: { id: true },
    });
    if (actor) {
      apiReport = await reconcileCamt054Statement({
        legalEntityKey: inv.legalEntity.key,
        xml: fixture,
        dryRun: true,
        actorUserId: actor.id,
      });
    }
  }

  const fca = await prisma.invoice.findFirst({
    where: { invoiceNumber: "2026-000002" },
    select: {
      status: true,
      grossTotalMinor: true,
      _count: { select: { payments: true } },
    },
  });

  console.log(
    JSON.stringify(
      {
        runtimeAppEnv: runtime.appEnv,
        isStage: runtime.isStage,
        dbHostFingerprint: dbHost,
        stageRefHostFingerprint: stageHost,
        sameDbRefAsStageUrl: dbHost === stageHost,
        invoice2026_000004: inv
          ? {
              status: inv.status,
              legalEntityKey: inv.legalEntity.key,
              paymentCount: inv._count.payments,
              outstandingMinor: inv.grossTotalMinor,
            }
          : null,
        paymentInstruction: pi
          ? {
              referenceType: pi.referenceType,
              paymentMethod: pi.paymentMethod,
              referenceMasked: maskRef(pi.reference),
              ...charClasses(pi.reference ?? ""),
            }
          : null,
        fixtureParsedQrrMasked: maskRef(fixRef),
        fixtureParsedClasses: fixRef ? charClasses(fixRef) : null,
        compare: {
          db_eq_fixture: norm(dbRef) === norm(fixRef),
          fixture_eq_parsed: norm(fixRef) === norm(fixRef),
          db_eq_parsed: norm(dbRef) === norm(fixRef),
        },
        matcherResult: matched
          ? { invoiceNumber: matched.invoiceNumber, invoiceKey: matched.invoiceKey }
          : null,
        serviceDryRunFirstEntry: apiReport
          ? {
              matchedCount: (apiReport as { matchedCount: number }).matchedCount,
              entry: (apiReport as { entries: unknown[] }).entries[0],
            }
          : null,
        fca2026_000002: fca,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
