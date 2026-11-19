import { prisma } from "@/lib/db/prisma";

export class ClubMeldungSchemaUnavailableError extends Error {
  constructor(message = "Anliegen & Meldungen ist in dieser Umgebung noch nicht aktiviert.") {
    super(message);
    this.name = "ClubMeldungSchemaUnavailableError";
  }
}

let schemaReadyCache: boolean | null = null;

export async function isClubMeldungSchemaReady(): Promise<boolean> {
  if (schemaReadyCache === true) return true;
  try {
    await prisma.$queryRaw`SELECT 1 FROM "ClubMeldung" LIMIT 0`;
    schemaReadyCache = true;
    return true;
  } catch {
    schemaReadyCache = false;
    return false;
  }
}

export async function requireClubMeldungSchemaReady(): Promise<void> {
  const ready = await isClubMeldungSchemaReady();
  if (!ready) {
    throw new ClubMeldungSchemaUnavailableError();
  }
}