"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { FinanceWorkspaceDisclosure } from "@/components/admin/finance/FinanceWorkspaceDisclosure";
import {
  formatManagementPnlMeasureCell,
  formatManagementPnlVarianceDelta,
  formatManagementPnlVariancePercent,
} from "@/lib/finance/presentation/format-management-pnl-measure";
import {
  financeVarianceComparisonSemanticTextClass,
  financeVarianceFavorabilityLabelKey,
} from "@/lib/finance/presentation/finance-variance-favorability-presentation";
import type {
  SerializedFinanceManagementPnlReadModel,
  SerializedManagementPnlAccountRow,
  SerializedManagementPnlGroupRow,
  SerializedManagementPnlUnassignedResidualRow,
} from "@/lib/finance/presentation/serialize-management-pnl-read-model";
import {
  FinanceVarianceComparisonColGroup,
  FINANCE_MANAGEMENT_PNL_ACCOUNT_CELL_CLASS,
  FINANCE_MANAGEMENT_PNL_HEAD_ACCOUNT_CLASS,
  FINANCE_MANAGEMENT_PNL_HEAD_NUMERIC_CLASS,
  FINANCE_MANAGEMENT_PNL_NUMERIC_CELL_CLASS,
  FINANCE_MANAGEMENT_PNL_TABLE_HEAD_ROW_CLASS,
  FINANCE_MANAGEMENT_PNL_TABLE_SURFACE_CLASS,
  FINANCE_VARIANCE_COMPARISON_TABLE_CLASS,
} from "@/lib/finance/presentation/finance-variance-comparison-table-layout";
import { FINANCE_SUMMARY_STRIP_SURFACE_CLASS } from "@/lib/finance/finance-workspace-surfaces";
import type { VarianceFavorability } from "@/lib/finance/actual/variance-semantics";
import {
  financeComparativeGrainExplanationLabelKey,
  presentFinanceComparativeAttentionInsight,
  type FinanceComparativeAttentionLabelMap,
} from "@/lib/finance/presentation/finance-comparative-intelligence-presentation";
import type { FinanceComparativeAttentionInsight } from "@/lib/finance/reporting/finance-comparative-intelligence-read-model";

type FinanceManagementPnlPanelLabels = {
  pageContextYear: string;
  interpretationTitle: string;
  budgetedResult: string;
  expectedResult: string;
  forecastVsBudgetVariance: string;
  driversTitle: string;
  driversSubtitle: string | null;
  topFavourable: string;
  topUnfavourable: string;
  incomeSection: string;
  expenseSection: string;
  incomeSectionTotal: string;
  expenseSectionTotal: string;
  managementResult: string;
  columnBudget: string;
  columnActual: string;
  columnActualYtd: string;
  columnForecast: string;
  columnVariance: string;
  columnVariancePercent: string;
  unassignedGroup: string;
  archivedAccount: string;
  expandAccounts: string;
  collapseAccounts: string;
  noStructureTitle: string;
  noStructureBody: string;
  openStructure: string;
  noStructureViewOnly: string;
  favorabilityFavorable: string;
  favorabilityUnfavorable: string;
  favorabilityOnPlan: string;
  partialSourcesHint: string;
  unassignedHint: string;
  investigateAccount: string;
  investigateGroup: string;
  attentionSignalsTitle: string;
  grainExplanationYtdVsAnnualPlan: string;
  grainExplanationAnnualActualAndPlan: string;
} & FinanceComparativeAttentionLabelMap;

type FinanceManagementPnlPanelProps = {
  model: SerializedFinanceManagementPnlReadModel;
  formattingLocale: string;
  canConfigureStructure: boolean;
  labels: FinanceManagementPnlPanelLabels;
  focusedAccountId?: string | null;
  focusedGroupId?: string | null;
  onInvestigateAccount?: (accountId: string) => void;
  onInvestigateGroup?: (groupId: string) => void;
  onInvestigateDriver?: (driver: { kind: "ACCOUNT" | "REPORTING_GROUP"; id: string }) => void;
};

