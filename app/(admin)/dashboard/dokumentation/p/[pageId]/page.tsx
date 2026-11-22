import { TenantDocumentationAccessLevel } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";

import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
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

  const pageAccess = await resolvePageEffectiveAccess(actor, pageId);
  if (!accessLevelPermits(pageAccess, TenantDocumentationAccessLevel.VIEW)) {
    notFound();
  }

  const publishedRaw = page.publishedVersion?.contentJson;
  const publishedEnriched = publishedRaw
    ? await enrichTipTapMentionLabels(tenantId, publishedRaw)
    : null;
  const publishedContent = isRichTextValue(publishedEnriched)
    ? publishedEnriched
    : isRichTextValue(publishedRaw)
      ? publishedRaw
      : null;

  const publishedMeta = page.publishedVersion
    ? `Version ${page.publishedVersion.versionNumber} — Veröffentlicht am ${format(
        page.publishedVersion.publishedAt,
        "d. MMM yyyy, HH:mm",
        { locale: de },
      )}`
    : null;

  const breadcrumb = [
    page.space.title,
    page.parent?.title,
    page.title,
  ].filter(Boolean) as string[];

  const user = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { firstName: true, lastName: true, email: true },
  });
  const displayName =
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
    user?.email ||
    "Editor";

  return (
    <PageShell fullWidth>
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Dokumentation", href: "/dashboard/dokumentation" },
          { label: page.title },
        ]}
        header={{
          eyebrow: "Dokumentation",
          title: page.title,
          description: page.space.title,
        }}
        density="dense"
      >
        <TenantDocumentationWorkspaceClient
          pageId={page.id}
          pageTitle={page.title}
          spaceTitle={page.space.title}
          breadcrumb={breadcrumb}
          publishedHtml={
            publishedContent ? richTextDocumentToHtmlWithMentions(publishedContent) : null
          }
          publishedMeta={publishedMeta}
          publishedContent={publishedContent}
          canEdit={accessLevelPermits(pageAccess, TenantDocumentationAccessLevel.EDIT)}
          canPublish={accessLevelPermits(pageAccess, TenantDocumentationAccessLevel.PUBLISH)}
          displayName={displayName}
        />
      </SceWorkspaceChrome>
    </PageShell>
  );
}