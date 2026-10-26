/**
 * FIN-06E-R3 — read-only STAGE distribution state after PO UAT send attempt.
 */
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "•••";
  const visible = local.length <= 2 ? (local[0] ?? "•") : `${local.slice(0, 2)}•••`;
  return `${visible}@${domain}`;
}

type InspectRow = {
  distribution_id: string;
  distribution_status: string;
  created_at: Date;
  completed_at: Date | null;
  idempotency_key: string;
  version_number: number;
  recipient_id: string | null;
  recipient_status: string | null;
  failure_code: string | null;
  delivery_metadata: unknown;
  recipient_email: string | null;
  share_kind: string | null;
};

async function main(): Promise<void> {
  const rows = await prisma.$queryRaw<InspectRow[]>`
    SELECT
      d.id AS distribution_id,
      d.status AS distribution_status,
      d."createdAt" AS created_at,
      d."completedAt" AS completed_at,
      d."idempotencyKey" AS idempotency_key,
      v."versionNumber" AS version_number,
      r.id AS recipient_id,
      r.status AS recipient_status,
      r."failureCode" AS failure_code,
      r."deliveryMetadataJson" AS delivery_metadata,
      r."recipientEmail" AS recipient_email,
      s."shareKind" AS share_kind
    FROM "FinancePublicationDistribution" d
    JOIN "FinancePublicationVersion" v ON v.id = d."publicationVersionId"
    LEFT JOIN "FinancePublicationDistributionRecipient" r ON r."distributionId" = d.id
    LEFT JOIN "FinancePublicationShare" s ON s.id = r."publicationShareId"
    ORDER BY d."createdAt" DESC
    LIMIT 30
  `;

  const byDistribution = new Map<string, InspectRow[]>();
  for (const row of rows) {
    const bucket = byDistribution.get(row.distribution_id) ?? [];
    bucket.push(row);
    byDistribution.set(row.distribution_id, bucket);
  }

  for (const group of byDistribution.values()) {
    const head = group[0]!;
    console.log(
      JSON.stringify({
        distributionIdPrefix: head.distribution_id.slice(0, 12),
        createdAt: head.created_at.toISOString(),
        status: head.distribution_status,
        idempotencyKeyPrefix: head.idempotency_key.slice(0, 48),
        versionNumber: head.version_number,
        completedAt: head.completed_at?.toISOString() ?? null,
        recipients: group
          .filter((row) => row.recipient_id)
          .map((row) => ({
            status: row.recipient_status,
            failureCode: row.failure_code,
            emailMasked: row.recipient_email ? maskEmail(row.recipient_email) : null,
            shareKind: row.share_kind,
            providerReferencePresent:
              typeof row.delivery_metadata === "object" &&
              row.delivery_metadata !== null &&
              "providerMessageId" in (row.delivery_metadata as object) &&
              Boolean(
                (row.delivery_metadata as { providerMessageId?: string }).providerMessageId,
              ),
          })),
      }),
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error("[fin-06e-r3-stage-inspect] FAILED", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
