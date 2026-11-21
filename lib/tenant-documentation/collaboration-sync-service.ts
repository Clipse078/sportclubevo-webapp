import {
  TenantDocumentationAccessLevel,
  TenantDocumentationDraftSaveStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  diffYjsState,
  mergeYjsUpdate,
  TENANT_DOC_YJS_FRAGMENT,
  yjsStateToRichTextSnapshot,
} from "@/lib/tenant-documentation/yjs-document";
import type { TenantDocumentationActorContext } from "@/lib/tenant-documentation/authorization";
import { assertPageAccess } from "@/lib/tenant-documentation/page-access-service";

const PRESENCE_STALE_MS = 45_000;
const COLLABORATION_COLORS = [
  "#7c3aed",
  "#16a34a",
  "#0ea5e9",
  "#e11d48",
  "#ca8a04",
] as const;

export type CollaborationSyncInput = {
  pageId: string;
  clientId: string;
  updateBase64?: string;
  stateVectorBase64?: string;
  contentJson?: unknown;
  cursorJson?: unknown;
  displayName: string;
  markDisconnected?: boolean;
};

export type CollaborationSyncResult = {
  revision: string;
  saveStatus: TenantDocumentationDraftSaveStatus;
  updateBase64: string;
  presences: Array<{
    userId: string;
    clientId: string;
    displayName: string;
    color: string;
    cursorJson: unknown;
    disconnected: boolean;
  }>;
  publishedVersionId: string | null;
  editorEpoch: string;
};

function decodeBase64(value: string | undefined): Uint8Array | null {
  if (!value) return null;
  return Uint8Array.from(Buffer.from(value, "base64"));
}

function encodeBase64(value: Uint8Array): string {
  return Buffer.from(value).toString("base64");
}

function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash + userId.charCodeAt(i) * (i + 1)) % COLLABORATION_COLORS.length;
  }
  return COLLABORATION_COLORS[hash] ?? COLLABORATION_COLORS[0];
}

async function ensureDraft(pageId: string, tenantId: string) {
  const existing = await prisma.tenantDocumentationPageDraft.findUnique({
    where: { pageId },
  });
  if (existing) return existing;

  const { emptyYjsState } = await import("@/lib/tenant-documentation/yjs-document");
  const initialState = emptyYjsState();
  const contentJson = yjsStateToRichTextSnapshot(initialState);

  return prisma.tenantDocumentationPageDraft.create({
    data: {
      pageId,
      tenantId,
      contentJson,
      yjsState: Buffer.from(initialState),
      revision: BigInt(0),
      saveStatus: TenantDocumentationDraftSaveStatus.SAVED,
    },
  });
}

export async function synchronizePageCollaboration(
  actor: TenantDocumentationActorContext,
  actorUserId: string,
  input: CollaborationSyncInput,
): Promise<CollaborationSyncResult> {
  await assertPageAccess(
    actor,
    input.pageId,
    TenantDocumentationAccessLevel.EDIT,
  );

  const page = await prisma.tenantDocumentationPage.findFirst({
    where: { id: input.pageId, tenantId: actor.identity.tenantId },
    select: { publishedVersionId: true },
  });
  if (!page) {
    throw new Error("Page not found");
  }

  const incomingUpdate = decodeBase64(input.updateBase64);
  const clientVector = decodeBase64(input.stateVectorBase64);

  const result = await prisma.$transaction(async (tx) => {
    const draft = await ensureDraft(input.pageId, actor.identity.tenantId);

    const storedState = new Uint8Array(draft.yjsState);
    const mergedState =
      incomingUpdate && incomingUpdate.length > 0
        ? mergeYjsUpdate(storedState, incomingUpdate)
        : storedState;

    const nextRevision = draft.revision + BigInt(incomingUpdate?.length ? 1 : 0);
    const { parseDraftContentJson } = await import(
      "@/lib/tenant-documentation/draft-content-json"
    );
    const clientJson = parseDraftContentJson(input.contentJson);
    const contentJson =
      clientJson ??
      (incomingUpdate && incomingUpdate.length > 0
        ? yjsStateToRichTextSnapshot(mergedState)
        : draft.contentJson);

    await tx.tenantDocumentationPageDraft.update({
      where: { pageId: input.pageId },
      data: {
        yjsState: Buffer.from(mergedState),
        contentJson: contentJson as object,
        revision: nextRevision,
        saveStatus:
          input.markDisconnected === true
            ? TenantDocumentationDraftSaveStatus.DISCONNECTED
            : incomingUpdate?.length
              ? TenantDocumentationDraftSaveStatus.SAVED
              : draft.saveStatus,
        updatedByUserId: actorUserId,
      },
    });

    const now = new Date();
    await tx.tenantDocumentationCollaborationPresence.upsert({
      where: {
        pageId_userId_clientId: {
          pageId: input.pageId,
          userId: actorUserId,
          clientId: input.clientId,
        },
      },
      create: {
        tenantId: actor.identity.tenantId,
        pageId: input.pageId,
        userId: actorUserId,
        clientId: input.clientId,
        color: colorForUser(actorUserId),
        displayName: input.displayName,
        cursorJson: input.cursorJson ? (input.cursorJson as object) : undefined,
        lastSeenAt: now,
        disconnectedAt: input.markDisconnected ? now : null,
      },
      update: {
        displayName: input.displayName,
        cursorJson: input.cursorJson ? (input.cursorJson as object) : undefined,
        lastSeenAt: now,
        disconnectedAt: input.markDisconnected ? now : null,
      },
    });

    if (input.markDisconnected) {
      await tx.tenantDocumentationCollaborationPresence.updateMany({
        where: {
          pageId: input.pageId,
          userId: actorUserId,
          clientId: input.clientId,
        },
        data: { disconnectedAt: now },
      });
    }

    const diff = diffYjsState(mergedState, clientVector);
    return { mergedState, diff, nextRevision };
  });

  const staleBefore = new Date(Date.now() - PRESENCE_STALE_MS);
  await prisma.tenantDocumentationCollaborationPresence.updateMany({
    where: {
      pageId: input.pageId,
      lastSeenAt: { lt: staleBefore },
      disconnectedAt: null,
    },
    data: { disconnectedAt: new Date() },
  });

  const presences = await prisma.tenantDocumentationCollaborationPresence.findMany({
    where: { pageId: input.pageId, tenantId: actor.identity.tenantId },
    orderBy: { lastSeenAt: "desc" },
  });

  return {
    revision: result.nextRevision.toString(),
    saveStatus:
      input.markDisconnected === true
        ? TenantDocumentationDraftSaveStatus.DISCONNECTED
        : TenantDocumentationDraftSaveStatus.SAVED,
    updateBase64: encodeBase64(result.diff),
    presences: presences.map((p) => ({
      userId: p.userId,
      clientId: p.clientId,
      displayName: p.displayName,
      color: p.color,
      cursorJson: p.cursorJson,
      disconnected: p.disconnectedAt != null,
    })),
    publishedVersionId: page.publishedVersionId,
    editorEpoch: result.nextRevision.toString(),
  };
}
