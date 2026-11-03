/**
 * Guarded bounded SFV schedule refresh — STAGE operational slice (A4A11).
 *
 * Single-tenant, validated date window, reuses syncSfvScheduleForWindow().
 */

import { listEnabledSfvConfigTenantIds } from "../tenant-config-repository";
import { parseBoundedScheduleWindow } from "./schedule-window";
import { syncSfvScheduleForWindow } from "./schedule";
import type { SfvScheduleSyncResult } from "./schedule-types";

export type BoundedSfvScheduleSyncInput = {
  tenantId: string;
  seasonId: number;
  dateFrom: string;
  dateTo: string;
};

export type BoundedSfvScheduleSyncOutcome =
  | { ok: true; result: SfvScheduleSyncResult }
  | { ok: false; code: string; message: string };

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

export async function runBoundedSfvScheduleSync(
  input: BoundedSfvScheduleSyncInput,
): Promise<BoundedSfvScheduleSyncOutcome> {
  const tenantId = input.tenantId.trim();
  if (!tenantId) {
    return { ok: false, code: "INVALID_TENANT", message: "tenantId is required." };
  }

  if (!isPositiveInteger(input.seasonId)) {
    return {
      ok: false,
      code: "INVALID_SEASON",
      message: "seasonId must be a positive integer.",
    };
  }

  const enabledTenantIds = await listEnabledSfvConfigTenantIds();
  if (!enabledTenantIds.includes(tenantId)) {
    return {
      ok: false,
      code: "TENANT_NOT_ENABLED",
      message: "Tenant has no enabled SFV configuration.",
    };
  }

  const parsed = parseBoundedScheduleWindow(input.dateFrom, input.dateTo);
  if ("error" in parsed) {
    return { ok: false, code: "INVALID_DATE_WINDOW", message: parsed.error };
  }

  try {
    const result = await syncSfvScheduleForWindow(tenantId, {
      dateFrom: parsed.dateFrom,
      dateTo: parsed.dateTo,
      seasonId: input.seasonId,
      inclusiveDateUntil: true,
    });
    return { ok: true, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    const code = error instanceof Error ? error.name : "SYNC_FAILED";
    return { ok: false, code, message };
  }
}
