import { describe, expect, it } from "vitest";
import { buildMeetingDeletionConfirmDescription } from "@/lib/meetings/meeting-deletion-confirm-copy";

describe("buildMeetingDeletionConfirmDescription", () => {
  it("names protocol-owned records that are deleted and clarifies standalone retention", () => {
    const text = buildMeetingDeletionConfirmDescription("Vorstand", {
      agendaItems: 2,
      decisions: 1,
      actions: 3,
      participants: 4,
    });

    expect(text).toContain("Traktanden");
    expect(text).toContain("Beschlüsse");
    expect(text).toContain("Pendenzen");
    expect(text).toContain("Protokolldaten");
    expect(text).toContain("Eigenständige Aufgaben");
    expect(text).toContain("Dokumente");
    expect(text).toMatch(/Sitzungseigene Pendenzen.*gelöscht/);
    expect(text).toMatch(/ersetzt keine Sitzungsinhalte/);
  });
});