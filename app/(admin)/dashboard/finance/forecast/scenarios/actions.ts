"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { FinanceDomainError } from "@/lib/finance/errors";
import { financeErrorMessage } from "@/lib/finance/errors";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import type { ScenarioAssumptionKindV1 } from "@/lib/finance/forecast/scenario-architecture-contract";
import {
  archiveFinanceScenario,
  createFinanceScenario,
  deleteFinanceScenario,
  duplicateFinanceScenario,
  removeFinanceScenarioAssumption,
  restoreFinanceScenario,
  updateFinanceScenarioMetadata,
  upsertFinanceScenarioAssumption,
} from "@/lib/finance/services/finance-scenario-service";
import {
  adoptFinanceScenarioToCurrentForecast,
  previewFinanceScenarioAdoption,
} from "@/lib/finance/services/finance-scenario-adoption-service";
import {
  previewFinanceScenarioRebase,
  rebaseFinanceScenario,
  type ScenarioRebasePreviewContext,
} from "@/lib/finance/services/finance-scenario-rebase-service";
import type { ScenarioAdoptionPreviewContext } from "@/lib/finance/services/finance-scenario-adoption-service";

export type FinanceScenarioActionResult =
  | { ok: true; scenarioId?: string }
  | { ok: false; errorCode?: string; error: string };

async function scenarioCtx() {
  const workspace = await loadFinanceWorkspaceContext();
  return workspace.ctx;
}

function revalidateFinanceScenarioRoutes(financeYearId?: string, scenarioId?: string) {
  revalidatePath("/dashboard/finance/forecast", "layout");
  revalidatePath("/dashboard/finance/forecast");
  revalidatePath("/dashboard/finance/forecast/history");
  revalidatePath("/dashboard/finance/forecast/scenarios");
  if (financeYearId) {
    revalidatePath(`/dashboard/finance/forecast/scenarios?yearId=${financeYearId}`);
  }
  if (scenarioId) {
    revalidatePath(`/dashboard/finance/forecast/scenarios/${scenarioId}`);
  }
}

function mapScenarioError(error: unknown): FinanceScenarioActionResult {
  if (error instanceof FinanceDomainError) {
    return { ok: false, errorCode: error.code, error: error.message };
  }
  return { ok: false, error: financeErrorMessage(error) };
}

export async function createFinanceScenarioAction(input: {
  financeYearId: string;
  name: string;
  description?: string | null;
  expectedCurrentForecastVersionId?: string | null;
}): Promise<FinanceScenarioActionResult> {
  const ctx = await scenarioCtx();
  try {
    const created = await createFinanceScenario(prisma, ctx, input);
    revalidateFinanceScenarioRoutes(input.financeYearId, created.scenarioId);
    return { ok: true, scenarioId: created.scenarioId };
  } catch (error) {
    return mapScenarioError(error);
  }
}

export async function updateFinanceScenarioMetadataAction(input: {
  scenarioId: string;
  financeYearId: string;
  expectedUpdatedAt: string;
  name?: string;
  description?: string | null;
}): Promise<FinanceScenarioActionResult> {
  const ctx = await scenarioCtx();
  try {
    await updateFinanceScenarioMetadata(prisma, ctx, input);
    revalidateFinanceScenarioRoutes(input.financeYearId, input.scenarioId);
    return { ok: true, scenarioId: input.scenarioId };
  } catch (error) {
    return mapScenarioError(error);
  }
}

export async function upsertFinanceScenarioAssumptionAction(input: {
  scenarioId: string;
  financeYearId: string;
  expectedUpdatedAt: string;
  financialAccountId: string;
  assumption: {
    kind: ScenarioAssumptionKindV1;
    percentBasisPoints?: number | null;
    amountMinorDelta?: number | null;
    absoluteAmountMinor?: number | null;
    note?: string | null;
  };
}): Promise<FinanceScenarioActionResult> {
  const ctx = await scenarioCtx();
  try {
    await upsertFinanceScenarioAssumption(prisma, ctx, input);
    revalidateFinanceScenarioRoutes(input.financeYearId, input.scenarioId);
    return { ok: true, scenarioId: input.scenarioId };
  } catch (error) {
    return mapScenarioError(error);
  }
}

export async function removeFinanceScenarioAssumptionAction(input: {
  scenarioId: string;
  financeYearId: string;
  expectedUpdatedAt: string;
  financialAccountId: string;
}): Promise<FinanceScenarioActionResult> {
  const ctx = await scenarioCtx();
  try {
    await removeFinanceScenarioAssumption(prisma, ctx, input);
    revalidateFinanceScenarioRoutes(input.financeYearId, input.scenarioId);
    return { ok: true, scenarioId: input.scenarioId };
  } catch (error) {
    return mapScenarioError(error);
  }
}

