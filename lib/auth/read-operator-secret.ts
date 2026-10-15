/**
 * Reads operator-supplied secrets without echoing them to stdout/stderr.
 * Prefer EMERGENCY_RESTORE_PASSWORD_FILE or a TTY prompt over argv.
 */

import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

export async function readOperatorPasswordFromRuntime(
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const fromEnv = env.EMERGENCY_RESTORE_PASSWORD?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const filePath = env.EMERGENCY_RESTORE_PASSWORD_FILE?.trim();
  if (filePath) {
    const contents = (await readFile(filePath, "utf8")).trim();
    if (contents.length > 0) {
      return contents;
    }
  }

  const result = spawnSync(
    "bash",
    [
      "-c",
      'read -r -s -p "Enter password (hidden): " pw < /dev/tty && printf "%s" "$pw"',
    ],
    { encoding: "utf8", stdio: ["inherit", "pipe", "inherit"] },
  );

  if (result.status !== 0) {
    throw new Error("Failed to read operator password from TTY.");
  }

  const trimmed = (result.stdout ?? "").trim();
  if (!trimmed) {
    throw new Error("Empty operator password.");
  }
  return trimmed;
}
