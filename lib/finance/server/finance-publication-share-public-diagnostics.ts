import { Prisma } from "@prisma/client";

/**
 * Safe logging for public capability routes — never log raw tokens or URLs.
 */
export function logFinancePublicationSharePublicFailure(
  scope: string,
  error: unknown,
): void {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(`[finance-publication-share-public] ${scope}`, {
      prismaCode: error.code,
    });
    return;
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    console.error(`[finance-publication-share-public] ${scope}`, {
      prismaClient: "unknown_request_error",
    });
    return;
  }
  console.error(`[finance-publication-share-public] ${scope}`, {
    message: error instanceof Error ? error.message : "unknown",
  });
}
