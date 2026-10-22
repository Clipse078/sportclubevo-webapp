import type { FinanceStructureAccountSemantic } from "@/lib/finance/structure/structure-presentation";

export type FinanceStructureTemplateNode =
  | {
      kind: "group";
      key: string;
      nameKey: string;
      children: FinanceStructureTemplateNode[];
    }
  | {
      kind: "account";
      key: string;
      nameKey: string;
      semantic: FinanceStructureAccountSemantic;
    };

export type FinanceStructureTemplateDefinition = {
  key: string;
  nameKey: string;
  descriptionKey: string;
  previewSummaryKey: string;
  root: FinanceStructureTemplateNode[];
};

/** Code-defined onboarding accelerators — not tenant schema. */
export const FINANCE_STRUCTURE_TEMPLATE_REGISTRY: FinanceStructureTemplateDefinition[] = [
  {
    key: "generic_income_expense_v1",
    nameKey: "structure.templates.generic_income_expense_v1.name",
    descriptionKey: "structure.templates.generic_income_expense_v1.description",
    previewSummaryKey: "structure.templates.generic_income_expense_v1.previewSummary",
    root: [
      {
        kind: "group",
        key: "income_root",
        nameKey: "structure.templates.generic_income_expense_v1.groups.income",
        children: [
          {
            kind: "account",
            key: "membership_income",
            nameKey: "structure.templates.generic_income_expense_v1.accounts.membership_income",
            semantic: "INCOME",
          },
          {
            kind: "account",
            key: "other_income",
            nameKey: "structure.templates.generic_income_expense_v1.accounts.other_income",
            semantic: "INCOME",
          },
        ],
      },
      {
        kind: "group",
        key: "expense_root",
        nameKey: "structure.templates.generic_income_expense_v1.groups.expense",
        children: [
          {
            kind: "account",
            key: "personnel_expense",
            nameKey: "structure.templates.generic_income_expense_v1.accounts.personnel_expense",
            semantic: "EXPENSE",
          },
          {
            kind: "account",
            key: "operations_expense",
            nameKey: "structure.templates.generic_income_expense_v1.accounts.operations_expense",
            semantic: "EXPENSE",
          },
        ],
      },
    ],
  },
];

export function getFinanceStructureTemplate(key: string): FinanceStructureTemplateDefinition | null {
  return FINANCE_STRUCTURE_TEMPLATE_REGISTRY.find((t) => t.key === key) ?? null;
}

export function countFinanceStructureTemplateNodes(
  nodes: FinanceStructureTemplateNode[],
): { groups: number; accounts: number } {
  let groups = 0;
  let accounts = 0;
  for (const node of nodes) {
    if (node.kind === "group") {
      groups += 1;
      const nested = countFinanceStructureTemplateNodes(node.children);
      groups += nested.groups;
      accounts += nested.accounts;
    } else {
      accounts += 1;
    }
  }
  return { groups, accounts };
}
