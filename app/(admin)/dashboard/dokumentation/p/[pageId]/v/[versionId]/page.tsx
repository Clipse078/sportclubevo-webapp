import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format, isValid } from "date-fns";
import { de } from "date-fns/locale";

import { TenantDocumentationUnauthorizedState } from "@/components/admin/tenant-documentation/TenantDocumentationUnauthorizedState";
import { TenantDocumentationWhiteSurface } from "@/components/admin/tenant-documentation/TenantDocumentationWhiteSurface";
import { TenantDocumentationWorkspaceClient } from "@/components/admin/tenant-documentation/TenantDocumentationWorkspaceClient";
import { PageShell } from "@/components/ui/page";
import { isRichTextValue } from "@/lib/cms/rich-text";
import { enrichTipTapMentionLabels } from "@/lib/collaboration/mentions/enrich-mention-labels";
import { richTextDocumentToHtmlWithMentions } from "@/lib/collaboration/mentions/render-inline-mentions-html";
import { resolveTenantDocumentationActor } from "@/lib/tenant-documentation/authorization";
import { resolveTenantDocumentationHubRouteAccess } from "@/lib/tenant-documentation/route-access";
import {
  loadPageVersionSnapshot,
  TenantDocumentationVersionHistoryError,
} from "@/lib/tenant-documentation/version-history-service";
import { tenantDocumentationPagePath } from "@/lib/tenant-documentation/sce-tenant-documentation-handoff";

type PageProps = { params: Promise<{ pageId: string; versionId: string }> };

export default async function TenantDocumentationVersionPage({ params }: PageProps) {
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

  const { pageId, versionId } = await params;
  const actor = await resolveTenantDocumentationActor({
    tenantId: access.tenantId,
    userId: access.actorUserId,
    permissionKeys: access.permissionKeys,
  });

  let snapshot;
  try {
    snapshot = await loadPageVersionSnapshot(actor, pageId, versionId);
  } catch (error) {
    if (error instanceof TenantDocumentationVersionHistoryError && error.code === "FORBIDDEN") {
      notFound();
    }
    notFound();
  }

  const { version, isCurrent } = snapshot;
  const page = version.page;
  const publishedAt = version.publishedAt;
  const publishedMeta =
    isValid(publishedAt) ?
      `Version ${version.versionNumber} • Veröffentlicht am ${format(publishedAt, "d. MMM yyyy, HH:mm", { locale: de })}`
    : `Version ${version.versionNumber}`;

  const enriched = await enrichTipTapMentionLabels(access.tenantId, version.contentJson);
  const content = isRichTextValue(enriched) ? enriched : isRichTextValue(version.contentJson) ? version.contentJson : null;

  const breadcrumb = [page.space.title, page.parent?.title].filter(Boolean) as string[];

  return (
    <PageShell fullWidth>
      {!isCurrent ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 sm:px-6">
          Sie sehen eine ältere veröffentlichte Version.{" "}
          <Link href={tenantDocumentationPagePath(pageId)} className="font-medium underline">
            Zur aktuellen Seite
          </Link>
        </div>
      ) : null}
      <TenantDocumentationWhiteSurface>
      <TenantDocumentationWorkspaceClient
        pageId={page.id}
        spaceId={page.spaceId}
        pageTitle={page.title}
        spaceTitle={page.space.title}
        breadcrumb={breadcrumb}
        lifecycleState="ACTIVE"
        canManage={false}
        canCreatePages={false}
        canEdit={false}
        canPublish={false}
        displayName=""
        publishedHtml={content ? richTextDocumentToHtmlWithMentions(content) : null}
        publishedMeta={publishedMeta}
        publishedContent={content}
        visibilitySummary={{
          inheritedLabel: "—",
          effectiveLabel: "—",
          hasExplicit: false,
        }}
        versionView={{
          versionId: version.id,
          versionNumber: version.versionNumber,
          isCurrent,
        }}
      />
      </TenantDocumentationWhiteSurface>
    </PageShell>
  );
}