export async function duplicateFinanceScenarioAction(input: {
  sourceScenarioId: string;
  financeYearId: string;
  name: string;
  description?: string | null;
}): Promise<FinanceScenarioActionResult> {
  const ctx = await scenarioCtx();
  try {
    const created = await duplicateFinanceScenario(prisma, ctx, input);
    revalidateFinanceScenarioRoutes(input.financeYearId, created.scenarioId);
    return { ok: true, scenarioId: created.scenarioId };
  } catch (error) {
    return mapScenarioError(error);
  }
}

export async function archiveFinanceScenarioAction(input: {
  scenarioId: string;
  financeYearId: string;
  expectedUpdatedAt: string;
}): Promise<FinanceScenarioActionResult> {
  const ctx = await scenarioCtx();
  try {
    await archiveFinanceScenario(prisma, ctx, input);
    revalidateFinanceScenarioRoutes(input.financeYearId, input.scenarioId);
    return { ok: true, scenarioId: input.scenarioId };
  } catch (error) {
    return mapScenarioError(error);
  }
}

export async function restoreFinanceScenarioAction(input: {
  scenarioId: string;
  financeYearId: string;
  expectedUpdatedAt: string;
}): Promise<FinanceScenarioActionResult> {
  const ctx = await scenarioCtx();
  try {
    await restoreFinanceScenario(prisma, ctx, input);
    revalidateFinanceScenarioRoutes(input.financeYearId, input.scenarioId);
    return { ok: true, scenarioId: input.scenarioId };
  } catch (error) {
    return mapScenarioError(error);
  }
}

export async function deleteFinanceScenarioAction(input: {
  scenarioId: string;
  financeYearId: string;
  expectedUpdatedAt: string;
}): Promise<FinanceScenarioActionResult> {
  const ctx = await scenarioCtx();
  try {
    await deleteFinanceScenario(prisma, ctx, input);
    revalidateFinanceScenarioRoutes(input.financeYearId);
    return { ok: true };
  } catch (error) {
    return mapScenarioError(error);
  }
}

export async function previewFinanceScenarioAdoptionAction(input: {
  scenarioId: string;
  financeYearId: string;
}): Promise<
  | { ok: true; preview: ScenarioAdoptionPreviewContext }
  | { ok: false; errorCode?: string; error: string }
> {
  const ctx = await scenarioCtx();
  try {
    const preview = await previewFinanceScenarioAdoption(prisma, ctx, {
      scenarioId: input.scenarioId,
    });
    return { ok: true as const, preview };
  } catch (error) {
    return mapScenarioError(error) as { ok: false; errorCode?: string; error: string };
  }
}

export async function adoptFinanceScenarioAction(input: {
  scenarioId: string;
  financeYearId: string;
  expectedScenarioUpdatedAt: string;
  expectedCurrentForecastVersionId: string;
}): Promise<FinanceScenarioActionResult> {
  const ctx = await scenarioCtx();
  try {
    await adoptFinanceScenarioToCurrentForecast(prisma, ctx, input);
    revalidateFinanceScenarioRoutes(input.financeYearId, input.scenarioId);
    return { ok: true, scenarioId: input.scenarioId };
  } catch (error) {
    return mapScenarioError(error);
  }
}

export async function previewFinanceScenarioRebaseAction(input: {
  scenarioId: string;
  financeYearId: string;
}): Promise<
  | { ok: true; preview: ScenarioRebasePreviewContext }
  | { ok: false; errorCode?: string; error: string }
> {
  const ctx = await scenarioCtx();
  try {
    const preview = await previewFinanceScenarioRebase(prisma, ctx, {
      scenarioId: input.scenarioId,
    });
    return { ok: true as const, preview };
  } catch (error) {
    return mapScenarioError(error) as { ok: false; errorCode?: string; error: string };
  }
}

export async function rebaseFinanceScenarioAction(input: {
  scenarioId: string;
  financeYearId: string;
  expectedScenarioUpdatedAt: string;
  expectedCurrentForecastVersionId: string;
}): Promise<FinanceScenarioActionResult> {
  const ctx = await scenarioCtx();
  try {
    await rebaseFinanceScenario(prisma, ctx, input);
    revalidateFinanceScenarioRoutes(input.financeYearId, input.scenarioId);
    return { ok: true, scenarioId: input.scenarioId };
  } catch (error) {
    return mapScenarioError(error);
  }
}
