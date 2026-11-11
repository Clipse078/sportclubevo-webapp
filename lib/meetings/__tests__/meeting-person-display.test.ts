import { describe, expect, it } from "vitest";
import {
  looksLikeOpaquePersonId,
  meetingPersonFallbackLabel,
  resolveStoredPersonDisplayName,
} from "@/lib/meetings/meeting-person-display";

describe("meeting person display", () => {
  it("detects opaque cuid-like stored values", () => {
    expect(looksLikeOpaquePersonId("cmsnqz0qz000004l8g2efoyhw")).toBe(true);
    expect(looksLikeOpaquePersonId("Anna Müller")).toBe(false);
  });

  it("prefers resolved tenant labels over raw ids", () => {
    expect(
      resolveStoredPersonDisplayName({
        name: "cmsnqz0qz000004l8g2efoyhw",
        personId: "cmsnqz0qz000004l8g2efoyhw",
        resolvedLabel: "Anna Müller",
      }),
    ).toBe("Anna Müller");
  });

  it("falls back safely when person record is missing", () => {
    expect(
      resolveStoredPersonDisplayName({
        name: "cmsnqz0qz000004l8g2efoyhw",
        personId: "cmsnqz0qz000004l8g2efoyhw",
      }),
    ).toBe(meetingPersonFallbackLabel("cmsnqz0qz000004l8g2efoyhw"));
  });
});
