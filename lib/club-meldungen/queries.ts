import type { ClubMeldungStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type ClubMeldungListView = "mine" | "unassigned" | "all" | "reporter";

export type ListClubMeldungenInput = {
  tenantId: string;
  view: ClubMeldungListView;
  actorUserId: string;
  canViewAll: boolean;
  status?: ClubMeldungStatus;
  orgUnitId?: string;
  accountableUserId?: string;
};

export async function listClubMeldungen(input: ListClubMeldungenInput) {
  const where: Prisma.ClubMeldungWhereInput = {
    tenantId: input.tenantId,
  };

  if (input.status) where.status = input.status;
  if (input.orgUnitId) where.orgUnitId = input.orgUnitId;
  if (input.accountableUserId) where.accountableUserId = input.accountableUserId;

  if (input.view === "reporter") {
    where.reporterUserId = input.actorUserId;
  } else if (input.view === "mine") {
  where.OR = [
      { accountableUserId: input.actorUserId },
      { collaborators: { some: { userId: input.actorUserId } } },
    ];
  } else if (input.view === "unassigned") {
    where.accountableUserId = null;
  } else if (input.view === "all" && !input.canViewAll) {
    where.OR = [
      { accountableUserId: input.actorUserId },
      { collaborators: { some: { userId: input.actorUserId } } },
    ];
  }

  return prisma.clubMeldung.findMany({
    where,
    orderBy: { lastActivityAt: "desc" },
    take: 200,
    select: {
      id: true,
      caseNumber: true,
      subject: true,
      status: true,
      category: true,
      urgent: true,
      orgUnitId: true,
      accountableUserId: true,
      followUpAt: true,
      lastActivityAt: true,
      reporterUserId: true,
      orgUnit: { select: { id: true, name: true } },
      accountableUser: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export async function getClubMeldungDetail(tenantId: string, meldungId: string) {
  return prisma.clubMeldung.findFirst({
    where: { id: meldungId, tenantId },
    include: {
      reporterUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      accountableUser: { select: { id: true, firstName: true, lastName: true } },
      orgUnit: { select: { id: true, name: true } },
      collaborators: {
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      },
      attachments: {
        include: {
          attachment: {
            select: {
              id: true,
              originalFilename: true,
              contentType: true,
              sizeBytes: true,
              lifecycleStatus: true,
            },
          },
        },
      },
      duplicateOf: { select: { id: true, caseNumber: true } },
    },
  });
}

export async function listClubMeldungReporterTimeline(
  tenantId: string,
  meldungId: string,
  includeInternal: boolean,
  includeMentions = false,
) {
  const [messages, history] = await Promise.all([
    prisma.clubMeldungMessage.findMany({
      where: {
        tenantId,
        meldungId,
        ...(includeInternal ? {} : { audience: "REPORTER_REPLY" }),
      },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        ...(includeMentions
          ? {
              mentions: {
                include: {
                  user: { select: { id: true, firstName: true, lastName: true } },
                },
              },
            }
          : {}),
      },
    }),
    includeInternal
      ? prisma.clubMeldungHistoryEvent.findMany({
          where: { tenantId, meldungId },
          orderBy: { createdAt: "asc" },
          include: {
            actor: { select: { id: true, firstName: true, lastName: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  return { messages, history };
}