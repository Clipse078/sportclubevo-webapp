import type { PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  requireFinanceStructureManage,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import {
  countFinanceStructureTemplateNodes,
  getFinanceStructureTemplate,
  type FinanceStructureTemplateDefinition,
  type FinanceStructureTemplateNode,
} from "@/lib/finance/structure/template-registry";
import { financeStructureIsEmpty } from "@/lib/finance/structure/build-structure-tree";
import { createFinancialReportingGroup } from "@/lib/finance/services/financial-reporting-group-service";
import { createFinancialAccount } from "@/lib/finance/services/financial-account-service";

type Db = Pick<
  PrismaClient,
  | "financialReportingGroup"
  | "financialAccount"
  | "financeConfiguration"
>;

export type FinanceStructureTemplatePreview = {
  templateKey: string;
  groupCount: number;
  accountCount: number;
  nodes: FinanceStructureTemplateNode[];
};

export async function previewFinanceStructureTemplate(
  templateKey: string,
): Promise<FinanceStructureTemplatePreview> {
  const template = getFinanceStructureTemplate(templateKey);
  if (!template) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Structure template not found.", 404);
  }
  const counts = countFinanceStructureTemplateNodes(template.root);
  return {
    templateKey: template.key,
    groupCount: counts.groups,
    accountCount: counts.accounts,
    nodes: template.root,
  };
}

export async function listFinanceStructureTemplateKeys(): Promise<string[]> {
  const { FINANCE_STRUCTURE_TEMPLATE_REGISTRY } = await import(
    "@/lib/finance/structure/template-registry"
  );
  return FINANCE_STRUCTURE_TEMPLATE_REGISTRY.map((t) => t.key);
}

async function assertTemplateApplicationAllowed(
  db: Db,
  ctx: FinanceAuthContext,
  templateKey: string,
): Promise<FinanceStructureTemplateDefinition> {
  requireFinanceStructureManage(ctx);
  const template = getFinanceStructureTemplate(templateKey);
  if (!template) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Structure template not found.", 404);
  }

  const config = await db.financeConfiguration.findUnique({
    where: { tenantId: ctx.tenantId },
  });
  if (config?.appliedStructureTemplateKey) {
    throw new FinanceDomainError(
      "FINANCE_TEMPLATE_ALREADY_APPLIED",
      "A starter template was already applied for this organisation.",
    );
  }

  const [groups, accounts] = await Promise.all([
    db.financialReportingGroup.findMany({ where: { tenantId: ctx.tenantId } }),
    db.financialAccount.findMany({ where: { tenantId: ctx.tenantId } }),
  ]);

  if (!financeStructureIsEmpty({ groups, accounts })) {
    throw new FinanceDomainError(
      "FINANCE_STRUCTURE_NOT_EMPTY",
      "Templates can only be applied to an empty financial structure.",
    );
  }

  return template;
}

async function instantiateTemplateNode(
  db: Db,
  ctx: FinanceAuthContext,
  node: FinanceStructureTemplateNode,
  parentGroupId: string | null,
  nameResolver: (nameKey: string) => string,
): Promise<void> {
  if (node.kind === "group") {
    const created = await createFinancialReportingGroup(db, ctx, {
      name: nameResolver(node.nameKey),
      parentId: parentGroupId,
    });
    for (const child of node.children) {
      await instantiateTemplateNode(db, ctx, child, created.id, nameResolver);
    }
    return;
  }

  if (!parentGroupId) {
    throw new FinanceDomainError(
      "FINANCE_INVALID_HIERARCHY",
      "Accounts must belong to a reporting group.",
    );
  }

  await createFinancialAccount(db, ctx, {
    name: nameResolver(node.nameKey),
    reportingGroupId: parentGroupId,
    canonicalSemantic: node.semantic,
  });
}

export async function applyFinanceStructureTemplate(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    templateKey: string;
    resolveLabel: (nameKey: string) => string;
  },
) {
  const template = await assertTemplateApplicationAllowed(db, ctx, input.templateKey);

  for (const rootNode of template.root) {
    await instantiateTemplateNode(db, ctx, rootNode, null, input.resolveLabel);
  }

  await db.financeConfiguration.upsert({
    where: { tenantId: ctx.tenantId },
    create: {
      tenantId: ctx.tenantId,
      appliedStructureTemplateKey: template.key,
    },
    update: {
      appliedStructureTemplateKey: template.key,
    },
  });

  return { applied: true as const, templateKey: template.key };
}

export async function loadFinanceStructureTemplateState(db: Db, ctx: FinanceAuthContext) {
  const config = await db.financeConfiguration.findUnique({
    where: { tenantId: ctx.tenantId },
    select: { appliedStructureTemplateKey: true },
  });
  return {
    appliedTemplateKey: config?.appliedStructureTemplateKey ?? null,
  };
}
