import { TenantDocumentationAccessLevel } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { format, isValid } from "date-fns";
import { de } from "date-fns/locale";

import { TenantDocumentationUnauthorizedState } from "@/components/admin/tenant-documentation/TenantDocumentationUnauthorizedState";
import { TenantDocumentationWorkspaceClient } from "@/components/admin/tenant-documentation/TenantDocumentationWorkspaceClient";
import { PageShell } from "@/components/ui/page";
import { isRichTextValue } from "@/lib/cms/rich-text";
import { enrichTipTapMentionLabels } from "@/lib/collaboration/mentions/enrich-mention-labels";
import { richTextDocumentToHtmlWithMentions } from "@/lib/collaboration/mentions/render-inline-mentions-html";
import { prisma } from "@/lib/db/prisma";
import {
  accessLevelPermits,
  resolveTenantDocumentationActor,
} from "@/lib/tenant-documentation/authorization";
import { resolvePageEffectiveAccess } from "@/lib/tenant-documentation/page-access-service";
import { deriveTenantDocumentationPageLifecycle } from "@/lib/tenant-documentation/page-lifecycle";
import {
  actorCanDiscoverPage,
  loadPageLifecycleState,
} from "@/lib/tenant-documentation/page-visibility-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  resolvePublishAudienceView,
  publishAudienceToLabel,
} from "@/lib/tenant-documentation/publish-audience";
import { resolveTenantDocumentationHubRouteAccess } from "@/lib/tenant-documentation/route-access";

type PageProps = { params: Promise<{ pageId: string }> };

export default async function TenantDocumentationPage({ params }: PageProps) {
  const access = await resolveTenantDocumentationHubRouteAccess();

  if (access.kind === "unauthenticated") {
    redirect("/login");
  }

  if (access.kind === "forbidden" || access.kind === "no_tenant_context") {
    return (
      <PageShell fullWidth>
        <TenantDocumentationUnauthorizedState reason={access.kind} />
      </PageShell>
    );
  }

  const { pageId } = await params;
  const tenantId = access.tenantId;
  const actorUserId = access.actorUserId;

  const page = await prisma.tenantDocumentationPage.findFirst({
    where: { id: pageId, tenantId },
    include: {
      space: true,
      publishedVersion: true,
      parent: { select: { title: true } },
    },
  });
  if (!page) notFound();

  const permissionKeys = access.permissionKeys;
  const actor = await resolveTenantDocumentationActor({
    tenantId,
    userId: actorUserId,
    permissionKeys,
  });

  if (!(await actorCanDiscoverPage(actor, pageId))) {
    notFound();
  }

  const pageAccess = await resolvePageEffectiveAccess(actor, pageId);
  const visibility = await resolvePublishAudienceView(pageId, tenantId);

  const publishedRaw = page.publishedVersion?.contentJson;
  const publishedEnriched = publishedRaw
    ? await enrichTipTapMentionLabels(tenantId, publishedRaw)
    : null;
  const publishedContent = isRichTextValue(publishedEnriched)
    ? publishedEnriched
    : isRichTextValue(publishedRaw)
      ? publishedRaw
      : null;

  const publishedAt = page.publishedVersion?.publishedAt;
  const publishedMeta =
    page.publishedVersion && publishedAt && isValid(publishedAt)
      ? `Version ${page.publishedVersion.versionNumber} • Veröffentlicht am ${format(
          publishedAt,
          "d. MMM yyyy, HH:mm",
          { locale: de },
        )}`
      : page.publishedVersion
        ? `Version ${page.publishedVersion.versionNumber}`
        : null;

  const breadcrumb = [page.space.title, page.parent?.title].filter(Boolean) as string[];

  const user = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { firstName: true, lastName: true, email: true },
  });
  const displayName =
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
    user?.email ||
    "Editor";

  const lifecycleState =
    (await loadPageLifecycleState(page.id, tenantId)) ??
    deriveTenantDocumentationPageLifecycle({
      archivedAt: null,
      trashedAt: null,
    });

  const canManage =
    access.permissionKeys.includes(PERMISSIONS.TENANT_DOCUMENTATION_MANAGE) &&
    accessLevelPermits(pageAccess, TenantDocumentationAccessLevel.MANAGE);

  return (
    <PageShell fullWidth>
      <TenantDocumentationWorkspaceClient
        pageId={page.id}
        spaceId={page.spaceId}
        pageTitle={page.title}
        spaceTitle={page.space.title}
        breadcrumb={breadcrumb}
        lifecycleState={lifecycleState}
        canManage={canManage}
        canCreatePages={accessLevelPermits(pageAccess, TenantDocumentationAccessLevel.EDIT)}
        visibilitySummary={{
          inheritedLabel: publishAudienceToLabel(visibility.inherited),
          effectiveLabel: publishAudienceToLabel(visibility.effective),
          hasExplicit: visibility.explicit !== null,
        }}
        publishedHtml={
          publishedContent ? richTextDocumentToHtmlWithMentions(publishedContent) : null
        }
        publishedMeta={publishedMeta}
        publishedContent={publishedContent}
        canEdit={accessLevelPermits(pageAccess, TenantDocumentationAccessLevel.EDIT)}
        canPublish={accessLevelPermits(pageAccess, TenantDocumentationAccessLevel.PUBLISH)}
        displayName={displayName}
      />
    </PageShell>
  );
}