function favorabilityLabel(
  labels: FinanceManagementPnlPanelLabels,
  favorability: VarianceFavorability,
): string {
  const key = financeVarianceFavorabilityLabelKey(favorability);
  if (key === "favorabilityFavorable") return labels.favorabilityFavorable;
  if (key === "favorabilityUnfavorable") return labels.favorabilityUnfavorable;
  return labels.favorabilityOnPlan;
}

type VariancePresentation = "compact" | "emphasized";

function VarianceCell(props: {
  slice: SerializedFinanceManagementPnlReadModel["managementResult"]["forecastVsBudget"];
  currency: string | null;
  locale: string;
  labels: FinanceManagementPnlPanelLabels;
  presentation: VariancePresentation;
  emphasize?: boolean;
}) {
  const slice = props.slice;
  const hasComparison = slice.availability === "AVAILABLE";
  const favorability = slice.favorability;
  const favorabilityText =
    hasComparison && favorability ? favorabilityLabel(props.labels, favorability) : null;

  return (
    <td
      className={cn(
        FINANCE_MANAGEMENT_PNL_NUMERIC_CELL_CLASS,
        props.emphasize && "font-semibold",
        financeVarianceComparisonSemanticTextClass({
          favorability: slice.favorability,
          hasComparison,
        }),
      )}
      data-finance-variance-favorability={hasComparison ? slice.favorability : undefined}
    >
      <span className="inline-flex flex-col items-end gap-0.5">
        <span className="tabular-nums">
          {formatManagementPnlVarianceDelta(slice, props.currency, props.locale)}
        </span>
        {hasComparison && favorability && favorabilityText ? (
          <span className="text-xs font-normal text-[var(--muted)]">{favorabilityText}</span>
        ) : null}
        <span className="text-xs font-normal text-[var(--muted)] tabular-nums">
          {formatManagementPnlVariancePercent(slice, props.locale)}
        </span>
      </span>
    </td>
  );
}

function MeasureCells(props: {
  approvedBudget: SerializedFinanceManagementPnlReadModel["managementResult"]["approvedBudget"];
  actual: SerializedFinanceManagementPnlReadModel["managementResult"]["actual"];
  currentForecast: SerializedFinanceManagementPnlReadModel["managementResult"]["currentForecast"];
  forecastVsBudget: SerializedFinanceManagementPnlReadModel["managementResult"]["forecastVsBudget"];
  currency: string | null;
  locale: string;
  labels: FinanceManagementPnlPanelLabels;
  actualHeaderMode: "annual" | "ytd";
  emphasize?: boolean;
  variancePresentation?: VariancePresentation;
}) {
  const variancePresentation = props.variancePresentation ?? "compact";
  return (
    <>
      <td
        className={cn(
          FINANCE_MANAGEMENT_PNL_NUMERIC_CELL_CLASS,
          props.emphasize && "font-semibold",
        )}
      >
        {formatManagementPnlMeasureCell(props.approvedBudget, props.currency, props.locale)}
      </td>
      <td
        className={cn(
          FINANCE_MANAGEMENT_PNL_NUMERIC_CELL_CLASS,
          props.emphasize && "font-semibold",
          "hidden md:table-cell",
        )}
      >
        {formatManagementPnlMeasureCell(props.actual, props.currency, props.locale)}
      </td>
      <td
        className={cn(
          FINANCE_MANAGEMENT_PNL_NUMERIC_CELL_CLASS,
          props.emphasize && "font-semibold",
        )}
      >
        {formatManagementPnlMeasureCell(props.currentForecast, props.currency, props.locale)}
      </td>
      <VarianceCell
        slice={props.forecastVsBudget}
        currency={props.currency}
        locale={props.locale}
        labels={props.labels}
        presentation={variancePresentation}
        emphasize={props.emphasize}
      />
    </>
  );
}

function investigationTargetAriaLabel(actionLabel: string, targetName: string): string {
  return `${actionLabel}: ${targetName}`;
}

function attentionInsightReactKey(insight: FinanceComparativeAttentionInsight): string {
  switch (insight.kind) {
    case "FAVORABLE_DRIVER":
    case "UNFAVORABLE_DRIVER":
      return `${insight.kind}-${insight.driver.kind}-${insight.driver.id}`;
    default:
      return insight.kind;
  }
}

