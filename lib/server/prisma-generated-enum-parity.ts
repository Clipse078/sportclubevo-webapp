/**
 * Guards against Prisma schema ↔ generated @prisma/client enum drift.
 *
 * FIN-06E-R4: STAGE stored shareKind=DISTRIBUTION while a stale generated client
 * only knew DEFAULT|ADVANCED, causing public share lookup to throw at runtime.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FinancePublicationShareKind } from "@prisma/client";

import type { PreflightViolation } from "@/lib/server/deployment-preflight";

export type PrismaEnumRuntimePair = {
  schemaEnumName: string;
  runtimeValues: Record<string, string>;
};

/** Finance-critical enums that must match prisma/schema.prisma after `prisma generate`. */
export const PRISMA_ENUM_RUNTIME_PAIRS: readonly PrismaEnumRuntimePair[] = [
  {
    schemaEnumName: "FinancePublicationShareKind",
    runtimeValues: FinancePublicationShareKind,
  },
] as const;

const DEFAULT_SCHEMA_PATH = resolve(process.cwd(), "prisma/schema.prisma");

export function readPrismaSchemaEnumValues(
  enumName: string,
  schemaPath: string = DEFAULT_SCHEMA_PATH,
): string[] {
  const schema = readFileSync(schemaPath, "utf8");
  const blockMatch = schema.match(new RegExp(`enum\\s+${enumName}\\s*\\{([^}]*)\\}`, "s"));
  if (!blockMatch) {
    return [];
  }

  return blockMatch[1]!
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, "").trim())
    .filter(Boolean);
}

export function diffPrismaSchemaAndGeneratedEnum(pair: PrismaEnumRuntimePair): {
  schemaOnly: string[];
  generatedOnly: string[];
} {
  const schemaValues = readPrismaSchemaEnumValues(pair.schemaEnumName);
  const generatedValues = Object.values(pair.runtimeValues).sort();

  const schemaSet = new Set(schemaValues);
  const generatedSet = new Set(generatedValues);

  const schemaOnly = schemaValues.filter((value) => !generatedSet.has(value));
  const generatedOnly = generatedValues.filter((value) => !schemaSet.has(value));

  return { schemaOnly, generatedOnly };
}

export function collectPrismaGeneratedEnumParityViolations(
  pairs: readonly PrismaEnumRuntimePair[] = PRISMA_ENUM_RUNTIME_PAIRS,
): PreflightViolation[] {
  const violations: PreflightViolation[] = [];

  for (const pair of pairs) {
    const { schemaOnly, generatedOnly } = diffPrismaSchemaAndGeneratedEnum(pair);
    if (schemaOnly.length === 0 && generatedOnly.length === 0) {
      continue;
    }

    const parts: string[] = [];
    if (schemaOnly.length > 0) {
      parts.push(`schema-only: ${schemaOnly.join(", ")}`);
    }
    if (generatedOnly.length > 0) {
      parts.push(`generated-only: ${generatedOnly.join(", ")}`);
    }

    violations.push({
      code: "PRISMA_GENERATED_ENUM_DRIFT",
      severity: "error",
      message:
        `Prisma enum ${pair.schemaEnumName} does not match the generated @prisma/client ` +
        `(${parts.join("; ")}). Run \`npx prisma generate\` from prisma/schema.prisma before building or deploying.`,
    });
  }

  return violations;
}
