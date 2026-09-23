import { redirect } from "next/navigation";
import RequirementDetailWorkspace from "@/components/admin/aufgaben/RequirementDetailWorkspace";
import { requirePersonalActionsModuleAccess } from "@/lib/personal-actions/require-module-access";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getRequirementServiceContext } from "@/lib/requirements/server-context";
import {
  loadRequirementAudienceOriginLabels,
  loadRequirementManagementDetail,
  listRequirementRecipientMatrix,
  type RequirementRecipientMatrixFilter,
  type RequirementRecipientMatrixSort,
} from "@/lib/requirements/management-service";
import { loadRequirementPersonOptionsByIds } from "@/lib/requirements/person-search";
import { loadRequirementAudienceLabels } from "@/lib/requirements/audience-selector-search";
import { RequirementForbiddenError } from "@/lib/requirements/errors";
import { listRequirementDocumentReferences } from "@/lib/requirements/requirement-document-reference-service";
import { RequirementStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ requirementId: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
};

function parseMatrixFilter(raw: string | undefined): RequirementRecipientMatrixFilter {
  const value = raw?.trim().toUpperCase();
  if (value === "OPEN" || value === "ACKNOWLEDGED" || value === "OVERDUE" || value === "COMPLETED") {
    return value === "COMPLETED" ? "ACKNOWLEDGED" : value;
  }
  return "ALL";
}

function parseMatrixSort(raw: string | undefined): RequirementRecipientMatrixSort {
  const value = raw?.trim().toUpperCase();
  if (value === "PERSON_ASC" || value === "STATUS" || value === "COMPLETED_DESC") return value;
  return "ATTENTION";
}

export default async function RequirementDetailPage({ params, searchParams }: Props) {
  await requirePersonalActionsModuleAccess();
  const { requirementId } = await params;
  const sp = searchParams ? await searchParams : {};

  const ctx = await getRequirementServiceContext();
  if (!ctx) return null;

  const tenant = await getActiveTenant();
  const locale = tenant?.locale ?? "de-CH";
  const timeZone = tenant?.timezone ?? "Europe/Zurich";

  let detail: Awaited<ReturnType<typeof loadRequirementManagementDetail>>;
  try {
    detail = await loadRequirementManagementDetail(ctx, requirementId);
  } catch (error) {
    if (error instanceof RequirementForbiddenError) {
      redirect("/dashboard/aufgaben?bereich=anforderungen");
    }
    throw error;
  }

  const audienceKnown =
    detail.requirement.status === "DRAFT"
      ? await loadRequirementPersonOptionsByIds(
          ctx.tenantId,
          detail.requirement.draftAudiencePersonIds,
        )
      : [];

  const audienceKnownLabels =
    detail.requirement.status === "DRAFT"
      ? await loadRequirementAudienceLabels({
          tenantId: ctx.tenantId,
          teamIds: detail.requirement.draftAudienceTeamIds,
          orgUnitIds: detail.requirement.draftAudienceOrgUnitIds,
          roleIds: detail.requirement.draftAudienceRoleIds,
          targetGroupIds: detail.requirement.draftAudienceTargetGroupIds,
        })
      : null;

  const audienceOriginLabels =
    detail.requirement.status !== "DRAFT"
      ? await loadRequirementAudienceOriginLabels(ctx.tenantId, detail.requirement)
      : null;

  let matrixRows: Awaited<ReturnType<typeof listRequirementRecipientMatrix>>["rows"] = [];
  let matrixTotalCount = 0;
  let matrixPage = 1;
  let matrixPageCount = 1;

  const documentReferences = await listRequirementDocumentReferences(ctx, requirementId);
  const canLinkDocuments =
    detail.canManage &&
    detail.requirement.status !== RequirementStatus.CLOSED &&
    detail.requirement.status !== RequirementStatus.CANCELLED;

  if (detail.canViewMatrix && detail.requirement.status !== "DRAFT") {
    const matrixPageRaw = Number.parseInt(sp.mp ?? "1", 10);
    const matrix = await listRequirementRecipientMatrix(ctx, {
      requirementId,
      filter: parseMatrixFilter(sp.matrix),
      search: sp.mq ?? "",
      sort: parseMatrixSort(sp.ms),
      page: Number.isFinite(matrixPageRaw) && matrixPageRaw > 0 ? matrixPageRaw : 1,
    });
    matrixRows = matrix.rows;
    matrixTotalCount = matrix.totalCount;
    matrixPage = matrix.page;
    matrixPageCount = matrix.pageCount;
  }

  return (
    <div className="mx-auto w-full max-w-[120rem] px-4 py-4 sm:px-6">
      <RequirementDetailWorkspace
        requirement={detail.requirement}
        aggregate={detail.aggregate}
        audienceKnown={audienceKnown}
        audienceKnownLabels={audienceKnownLabels}
        audienceOriginLabels={audienceOriginLabels}
        matrixRows={matrixRows}
        matrixTotalCount={matrixTotalCount}
        matrixPage={matrixPage}
        matrixPageCount={matrixPageCount}
        canManage={detail.canManage}
        canViewMatrix={detail.canViewMatrix}
        documentReferences={documentReferences}
        canLinkDocuments={canLinkDocuments}
        creatorLabel={detail.creatorLabel}
        locale={locale}
        timeZone={timeZone}
      />
    </div>
  );
}
