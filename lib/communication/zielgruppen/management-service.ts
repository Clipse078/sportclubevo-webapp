/**
 * SCE-COMM-02 — tenant-scoped Zielgruppen CRUD (organisation-wide communication resource).
 */

import { OrgUnitStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";
import {
  audienceSpecToEditorDefinition,
  buildRuleJsonFromEditor,
  extractRoleKeysFromAudience,
  ruleJsonToEditorDefinition,
} from "@/lib/communication/zielgruppen/rule-mapper";
import { parseTargetGroupRuleJson } from "@/lib/communication/zielgruppen/rule-document";
import { EMPTY_ZIELGRUPPE_EDITOR_DEFINITION } from "@/lib/communication/zielgruppen/editor-model";
import {
  validateZielgruppeDescription,
  validateZielgruppeEditorDefinition,
  validateZielgruppeName,
} from "@/lib/communication/zielgruppen/validation";
import { summarizeZielgruppeDefinition } from "@/lib/communication/zielgruppen/summary";

export class ZielgruppeManagementError extends Error {
  constructor(
    message: string,
    readonly code: "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "FORBIDDEN" = "VALIDATION",
  ) {
    super(message);
    this.name = "ZielgruppeManagementError";
  }
}

export type ListZielgruppenOptions = {
  tenantId: string;
  search?: string;
  statusFilter?: "ACTIVE" | "ARCHIVED" | "ALL";
};

export type ZielgruppeListRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: OrgUnitStatus;
  createdAt: Date;
  updatedAt: Date;
  summaryHeadline: string;
  summaryParts: string[];
};

async function resolveRoleKeysForTenant(tenantId: string, roleIds: string[]): Promise<string[]> {
  if (roleIds.length === 0) return [];
  const roles = await prisma.role.findMany({
    where: { id: { in: roleIds }, tenantId, scope: "TENANT" },
    select: { id: true, key: true },
  });
  if (roles.length !== roleIds.length) {
    throw new ZielgruppeManagementError("Ungültige Rollenauswahl.", "VALIDATION");
  }
  return roles.map((r) => r.key);
}

async function assertTenantScopedSelectors(
  tenantId: string,
  definition: ZielgruppeEditorDefinition,
): Promise<void> {
  if (definition.orgUnitIds.length > 0) {
    const rows = await prisma.orgUnit.findMany({
      where: { id: { in: definition.orgUnitIds } },
      select: { id: true, tenantId: true },
    });
    if (rows.length !== definition.orgUnitIds.length || rows.some((r) => r.tenantId !== tenantId)) {
      throw new ZielgruppeManagementError("Ungültige Organisationseinheit.", "FORBIDDEN");
    }
  }

  if (definition.teamIds.length > 0) {
    const rows = await prisma.team.findMany({
      where: { id: { in: definition.teamIds } },
      select: { id: true, tenantId: true },
    });
    if (rows.length !== definition.teamIds.length || rows.some((r) => r.tenantId !== tenantId)) {
      throw new ZielgruppeManagementError("Ungültiges Team.", "FORBIDDEN");
    }
  }

  const personIds = [...definition.includePersonIds, ...definition.excludePersonIds];
  if (personIds.length > 0) {
    const rows = await prisma.person.findMany({
      where: { id: { in: personIds } },
      select: { id: true, tenantId: true },
    });
    if (rows.length !== personIds.length || rows.some((r) => r.tenantId !== tenantId)) {
      throw new ZielgruppeManagementError("Ungültige Personenauswahl.", "FORBIDDEN");
    }
  }
}

