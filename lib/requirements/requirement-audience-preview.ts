/**
 * AUFGABEN-06G7 / SCE-SELECTOR-02R5 — server-side draft audience preview (authoritative Person resolution).
 */

import { prisma } from "@/lib/db/prisma";
import { resolveRequirementAudiencePersonIdsFromAudienceInput } from "./requirement-audience";
import type { RequirementDraftAudienceInput } from "./types";
import { RequirementTenantMismatchError } from "./errors";

export type RequirementAudiencePreviewBreakdown = {
  explicitPersonCount: number;
  teamPersonCount: number;
  orgUnitPersonCount: number;
  rolePersonCount: number;
  targetGroupPersonCount: number;
  resolvedTotal: number;
};

export type RequirementAudiencePreviewPersonRow = {
  personId: string;
  displayName: string;
  secondary: string | null;
};

export type RequirementAudiencePreviewResult = RequirementAudiencePreviewBreakdown & {
  persons: RequirementAudiencePreviewPersonRow[];
};

function dedupe(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

export async function previewRequirementDraftAudience(
  tenantId: string,
  input: RequirementDraftAudienceInput,
  options?: { includePersonRows?: boolean; personRowLimit?: number },
): Promise<RequirementAudiencePreviewResult> {
  const personIds = dedupe(input.personIds ?? []);
  const teamIds = dedupe(input.teamIds ?? []);
  const orgUnitIds = dedupe(input.orgUnitIds ?? []);
  const roleIds = dedupe(input.roleIds ?? []);
  const targetGroupIds = dedupe(input.targetGroupIds ?? []);

  try {
    const resolvedIds = await resolveRequirementAudiencePersonIdsFromAudienceInput(tenantId, input);

    const includePersonRows = options?.includePersonRows === true;
    const limit = Math.min(500, Math.max(1, options?.personRowLimit ?? 200));
    const slice = includePersonRows ? resolvedIds.slice(0, limit) : [];

    const personRows =
      slice.length > 0
        ? await prisma.person.findMany({
            where: { tenantId, id: { in: slice } },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              email: true,
            },
          })
        : [];

    const rowById = new Map(personRows.map((row) => [row.id, row]));

    return {
      explicitPersonCount: personIds.length,
      teamPersonCount: teamIds.length,
      orgUnitPersonCount: orgUnitIds.length,
      rolePersonCount: roleIds.length,
      targetGroupPersonCount: targetGroupIds.length,
      resolvedTotal: resolvedIds.length,
      persons: includePersonRows
        ? slice.map((personId) => {
            const row = rowById.get(personId);
            const displayName =
              row?.displayName?.trim() ||
              `${row?.firstName ?? ""} ${row?.lastName ?? ""}`.trim() ||
              personId;
            return {
              personId,
              displayName,
              secondary: row?.email?.trim() || null,
            };
          })
        : [],
    };
  } catch {
    throw new RequirementTenantMismatchError("One or more audience selectors are invalid for this tenant");
  }
}
