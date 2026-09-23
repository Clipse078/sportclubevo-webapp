import type { WorkspaceMalwareScannerProviderResult } from "@/lib/workspace/malware-scan/scanner-provider";

import {
  WORKSPACE_BACKGROUND_JOB_RETRY_BASE_MS,
  WORKSPACE_BACKGROUND_JOB_RETRY_MAX_MS,
} from "@/lib/workspace/background-jobs/job-constants";

export type WorkspaceBackgroundJobFailureClass =
  | "RETRYABLE"
  | "NON_RETRYABLE";

const RETRYABLE_SCANNER_ERROR_CLASSES = new Set([
  "SCANNER_NOT_CONFIGURED",
  "SCANNER_TIMEOUT",
  "PROVIDER_TIMEOUT",
  "PROVIDER_OUTAGE",
  "STORAGE_READ_TRANSIENT",
  "STORAGE_TRANSIENT",
  "NETWORK_TRANSIENT",
  "STALE_WORKER_LEASE",
]);

const NON_RETRYABLE_JOB_ERROR_CODES = new Set([
  "TENANT_MISMATCH",
  "TARGET_NOT_FOUND",
  "INVALID_PAYLOAD",
  "PERMANENT_INVARIANT",
  "PURGE_NOT_ELIGIBLE",
]);

export function classifyScannerProviderFailure(
  result: Extract<WorkspaceMalwareScannerProviderResult, { outcome: "FAILED" }>,
): WorkspaceBackgroundJobFailureClass {
  if (RETRYABLE_SCANNER_ERROR_CLASSES.has(result.errorClass)) {
    return "RETRYABLE";
  }
  return "RETRYABLE";
}

export function classifyJobExecutionErrorCode(
  errorCode: string,
): WorkspaceBackgroundJobFailureClass {
  if (NON_RETRYABLE_JOB_ERROR_CODES.has(errorCode)) {
    return "NON_RETRYABLE";
  }
  if (RETRYABLE_SCANNER_ERROR_CLASSES.has(errorCode)) {
    return "RETRYABLE";
  }
  return "RETRYABLE";
}

export function computeWorkspaceBackgroundJobRetryAvailableAt(
  attemptCount: number,
  now: Date = new Date(),
): Date {
  const exponent = Math.max(0, attemptCount - 1);
  const delayMs = Math.min(
    WORKSPACE_BACKGROUND_JOB_RETRY_BASE_MS * 2 ** exponent,
    WORKSPACE_BACKGROUND_JOB_RETRY_MAX_MS,
  );
  return new Date(now.getTime() + delayMs);
}