export async function listZielgruppenForManagement(
  options: ListZielgruppenOptions,
): Promise<ZielgruppeListRow[]> {
  const { tenantId, search, statusFilter = "ACTIVE" } = options;
  const where: Prisma.TargetGroupWhereInput = { tenantId };

  if (statusFilter === "ACTIVE") {
    where.status = { not: "ARCHIVED" };
  } else if (statusFilter === "ARCHIVED") {
    where.status = "ARCHIVED";
  }

  if (search?.trim()) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { key: { contains: term, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.targetGroup.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      status: true,
      ruleJson: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return rows.map((row) => {
    const definition = ruleJsonToEditorDefinition(row.ruleJson);
    const summary = summarizeZielgruppeDefinition(definition);
    return {
      id: row.id,
      key: row.key,
      name: row.name,
      description: row.description,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      summaryHeadline: summary.headline,
      summaryParts: summary.parts,
    };
  });
}

export async function getZielgruppeForManagement(tenantId: string, targetGroupId: string) {
  const row = await prisma.targetGroup.findUnique({
    where: { id: targetGroupId },
  });
  if (!row || row.tenantId !== tenantId) return null;

  const parsed = parseTargetGroupRuleJson(row.ruleJson);
  let definition =
    parsed.audience != null
      ? audienceSpecToEditorDefinition(parsed.audience)
      : parsed.resolverClause != null
        ? ruleJsonToEditorDefinition(row.ruleJson)
        : { ...EMPTY_ZIELGRUPPE_EDITOR_DEFINITION };

  const roleKeys =
    parsed.audience != null
      ? extractRoleKeysFromAudience(parsed.audience)
      : [];
  if (roleKeys.length > 0) {
    const roles = await prisma.role.findMany({
      where: { tenantId, key: { in: roleKeys } },
      select: { id: true },
    });
    definition = { ...definition, roleIds: roles.map((r) => r.id) };
  }

  return {
    ...row,
    definition,
    summary: summarizeZielgruppeDefinition(definition),
  };
}

export async function createZielgruppe(input: {
  tenantId: string;
  name: string;
  description?: string | null;
  key?: string;
  status?: OrgUnitStatus;
  definition: ZielgruppeEditorDefinition;
}) {
  const nameErr = validateZielgruppeName(input.name);
  if (nameErr) throw new ZielgruppeManagementError(nameErr);
  const descErr = validateZielgruppeDescription(input.description);
  if (descErr) throw new ZielgruppeManagementError(descErr);

  await assertTenantScopedSelectors(input.tenantId, input.definition);
  const roleKeys = await resolveRoleKeysForTenant(input.tenantId, input.definition.roleIds);
  const defErr = validateZielgruppeEditorDefinition(input.definition, roleKeys);
  if (defErr) throw new ZielgruppeManagementError(defErr);

  const rawKey = (input.key ?? "").trim();
  const key =
    rawKey ||
    input.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const existing = await prisma.targetGroup.findFirst({
    where: { tenantId: input.tenantId, key },
    select: { id: true },
  });
  if (existing) {
    throw new ZielgruppeManagementError(`Key „${key}" ist bereits vergeben.`, "CONFLICT");
  }

  const ruleJson = buildRuleJsonFromEditor({
    definition: input.definition,
    roleKeys,
  });

  return prisma.targetGroup.create({
    data: {
      tenantId: input.tenantId,
      key,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      status: input.status ?? OrgUnitStatus.ACTIVE,
      ruleJson: ruleJson as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function updateZielgruppe(input: {
  tenantId: string;
  targetGroupId: string;
  name?: string;
  description?: string | null;
  status?: OrgUnitStatus;
  definition?: ZielgruppeEditorDefinition;
}) {
  const existing = await prisma.targetGroup.findUnique({
    where: { id: input.targetGroupId },
    select: { id: true, tenantId: true },
  });
  if (!existing || existing.tenantId !== input.tenantId) {
    throw new ZielgruppeManagementError("Zielgruppe nicht gefunden.", "NOT_FOUND");
  }

  const data: Prisma.TargetGroupUpdateInput = {};

  if (input.name !== undefined) {
    const nameErr = validateZielgruppeName(input.name);
    if (nameErr) throw new ZielgruppeManagementError(nameErr);
    data.name = input.name.trim();
  }
  if (input.description !== undefined) {
    const descErr = validateZielgruppeDescription(input.description);
    if (descErr) throw new ZielgruppeManagementError(descErr);
    data.description = input.description?.trim() || null;
  }
  if (input.status !== undefined) {
    data.status = input.status;
  }

  if (input.definition) {
    await assertTenantScopedSelectors(input.tenantId, input.definition);
    const roleKeys = await resolveRoleKeysForTenant(input.tenantId, input.definition.roleIds);
    const defErr = validateZielgruppeEditorDefinition(input.definition, roleKeys);
    if (defErr) throw new ZielgruppeManagementError(defErr);
    data.ruleJson = buildRuleJsonFromEditor({
      definition: input.definition,
      roleKeys,
    }) as unknown as Prisma.InputJsonValue;
  }

  return prisma.targetGroup.update({
    where: { id: input.targetGroupId },
    data,
  });
}

export async function archiveZielgruppe(tenantId: string, targetGroupId: string) {
  return updateZielgruppe({
    tenantId,
    targetGroupId,
    status: OrgUnitStatus.ARCHIVED,
  });
}

export async function restoreZielgruppe(tenantId: string, targetGroupId: string) {
  return updateZielgruppe({
    tenantId,
    targetGroupId,
    status: OrgUnitStatus.ACTIVE,
  });
}
