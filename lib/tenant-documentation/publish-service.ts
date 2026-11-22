import {
  TenantDocumentationAccessLevel,
  TenantDocumentationDraftSaveStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { isRichTextValue, type RichTextValue } from "@/lib/cms/rich-text";
import type { TenantDocumentationActorContext } from "@/lib/tenant-documentation/authorization";
import { assertPageAccess } from "@/lib/tenant-documentation/page-access-service";
import { richTextToPlainText } from "@/lib/tenant-documentation/plain-text";
import { yjsStateToRichTextSnapshot } from "@/lib/tenant-documentation/yjs-document";
import { emitTenantDocumentationMentionNotifications } from "@/lib/tenant-documentation/tenant-doc-mention-producer";

export class TenantDocumentationPublishError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "FORBIDDEN" | "CONFLICT",
  ) {
    super(message);
    this.name = "TenantDocumentationPublishError";
  }
}

export async function publishPageDraft(
  actor: TenantDocumentationActorContext,
  actorUserId: string,
  pageId: string,
  options?: { actorDisplayName?: string },
) {
  await assertPageAccess(
    actor,
    pageId,
    TenantDocumentationAccessLevel.PUBLISH,
  );

  const publishResult = await prisma.$transaction(async (tx) => {
    const page = await tx.tenantDocumentationPage.findFirst({
      where: { id: pageId, tenantId: actor.identity.tenantId },
      include: { draft: true, publishedVersion: true },
    });
    if (!page) {
      throw new TenantDocumentationPublishError("Page not found", "NOT_FOUND");
    }

    const draft = page.draft;
    if (!draft) {
      throw new TenantDocumentationPublishError("No draft", "CONFLICT");
    }

    const contentJson: RichTextValue = isRichTextValue(draft.contentJson)
      ? draft.contentJson
      : yjsStateToRichTextSnapshot(new Uint8Array(draft.yjsState));

    const latest = await tx.tenantDocumentationPageVersion.findFirst({
      where: { pageId },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });
    const versionNumber = (latest?.versionNumber ?? 0) + 1;

    const version = await tx.tenantDocumentationPageVersion.create({
      data: {
        tenantId: actor.identity.tenantId,
        pageId,
        versionNumber,
        contentJson,
        plainText: richTextToPlainText(contentJson),
        publishedByUserId: actorUserId,
      },
    });

    await tx.tenantDocumentationPage.update({
      where: { id: pageId },
      data: { publishedVersionId: version.id },
    });

    await tx.tenantDocumentationPageDraft.update({
      where: { pageId },
      data: {
        saveStatus: TenantDocumentationDraftSaveStatus.SAVED,
        revision: draft.revision + BigInt(1),
      },
    });

    return {
      version,
      pageTitle: page.title,
      previousContent: page.publishedVersion?.contentJson ?? null,
    };
  });

  await emitTenantDocumentationMentionNotifications({
    tenantId: actor.identity.tenantId,
    pageId,
    pageTitle: publishResult.pageTitle,
    publishedVersionId: publishResult.version.id,
    actorUserId,
    actorDisplayName: options?.actorDisplayName?.trim() || "Redaktion",
    previousPublishedContent: publishResult.previousContent,
    nextPublishedContent: publishResult.version.contentJson,
  });

  return publishResult.version;
}

export async function restorePageVersion(
  actor: TenantDocumentationActorContext,
  actorUserId: string,
  pageId: string,
  versionId: string,
) {
  await assertPageAccess(
    actor,
    pageId,
    TenantDocumentationAccessLevel.PUBLISH,
  );

  return prisma.$transaction(async (tx) => {
    const sourceVersion = await tx.tenantDocumentationPageVersion.findFirst({
      where: { id: versionId, pageId, tenantId: actor.identity.tenantId },
    });
    if (!sourceVersion) {
      throw new TenantDocumentationPublishError("Version not found", "NOT_FOUND");
    }

    const contentJson = sourceVersion.contentJson as RichTextValue;
    const { seedFragmentFromRichText, emptyYjsState } = await import(
      "@/lib/tenant-documentation/yjs-document"
    );
    const Y = await import("yjs");
    const docState = emptyYjsState();
    const doc = new Y.Doc();
    if (docState.length) Y.applyUpdate(doc, docState);
    seedFragmentFromRichText(doc, contentJson);
    const merged = Y.encodeStateAsUpdate(doc);

    const draftRow = await tx.tenantDocumentationPageDraft.upsert({
      where: { pageId },
      create: {
        pageId,
        tenantId: actor.identity.tenantId,
        contentJson,
        yjsState: Buffer.from(merged),
        revision: BigInt(1),
        updatedByUserId: actorUserId,
      },
      update: {
        contentJson,
        yjsState: Buffer.from(merged),
        revision: { increment: BigInt(1) },
        updatedByUserId: actorUserId,
      },
    });

    const latest = await tx.tenantDocumentationPageVersion.findFirst({
      where: { pageId },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });
    const versionNumber = (latest?.versionNumber ?? 0) + 1;

    const publishedVersion = await tx.tenantDocumentationPageVersion.create({
      data: {
        tenantId: actor.identity.tenantId,
        pageId,
        versionNumber,
        contentJson,
        plainText: richTextToPlainText(contentJson),
        publishedByUserId: actorUserId,
      },
    });

    await tx.tenantDocumentationPage.update({
      where: { id: pageId },
      data: { publishedVersionId: publishedVersion.id },
    });

    await tx.tenantDocumentationPageDraft.update({
      where: { pageId },
      data: { revision: draftRow.revision + BigInt(1) },
    });

    return publishedVersion;
  });
}