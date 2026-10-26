import { describe, expect, it } from "vitest";
import { FinancePublicationShareKind } from "@prisma/client";
import {
  collectPrismaGeneratedEnumParityViolations,
  diffPrismaSchemaAndGeneratedEnum,
  readPrismaSchemaEnumValues,
} from "../prisma-generated-enum-parity";

describe("Prisma generated enum parity (FIN-06E-R4 guard)", () => {
  it("schema FinancePublicationShareKind includes DISTRIBUTION", () => {
    const values = readPrismaSchemaEnumValues("FinancePublicationShareKind");
    expect(values).toEqual(["DEFAULT", "ADVANCED", "DISTRIBUTION"]);
  });

  it("generated @prisma/client FinancePublicationShareKind includes DISTRIBUTION", () => {
    expect(FinancePublicationShareKind).toMatchObject({
      DEFAULT: "DEFAULT",
      ADVANCED: "ADVANCED",
      DISTRIBUTION: "DISTRIBUTION",
    });
  });

  it("has no drift between schema and generated client for finance share kinds", () => {
    const drift = diffPrismaSchemaAndGeneratedEnum({
      schemaEnumName: "FinancePublicationShareKind",
      runtimeValues: FinancePublicationShareKind,
    });
    expect(drift.schemaOnly).toEqual([]);
    expect(drift.generatedOnly).toEqual([]);
    expect(collectPrismaGeneratedEnumParityViolations()).toEqual([]);
  });
});
