/**
 * SCE-CD-02R9 — stable content fingerprints for approval invalidation.
 */

import { createHash } from "node:crypto";

export function hashMeetingDecisionContent(input: {
  title: string;
  description: string | null;
  rationale: string | null;
  revision: number;
}): string {
  const payload = [
    String(input.revision),
    input.title,
    input.description ?? "",
    input.rationale ?? "",
  ].join("\n");
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function hashMeetingProtocolContent(input: {
  revision: number;
  title: string;
  description: string | null;
  agendaTitles: string[];
  decisionTitles: string[];
}): string {
  const payload = [
    String(input.revision),
    input.title,
    input.description ?? "",
    input.agendaTitles.join("|"),
    input.decisionTitles.join("|"),
  ].join("\n");
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function materialContentChanged(storedHash: string | null | undefined, currentHash: string): boolean {
  if (!storedHash) return false;
  return storedHash !== currentHash;
}
