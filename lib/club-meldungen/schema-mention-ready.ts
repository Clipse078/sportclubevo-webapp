import { prisma } from "@/lib/db/prisma";

let mentionReadyCache: boolean | null = null;

export async function isClubMeldungMentionSchemaReady(): Promise<boolean> {
  if (mentionReadyCache === true) return true;
  try {
    await prisma.$queryRaw`SELECT 1 FROM "ClubMeldungMessageMention" LIMIT 0`;
    mentionReadyCache = true;
    return true;
  } catch {
    mentionReadyCache = false;
    return false;
  }
}

export const CLUB_MELDUNG_MENTION_SCHEMA_PREREQUISITE =
  'Apply Prisma migration `20261119160000_sce_anliegen_02_mentions` (creates "ClubMeldungMessageMention" and NotificationType MELDUNG_MENTION).';