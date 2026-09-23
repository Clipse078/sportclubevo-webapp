import {
  WorkspaceBackgroundJobType,
  type PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { claimWorkspaceBackgroundJobs } from "@/lib/workspace/background-jobs/job-claim";
import { executeDocumentPurgeFinalizeJob } from "@/lib/workspace/background-jobs/handlers/document-purge-finalize-handler";
import { executeMalwareScanVersionJob } from "@/lib/workspace/background-jobs/handlers/malware-scan-version-handler";
import { executeSubtreeOperationBatchJob } from "@/lib/workspace/background-jobs/handlers/subtree-operation-handler";
import {
  markWorkspaceBackgroundJobRetry,
} from "@/lib/workspace/background-jobs/job-outcome";

export type WorkspaceBackgroundJobDispatchSummary = {
  claimed: number;
  succeeded: number;
  retried: number;
  dead: number;
  failed: number;
  byType: Record<string, number>;
};

export async function dispatchWorkspaceBackgroundJobs(input?: {
  client?: PrismaClient;
  globalLimit?: number;
  perTenantLimit?: number;
}): Promise<WorkspaceBackgroundJobDispatchSummary> {
  const client = input?.client ?? prisma;
  const claimed = await claimWorkspaceBackgroundJobs(client, {
    globalLimit: input?.globalLimit,
    perTenantLimit: input?.perTenantLimit,
  });

  const summary: WorkspaceBackgroundJobDispatchSummary = {
    claimed: claimed.length,
    succeeded: 0,
    retried: 0,
    dead: 0,
    failed: 0,
    byType: {},
  };

  for (const job of claimed) {
    summary.byType[job.type] = (summary.byType[job.type] ?? 0) + 1;

    try {
      if (job.type === WorkspaceBackgroundJobType.MALWARE_SCAN_VERSION) {
        await executeMalwareScanVersionJob(job, { client });
      } else if (job.type === WorkspaceBackgroundJobType.DOCUMENT_PURGE_FINALIZE) {
        await executeDocumentPurgeFinalizeJob(job, { client });
      } else if (job.type === WorkspaceBackgroundJobType.SUBTREE_OPERATION_BATCH) {
        await executeSubtreeOperationBatchJob(job, { client });
      } else {
        await markWorkspaceBackgroundJobRetry(client, job, {
          errorCode: "UNSUPPORTED_JOB_TYPE",
        });
      }

      const refreshed = await client.workspaceBackgroundJob.findUnique({
        where: { id: job.id },
        select: { status: true },
      });

      if (refreshed?.status === "SUCCEEDED") {
        summary.succeeded += 1;
      } else if (refreshed?.status === "RETRY") {
        summary.retried += 1;
      } else if (refreshed?.status === "DEAD") {
        summary.dead += 1;
      }
    } catch (err) {
      summary.failed += 1;
      console.error("[workspace-background-jobs] handler failure", {
        jobId: job.id,
        jobType: job.type,
        tenantId: job.tenantId,
        message: err instanceof Error ? err.message : "unknown",
      });

      await markWorkspaceBackgroundJobRetry(client, job, {
        errorCode: "HANDLER_EXCEPTION",
      });
    }
  }

  return summary;
}