function ComparativeAttentionInsights(props: {
  insights: FinanceComparativeAttentionInsight[];
  labels: FinanceManagementPnlPanelLabels;
  currency: string | null;
  locale: string;
  investigateLabel: string;
  onInvestigateDriver?: (driver: { kind: "ACCOUNT" | "REPORTING_GROUP"; id: string }) => void;
}) {
  const overall = props.insights.find((i) => i.kind === "OVERALL_RESULT");
  const drivers = props.insights.filter(
    (i) => i.kind === "FAVORABLE_DRIVER" || i.kind === "UNFAVORABLE_DRIVER",
  );
  const statusOnly = props.insights.filter(
    (i) =>
      i.kind === "MISSING_APPROVED_BUDGET" ||
      i.kind === "MISSING_CURRENT_FORECAST",
  );

  return (
    <div className="space-y-3">
      {overall ? (
        <div data-finance-comparative-attention-insight={overall.kind}>
          {(() => {
            const copy = presentFinanceComparativeAttentionInsight(
              overall,
              props.labels,
              props.currency,
              props.locale,
            );
            return (
              <>
                <p className="text-sm font-semibold text-[var(--foreground)]">{copy.title}</p>
                {copy.detail ? (
                  <p className="mt-0.5 text-sm text-[var(--muted)]">{copy.detail}</p>
                ) : null}
              </>
            );
          })()}
        </div>
      ) : null}

      {statusOnly.map((insight) => {
        const copy = presentFinanceComparativeAttentionInsight(
          insight,
          props.labels,
          props.currency,
          props.locale,
        );
        return (
          <p
            key={attentionInsightReactKey(insight)}
            className="text-sm text-[var(--foreground)]"
            data-finance-comparative-attention-insight={insight.kind}
          >
            {copy.title}
          </p>
        );
      })}

      {drivers.length > 0 ? (
        <div
          className="grid gap-3 sm:grid-cols-2"
          data-finance-comparative-attention-drivers
        >
          {drivers.map((insight) => {
            const copy = presentFinanceComparativeAttentionInsight(
              insight,
              props.labels,
              props.currency,
              props.locale,
            );
            const driver =
              insight.kind === "FAVORABLE_DRIVER" || insight.kind === "UNFAVORABLE_DRIVER"
                ? insight.driver
                : null;
            const content = (
              <>
                <p className="text-xs font-medium text-[var(--muted)]">{copy.title}</p>
                <p
                  className={cn(
                    "mt-0.5 text-sm font-medium tabular-nums text-[var(--foreground)]",
                    driver
                      ? financeVarianceComparisonSemanticTextClass({
                          favorability: driver.comparison.favorability,
                          hasComparison: driver.comparison.availability === "AVAILABLE",
                        })
                      : undefined,
                  )}
                >
                  {copy.detail}
                </p>
              </>
            );

            if (driver && props.onInvestigateDriver) {
              return (
                <button
                  key={attentionInsightReactKey(insight)}
                  type="button"
                  data-finance-comparative-attention-insight={insight.kind}
                  data-finance-pnl-investigate="driver"
                  className="rounded-md px-1 py-1 text-left hover:bg-[var(--surface-2)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
                  aria-label={investigationTargetAriaLabel(props.investigateLabel, driver.name)}
                  onClick={() =>
                    props.onInvestigateDriver!({ kind: driver.kind, id: driver.id })
                  }
                >
                  {content}
                </button>
              );
            }

            return (
              <div
                key={attentionInsightReactKey(insight)}
                data-finance-comparative-attention-insight={insight.kind}
              >
                {content}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function AccountRow(props: {
  row: SerializedManagementPnlAccountRow;
  depth: number;
  currency: string | null;
  locale: string;
  labels: FinanceManagementPnlPanelLabels;
  actualHeaderMode: "annual" | "ytd";
  focused?: boolean;
  onInvestigate?: (accountId: string) => void;
}) {
  const canInvestigate = Boolean(props.onInvestigate);
  return (
    <tr
      className={cn(
        "border-t border-[var(--sce-surface-border-subtle)]/60",
        props.focused && "bg-[var(--sce-surface-dense)]/80",
      )}
      data-finance-pnl-row="account"
      data-finance-pnl-account-id={props.row.accountId}
      data-finance-pnl-drillable={canInvestigate ? "true" : undefined}
    >
      <td
        className={cn(FINANCE_MANAGEMENT_PNL_ACCOUNT_CELL_CLASS, "pl-8")}
        style={{ paddingLeft: `${16 + props.depth * 12}px` }}
      >
        <div className="flex min-w-0 items-start gap-2">
          {canInvestigate ? (
            <button
              type="button"
              data-finance-pnl-investigate="account"
              className="group/account inline-flex min-w-0 max-w-full items-center gap-1 rounded-sm text-left font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
              aria-label={investigationTargetAriaLabel(props.labels.investigateAccount, props.row.name)}
              onClick={() => props.onInvestigate?.(props.row.accountId)}
            >
              <span className="truncate">{props.row.name}</span>
              <ChevronRight
                className="h-3.5 w-3.5 shrink-0 text-[var(--muted)] opacity-70 transition-opacity group-hover/account:opacity-100 group-focus-visible/account:opacity-100"
                aria-hidden
              />
            </button>
          ) : (
            <span className="font-medium text-[var(--foreground)]">{props.row.name}</span>
          )}
          {props.row.lifecycle === "ARCHIVED" ? (
            <span className="shrink-0 text-xs text-[var(--muted)]">({props.labels.archivedAccount})</span>
          ) : null}
        </div>
      </td>
      <MeasureCells
        approvedBudget={props.row.approvedBudget}
        actual={props.row.actual}
        currentForecast={props.row.currentForecast}
        forecastVsBudget={props.row.forecastVsBudget}
        currency={props.currency}
        locale={props.locale}
        labels={props.labels}
        actualHeaderMode={props.actualHeaderMode}
      />
    </tr>
  );
}

function GroupBlock(props: {
  node: SerializedManagementPnlGroupRow;
  depth: number;
  currency: string | null;
  locale: string;
  labels: FinanceManagementPnlPanelLabels;
  actualHeaderMode: "annual" | "ytd";
  focusedAccountId?: string | null;
  focusedGroupId?: string | null;
  onInvestigateAccount?: (accountId: string) => void;
  onInvestigateGroup?: (groupId: string) => void;
}) {
  const accountChildren = props.node.children.filter((c) => c.kind === "account");
  const groupChildren = props.node.children.filter((c) => c.kind === "reporting_group");
  const [expanded, setExpanded] = useState(accountChildren.length <= 4);

  return (
    <>
      <tr
        className={cn(
          "border-t border-[var(--sce-surface-border-subtle)]",
          props.focusedGroupId === props.node.groupId && "bg-[var(--sce-surface-dense)]/80",
        )}
        data-finance-pnl-row="group"
        data-finance-pnl-group-id={props.node.groupId}
        data-finance-pnl-drillable={props.onInvestigateGroup ? "true" : undefined}
      >
        <td
          className={FINANCE_MANAGEMENT_PNL_ACCOUNT_CELL_CLASS}
          style={{ paddingLeft: `${16 + props.depth * 12}px` }}
        >
          <div className="flex min-w-0 items-start gap-2">
            {accountChildren.length > 0 ? (
              <button
                type="button"
                data-finance-pnl-expand="group"
                className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
                aria-expanded={expanded}
                aria-label={expanded ? props.labels.collapseAccounts : props.labels.expandAccounts}
                onClick={() => setExpanded((open) => !open)}
              >
                <ChevronRight
                  className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")}
                  aria-hidden
                />
              </button>
            ) : (
              <span className="inline-block w-6 shrink-0" aria-hidden />
            )}
            <span className="min-w-0 flex-1 font-semibold text-[var(--foreground)]">{props.node.name}</span>
            {props.onInvestigateGroup ? (
              <button
                type="button"
                data-finance-pnl-investigate="group"
                className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
                aria-label={investigationTargetAriaLabel(props.labels.investigateGroup, props.node.name)}
                onClick={() => props.onInvestigateGroup?.(props.node.groupId)}
              >
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">{props.labels.investigateGroup}</span>
              </button>
            ) : null}
          </div>
        </td>
        <MeasureCells
          approvedBudget={props.node.approvedBudget}
          actual={props.node.actual}
          currentForecast={props.node.currentForecast}
          forecastVsBudget={props.node.forecastVsBudget}
          currency={props.currency}
          locale={props.locale}
          labels={props.labels}
          actualHeaderMode={props.actualHeaderMode}
        />
      </tr>
      {expanded
        ? accountChildren.map((child) => (
            <AccountRow
              key={child.accountId}
              row={child}
              depth={props.depth + 1}
              currency={props.currency}
              locale={props.locale}
              labels={props.labels}
              actualHeaderMode={props.actualHeaderMode}
              focused={props.focusedAccountId === child.accountId}
              onInvestigate={props.onInvestigateAccount}
            />
          ))
        : null}
      {groupChildren.map((child) =>
        child.kind === "reporting_group" ? (
          <GroupBlock
            key={child.groupId}
            node={child}
            depth={props.depth + 1}
            currency={props.currency}
            locale={props.locale}
            labels={props.labels}
            actualHeaderMode={props.actualHeaderMode}
            focusedAccountId={props.focusedAccountId}
            focusedGroupId={props.focusedGroupId}
            onInvestigateAccount={props.onInvestigateAccount}
            onInvestigateGroup={props.onInvestigateGroup}
          />
        ) : null,
      )}
    </>
  );
}

function UnassignedBlock(props: {
  node: SerializedManagementPnlUnassignedResidualRow;
  currency: string | null;
  locale: string;
  labels: FinanceManagementPnlPanelLabels;
  actualHeaderMode: "annual" | "ytd";
  focusedAccountId?: string | null;
  onInvestigateAccount?: (accountId: string) => void;
}) {
  return (
    <FinanceWorkspaceDisclosure
      variant="row"
      title={props.labels.unassignedGroup}
      summary={props.labels.unassignedHint}
      expandLabel={props.labels.expandAccounts}
      collapseLabel={props.labels.collapseAccounts}
      defaultExpanded={props.node.accounts.length <= 3}
      data-finance-disclosure="pnl-unassigned"
    >
      <table className={FINANCE_VARIANCE_COMPARISON_TABLE_CLASS}>
        <tbody>
          {props.node.accounts.map((account) => (
            <AccountRow
              key={account.accountId}
              row={account}
              depth={1}
              currency={props.currency}
              locale={props.locale}
              labels={props.labels}
              actualHeaderMode={props.actualHeaderMode}
              focused={props.focusedAccountId === account.accountId}
              onInvestigate={props.onInvestigateAccount}
            />
          ))}
        </tbody>
      </table>
    </FinanceWorkspaceDisclosure>
  );
}

function SectionTable(props: {
  title: string;
  sectionTotalLabel: string;
  section: SerializedFinanceManagementPnlReadModel["incomeSection"];
  currency: string | null;
  locale: string;
  labels: FinanceManagementPnlPanelLabels;
  actualHeaderMode: "annual" | "ytd";
  actualColumnLabel: string;
  focusedAccountId?: string | null;
  focusedGroupId?: string | null;
  onInvestigateAccount?: (accountId: string) => void;
  onInvestigateGroup?: (groupId: string) => void;
}) {
  return (
    <section className="min-w-0 space-y-2" data-finance-pnl-section={props.section.semantic}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {props.title}
      </h3>
      <div className={FINANCE_MANAGEMENT_PNL_TABLE_SURFACE_CLASS}>
        <table className={FINANCE_VARIANCE_COMPARISON_TABLE_CLASS} data-finance-pnl-table>
          <FinanceVarianceComparisonColGroup mode="MANAGEMENT_PNL" />
          <thead>
            <tr className={FINANCE_MANAGEMENT_PNL_TABLE_HEAD_ROW_CLASS}>
              <th scope="col" className={FINANCE_MANAGEMENT_PNL_HEAD_ACCOUNT_CLASS}>
                <span className="sr-only">{props.title}</span>
              </th>
              <th scope="col" className={FINANCE_MANAGEMENT_PNL_HEAD_NUMERIC_CLASS}>
                {props.labels.columnBudget}
              </th>
              <th
                scope="col"
                className={cn(FINANCE_MANAGEMENT_PNL_HEAD_NUMERIC_CLASS, "hidden md:table-cell")}
              >
                {props.actualColumnLabel}
              </th>
              <th scope="col" className={FINANCE_MANAGEMENT_PNL_HEAD_NUMERIC_CLASS}>
                {props.labels.columnForecast}
              </th>
              <th scope="col" className={FINANCE_MANAGEMENT_PNL_HEAD_NUMERIC_CLASS}>
                <span>{props.labels.columnVariance}</span>
                <span className="sr-only"> ({props.labels.columnVariancePercent})</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {props.section.nodes.map((node) => {
              if (node.kind === "reporting_group") {
                return (
                  <GroupBlock
                    key={node.groupId}
                    node={node}
                    depth={0}
                    currency={props.currency}
                    locale={props.locale}
                    labels={props.labels}
                    actualHeaderMode={props.actualHeaderMode}
                    focusedAccountId={props.focusedAccountId}
                    focusedGroupId={props.focusedGroupId}
                    onInvestigateAccount={props.onInvestigateAccount}
                    onInvestigateGroup={props.onInvestigateGroup}
                  />
                );
              }
              if (node.kind === "account") {
                return (
                  <AccountRow
                    key={node.accountId}
                    row={node}
                    depth={0}
                    currency={props.currency}
                    locale={props.locale}
                    labels={props.labels}
                    actualHeaderMode={props.actualHeaderMode}
                    focused={props.focusedAccountId === node.accountId}
                    onInvestigate={props.onInvestigateAccount}
                  />
                );
              }
              return null;
            })}
            <tr
              className="border-t border-[var(--sce-color-border-standard)] bg-[var(--sce-surface-dense)]"
              data-finance-pnl-row="section-total"
            >
              <td className={cn(FINANCE_MANAGEMENT_PNL_ACCOUNT_CELL_CLASS, "font-semibold")}>
                {props.sectionTotalLabel}
              </td>
              <MeasureCells
                approvedBudget={props.section.sectionTotal.approvedBudget}
                actual={props.section.sectionTotal.actual}
                currentForecast={props.section.sectionTotal.currentForecast}
                forecastVsBudget={props.section.sectionTotal.forecastVsBudget}
                currency={props.currency}
                locale={props.locale}
                labels={props.labels}
                actualHeaderMode={props.actualHeaderMode}
                emphasize
                variancePresentation="emphasized"
              />
            </tr>
          </tbody>
        </table>
      </div>
      {props.section.nodes
        .filter((n): n is SerializedManagementPnlUnassignedResidualRow => n.kind === "unassigned_residual")
        .map((node) => (
          <UnassignedBlock
            key={`${node.canonicalSemantic}-unassigned`}
            node={node}
            currency={props.currency}
            locale={props.locale}
            labels={props.labels}
            actualHeaderMode={props.actualHeaderMode}
            focusedAccountId={props.focusedAccountId}
            onInvestigateAccount={props.onInvestigateAccount}
          />
        ))}
    </section>
  );
}

export function FinanceManagementPnlPanel({
  model,
  formattingLocale,
  canConfigureStructure,
  labels,
  focusedAccountId = null,
  focusedGroupId = null,
  onInvestigateAccount,
  onInvestigateGroup,
  onInvestigateDriver,
}: FinanceManagementPnlPanelProps) {
  const actualHeaderMode = model.actualGrain === "YTD" ? "ytd" : "annual";

  const actualCutoffLabel = useMemo(() => {
    if (!model.actualCutoffDate) return null;
    try {
      return new Intl.DateTimeFormat(formattingLocale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(model.actualCutoffDate));
    } catch {
      return model.actualCutoffDate.slice(0, 10);
    }
  }, [model.actualCutoffDate, formattingLocale]);

  const actualColumnLabel = useMemo(() => {
    if (actualHeaderMode === "annual") {
      return labels.columnActual;
    }
    if (actualCutoffLabel) {
      return `${labels.columnActualYtd} ${actualCutoffLabel}`;
    }
    return labels.columnActualYtd;
  }, [actualHeaderMode, actualCutoffLabel, labels.columnActual, labels.columnActualYtd]);

  if (model.availability === "NO_STRUCTURE") {
    return (
      <div
        className="rounded-lg border border-[var(--sce-surface-border-subtle)] bg-[var(--surface-1)]/50 p-6"
        data-finance-pnl-empty="no-structure"
      >
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{labels.noStructureTitle}</h2>
        <p className="mt-2 max-w-prose text-sm text-[var(--muted)]">{labels.noStructureBody}</p>
        {canConfigureStructure ? (
          <Link
            href="/dashboard/finance/structure"
            className="mt-4 inline-flex h-9 items-center rounded-md bg-[var(--sce-primary)] px-4 text-sm font-medium text-[var(--sce-primary-foreground)]"
          >
            {labels.openStructure}
          </Link>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">{labels.noStructureViewOnly}</p>
        )}
      </div>
    );
  }

  const interpretationSlice = model.interpretation.forecastVsBudgetManagementResult;
  const hasInterpretation = interpretationSlice.availability === "AVAILABLE";
  const comparative = model.comparativeIntelligence;
  const grainExplanationKey = comparative.actualContext.grainExplanationKey;
  const grainExplanationText =
    grainExplanationKey != null
      ? labels[financeComparativeGrainExplanationLabelKey(grainExplanationKey)]
      : null;
  const attentionInsights = comparative.attentionInsights;

  return (
    <div
      className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4"
      data-finance-pnl-panel
      data-finance-comparative-intelligence
      data-finance-comparative-actual-role={comparative.actualContext.presentationRole}
      data-finance-comparative-actual-vs-budget-role={comparative.actualVsBudgetVarianceRole}
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
        <span>
          {labels.pageContextYear}:{" "}
          <span className="font-medium text-[var(--foreground)]">{model.financeYearName}</span>
        </span>
        {actualCutoffLabel ? (
          <span data-finance-pnl-actual-cutoff={actualCutoffLabel}>
            {labels.columnActualYtd}: {actualCutoffLabel}
          </span>
        ) : null}
      </div>

      <section
        className={cn(FINANCE_SUMMARY_STRIP_SURFACE_CLASS, "space-y-2")}
        aria-labelledby="finance-pnl-interpretation"
        data-finance-pnl-interpretation
      >
        <h2 id="finance-pnl-interpretation" className="text-sm font-semibold text-[var(--foreground)]">
          {labels.interpretationTitle}
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:divide-x sm:divide-[var(--sce-surface-border-subtle)]">
          <div>
            <dt className="text-xs font-medium text-[var(--muted)]">{labels.budgetedResult}</dt>
            <dd className="mt-1 tabular-nums text-sm font-medium">
              {formatManagementPnlMeasureCell(
                model.managementResult.approvedBudget,
                model.baseCurrency,
                formattingLocale,
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--muted)]">{labels.expectedResult}</dt>
            <dd className="mt-1 tabular-nums text-sm font-medium">
              {formatManagementPnlMeasureCell(
                model.managementResult.currentForecast,
                model.baseCurrency,
                formattingLocale,
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--muted)]">
              {labels.forecastVsBudgetVariance}
            </dt>
            <dd
              className={cn(
                "mt-1 tabular-nums text-sm font-semibold",
                financeVarianceComparisonSemanticTextClass({
                  favorability: interpretationSlice.favorability,
                  hasComparison: hasInterpretation,
                }),
              )}
              data-finance-comparative-primary-variance
            >
              <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                {formatManagementPnlVarianceDelta(
                  interpretationSlice,
                  model.baseCurrency,
                  formattingLocale,
                )}
                {hasInterpretation && interpretationSlice.favorability ? (
                  <span className="text-xs font-normal text-[var(--muted)]">
                    {favorabilityLabel(labels, interpretationSlice.favorability)}
                  </span>
                ) : null}
              </span>
            </dd>
          </div>
          <div data-finance-comparative-actual-evidence>
            <dt className="text-xs font-medium text-[var(--muted)]">{actualColumnLabel}</dt>
            <dd className="mt-1 tabular-nums text-sm font-medium">
              {formatManagementPnlMeasureCell(
                model.managementResult.actual,
                model.baseCurrency,
                formattingLocale,
              )}
            </dd>
          </div>
        </dl>
        {grainExplanationText ? (
          <p
            className="text-xs leading-relaxed text-[var(--muted)]"
            data-finance-comparative-grain-explanation
          >
            {grainExplanationText}
          </p>
        ) : null}
        {model.availability === "PARTIAL_SOURCE_AVAILABILITY" ? (
          <p className="text-xs text-[var(--muted)]">{labels.partialSourcesHint}</p>
        ) : null}
      </section>

      {attentionInsights.length > 0 ? (
        <section
          className={cn(FINANCE_SUMMARY_STRIP_SURFACE_CLASS, "space-y-3")}
          aria-labelledby="finance-comparative-attention"
          data-finance-comparative-attention
        >
          <h3
            id="finance-comparative-attention"
            className="text-sm font-semibold text-[var(--foreground)]"
          >
            {labels.attentionSignalsTitle}
          </h3>
          <ComparativeAttentionInsights
            insights={attentionInsights}
            labels={labels}
            currency={model.baseCurrency}
            locale={formattingLocale}
            investigateLabel={labels.investigateAccount}
            onInvestigateDriver={onInvestigateDriver}
          />
        </section>
      ) : null}

      <div className="flex flex-col gap-2" data-finance-pnl-statement>
        <SectionTable
          title={labels.incomeSection}
          sectionTotalLabel={labels.incomeSectionTotal}
          section={model.incomeSection}
          currency={model.baseCurrency}
          locale={formattingLocale}
          labels={labels}
          actualHeaderMode={actualHeaderMode}
          actualColumnLabel={actualColumnLabel}
          focusedAccountId={focusedAccountId}
          focusedGroupId={focusedGroupId}
          onInvestigateAccount={onInvestigateAccount}
          onInvestigateGroup={onInvestigateGroup}
        />
        <SectionTable
          title={labels.expenseSection}
          sectionTotalLabel={labels.expenseSectionTotal}
          section={model.expenseSection}
          currency={model.baseCurrency}
          locale={formattingLocale}
          labels={labels}
          actualHeaderMode={actualHeaderMode}
          actualColumnLabel={actualColumnLabel}
          focusedAccountId={focusedAccountId}
          focusedGroupId={focusedGroupId}
          onInvestigateAccount={onInvestigateAccount}
          onInvestigateGroup={onInvestigateGroup}
        />

        <div className={FINANCE_MANAGEMENT_PNL_TABLE_SURFACE_CLASS} data-finance-pnl-result>
          <table className={FINANCE_VARIANCE_COMPARISON_TABLE_CLASS} data-finance-pnl-result-table>
            <FinanceVarianceComparisonColGroup mode="MANAGEMENT_PNL" />
            <thead>
              <tr className={FINANCE_MANAGEMENT_PNL_TABLE_HEAD_ROW_CLASS}>
                <th scope="col" className={FINANCE_MANAGEMENT_PNL_HEAD_ACCOUNT_CLASS}>
                  <span className="sr-only">{labels.managementResult}</span>
                </th>
                <th scope="col" className={FINANCE_MANAGEMENT_PNL_HEAD_NUMERIC_CLASS}>
                  {labels.columnBudget}
                </th>
                <th
                  scope="col"
                  className={cn(FINANCE_MANAGEMENT_PNL_HEAD_NUMERIC_CLASS, "hidden md:table-cell")}
                >
                  {actualColumnLabel}
                </th>
                <th scope="col" className={FINANCE_MANAGEMENT_PNL_HEAD_NUMERIC_CLASS}>
                  {labels.columnForecast}
                </th>
                <th scope="col" className={FINANCE_MANAGEMENT_PNL_HEAD_NUMERIC_CLASS}>
                  <span>{labels.columnVariance}</span>
                  <span className="sr-only"> ({labels.columnVariancePercent})</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                className="bg-[var(--sce-surface-dense)]"
                data-finance-pnl-row="management-result"
              >
                <td className={cn(FINANCE_MANAGEMENT_PNL_ACCOUNT_CELL_CLASS, "text-base font-semibold")}>
                  {labels.managementResult}
                </td>
                <MeasureCells
                  approvedBudget={model.managementResult.approvedBudget}
                  actual={model.managementResult.actual}
                  currentForecast={model.managementResult.currentForecast}
                  forecastVsBudget={model.managementResult.forecastVsBudget}
                  currency={model.baseCurrency}
                  locale={formattingLocale}
                  labels={labels}
                  actualHeaderMode={actualHeaderMode}
                  emphasize
                  variancePresentation="emphasized"
                />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
