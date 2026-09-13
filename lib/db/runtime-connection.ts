/**
 * Returns the connection source used by the Prisma runtime.
 *
 * Keep this resolver in sync with `lib/db/prisma.ts`; runtime diagnostics must
 * describe the connection Prisma actually uses, never a reference URL.
 */
export function getEffectivePrismaRuntimeConnectionSource(
  env: NodeJS.ProcessEnv = process.env,
): { variable: "DATABASE_URL" | "TEST_DATABASE_URL"; value: string | null } {
  const variable =
    env.NODE_ENV === "test" ? "TEST_DATABASE_URL" : "DATABASE_URL";
  const value = env[variable]?.trim();
  return { variable, value: value || null };
}
