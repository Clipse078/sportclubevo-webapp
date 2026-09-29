import { describe, expect, it } from "vitest";
import { formatPeopleAccessDate } from "@/lib/admin/people-access/date-format";

describe("formatPeopleAccessDate", () => {
  it("formats ISO strings from RSC serialization", () => {
    const formatted = formatPeopleAccessDate("2025-03-15T12:00:00.000Z");
    expect(formatted).not.toBe("—");
    expect(formatted).toMatch(/2025/);
  });
});
