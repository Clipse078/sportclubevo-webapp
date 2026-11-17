import { describe, expect, it } from "vitest";
import {
  buildTraktandumTaskOccurrenceKey,
  parseAgendaItemIdFromTraktandumTaskOccurrenceKey,
  traktandumTaskOccurrenceKeyPrefixForAgenda,
} from "@/lib/meetings/meeting-traktandum-task-link";

describe("meeting-traktandum-task-link", () => {
  it("round-trips agenda id in occurrence key", () => {
    const key = buildTraktandumTaskOccurrenceKey("agenda-1", "client-abc");
    expect(key).toBe("sce-mtg-traktandum-task:v1:agenda-1:client-abc");
    expect(parseAgendaItemIdFromTraktandumTaskOccurrenceKey(key)).toBe("agenda-1");
    expect(traktandumTaskOccurrenceKeyPrefixForAgenda("agenda-1")).toBe(
      "sce-mtg-traktandum-task:v1:agenda-1:",
    );
  });
});