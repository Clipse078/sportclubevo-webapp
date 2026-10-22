
/** FIN-01C management-finance account semantics exposed in structure builder UI. */
export const FINANCE_STRUCTURE_ACCOUNT_SEMANTICS = ["INCOME", "EXPENSE"] as const;

export type FinanceStructureAccountSemantic =
  (typeof FINANCE_STRUCTURE_ACCOUNT_SEMANTICS)[number];

export function isFinanceStructureAccountSemantic(
  value: string,
): value is FinanceStructureAccountSemantic {
  return (FINANCE_STRUCTURE_ACCOUNT_SEMANTICS as readonly string[]).includes(value);
}

export const FINANCE_ACCOUNT_SEMANTIC_PRESENTATION: Record<
  FinanceStructureAccountSemantic,
  { labelKey: string; descriptionKey: string }
> = {
  INCOME: {
    labelKey: "structure.semantics.income.label",
    descriptionKey: "structure.semantics.income.description",
  },
  EXPENSE: {
    labelKey: "structure.semantics.expense.label",
    descriptionKey: "structure.semantics.expense.description",
  },
};

export function getFinanceAccountSemanticPresentation(
  semantic: FinanceStructureAccountSemantic,
) {
  return FINANCE_ACCOUNT_SEMANTIC_PRESENTATION[semantic];
}
