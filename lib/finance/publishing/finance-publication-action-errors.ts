/**
 * FIN-06B — bounded user-facing publication action errors (German product copy).
 */

import { Prisma } from "@prisma/client";
import { FinanceDomainError, type FinanceDomainErrorCode } from "@/lib/finance/errors";

const PUBLICATION_USER_MESSAGES: Partial<Record<FinanceDomainErrorCode, string>> = {
  FINANCE_FORBIDDEN: "Sie dürfen Finanzberichte nicht veröffentlichen.",
  FINANCE_PUBLICATION_NOT_PUBLISHABLE:
    "Dieser Bericht ist noch nicht veröffentlichungsbereit.",
  FINANCE_NOT_FOUND: "Das Finanzjahr wurde nicht gefunden.",
  FINANCE_PUBLISHING_INVALID_SCOPE: "Für die Veröffentlichung fehlt der Finanzzeitraum.",
  FINANCE_PUBLICATION_INVALID_SNAPSHOT:
    "Die Veröffentlichung konnte aus technischen Gründen nicht gesichert werden.",
  FINANCE_PUBLICATION_INVALID_TRANSITION:
    "Diese Veröffentlichung kann im aktuellen Zustand nicht erstellt werden.",
  FINANCE_PUBLICATION_VERSION_CONFLICT:
    "Die Veröffentlichung wurde zwischenzeitlich geändert. Bitte erneut versuchen.",
};

export const FINANCE_PUBLICATION_ACTION_FALLBACK_ERROR =
  "Die Veröffentlichung konnte nicht erstellt werden. Bitte erneut versuchen.";

export const FINANCE_PUBLICATION_ACTION_PERSISTENCE_UNAVAILABLE =
  "Die Veröffentlichung ist derzeit nicht verfügbar. Bitte in Kürze erneut versuchen oder den Support informieren.";

export const FINANCE_PUBLICATION_INSPECTION_NOT_FOUND =
  "Diese Veröffentlichungsversion ist nicht verfügbar.";

export const FINANCE_PUBLICATION_INSPECTION_FORBIDDEN =
  "Sie dürfen Veröffentlichungen nicht einsehen.";

export const FINANCE_PUBLICATION_INSPECTION_READ_FAILED =
  "Die gespeicherte Veröffentlichung konnte nicht gelesen werden.";

function isPrismaMissingRelationError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === "P2021") return true;
  const message = error.message.toLowerCase();
  return message.includes("financepublication") || message.includes("does not exist");
}

export function resolveFinancePublicationActionUserMessage(error: unknown): string {
  if (error instanceof FinanceDomainError) {
    return (
      PUBLICATION_USER_MESSAGES[error.code] ??
      (error.message.trim() || FINANCE_PUBLICATION_ACTION_FALLBACK_ERROR)
    );
  }
  if (isPrismaMissingRelationError(error)) {
    return FINANCE_PUBLICATION_ACTION_PERSISTENCE_UNAVAILABLE;
  }
  return FINANCE_PUBLICATION_ACTION_FALLBACK_ERROR;
}
