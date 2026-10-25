import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  FINANCE_PUBLICATION_ACTION_FALLBACK_ERROR,
  FINANCE_PUBLICATION_ACTION_PERSISTENCE_UNAVAILABLE,
  resolveFinancePublicationActionUserMessage,
} from "@/lib/finance/publishing/finance-publication-action-errors";

describe("finance publication action errors", () => {
  it("maps forbidden domain errors to German copy", () => {
    const message = resolveFinancePublicationActionUserMessage(
      new FinanceDomainError("FINANCE_FORBIDDEN", "english", 403),
    );
    expect(message).toContain("dürfen");
  });

  it("maps missing relation prisma errors to persistence unavailable copy", () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError("table missing", {
      code: "P2021",
      clientVersion: "test",
    });
    expect(resolveFinancePublicationActionUserMessage(prismaError)).toBe(
      FINANCE_PUBLICATION_ACTION_PERSISTENCE_UNAVAILABLE,
    );
  });

  it("falls back for unknown errors", () => {
    expect(resolveFinancePublicationActionUserMessage(new Error("boom"))).toBe(
      FINANCE_PUBLICATION_ACTION_FALLBACK_ERROR,
    );
  });
});
