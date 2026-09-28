import { prisma } from "@/lib/db/prisma";
import {
  clampListSplitPercent,
  defaultInboxWorkspacePreference,
  defaultListSplitPercentForLayout,
  isInboxWorkspaceDensity,
  isInboxWorkspaceLayout,
  type InboxWorkspaceDensity,
  type InboxWorkspaceLayout,
  type InboxWorkspacePreferenceSnapshot,
} from "@/lib/communication/inbox/inbox-workspace-preferences";

export type InboxWorkspacePreferenceWriteInput = {
  layout?: unknown;
  density?: unknown;
  listSplitPercent?: unknown;
};

export type InboxWorkspacePreferenceWriteResult =
  | { ok: true; preference: InboxWorkspacePreferenceSnapshot }
  | { ok: false; code: string; message: string };

function mapRow(row: {
  layout: string;
  density: string;
  listSplitPercent: number;
}): InboxWorkspacePreferenceSnapshot {
  const layout = isInboxWorkspaceLayout(row.layout)
    ? row.layout
    : defaultInboxWorkspacePreference().layout;
  const density = isInboxWorkspaceDensity(row.density)
    ? row.density
    : defaultInboxWorkspacePreference().density;
  return {
    layout,
    density,
    listSplitPercent: clampListSplitPercent(row.listSplitPercent),
    hasStoredPreference: true,
  };
}

export async function loadCommunicationInboxWorkspacePreference(
  tenantId: string,
  userId: string,
): Promise<InboxWorkspacePreferenceSnapshot> {
  const row = await prisma.userCommunicationInboxWorkspacePref.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { layout: true, density: true, listSplitPercent: true },
  });
  if (!row) {
    return defaultInboxWorkspacePreference();
  }
  return mapRow(row);
}

export async function saveCommunicationInboxWorkspacePreference(
  tenantId: string,
  userId: string,
  input: InboxWorkspacePreferenceWriteInput,
  current?: InboxWorkspacePreferenceSnapshot,
): Promise<InboxWorkspacePreferenceWriteResult> {
  const base = current ?? (await loadCommunicationInboxWorkspacePreference(tenantId, userId));

  let layout: InboxWorkspaceLayout = base.layout;
  let density: InboxWorkspaceDensity = base.density;
  let listSplitPercent = base.listSplitPercent;

  if (input.layout !== undefined) {
    if (!isInboxWorkspaceLayout(input.layout)) {
      return { ok: false, code: "INVALID_LAYOUT", message: "Unbekanntes Layout." };
    }
    layout = input.layout;
    if (input.listSplitPercent === undefined) {
      listSplitPercent = defaultListSplitPercentForLayout(layout);
    }
  }

  if (input.density !== undefined) {
    if (!isInboxWorkspaceDensity(input.density)) {
      return { ok: false, code: "INVALID_DENSITY", message: "Unbekannte Dichte." };
    }
    density = input.density;
  }

  if (input.listSplitPercent !== undefined) {
    if (typeof input.listSplitPercent !== "number" || !Number.isFinite(input.listSplitPercent)) {
      return { ok: false, code: "INVALID_SPLIT", message: "Ungültiger Teiler." };
    }
    const clamped = clampListSplitPercent(input.listSplitPercent);
    if (clamped !== Math.round(input.listSplitPercent)) {
      return { ok: false, code: "INVALID_SPLIT", message: "Teiler ausserhalb der Grenzen." };
    }
    listSplitPercent = clamped;
  }

  listSplitPercent = clampListSplitPercent(listSplitPercent);

  const row = await prisma.userCommunicationInboxWorkspacePref.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    create: {
      tenantId,
      userId,
      layout,
      density,
      listSplitPercent,
    },
    update: {
      layout,
      density,
      listSplitPercent,
    },
    select: { layout: true, density: true, listSplitPercent: true },
  });

  return { ok: true, preference: mapRow(row) };
}

export async function resetCommunicationInboxWorkspacePreference(
  tenantId: string,
  userId: string,
): Promise<InboxWorkspacePreferenceSnapshot> {
  await prisma.userCommunicationInboxWorkspacePref.deleteMany({
    where: { tenantId, userId },
  });
  return defaultInboxWorkspacePreference();
}
