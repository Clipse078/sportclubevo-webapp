export function isVitestRuntime(): boolean {
  return typeof process !== "undefined" && process.env.VITEST === "true";
}