import { describe, expect, it } from "vitest";
import { buildVeranstaltungenHref } from "../navigation";

describe("veranstaltungen navigation", () => {
  it("omits month from URL when no explicit list filter", () => {
    const href = buildVeranstaltungenHref("/dashboard/veranstaltungen", {
      tab: "BEVORSTEHEND",
      month: null,
      cal: null,
      search: "",
      location: null,
      review: "ALLE",
      publication: "ALLE",
    });
    expect(href).toBe("/dashboard/veranstaltungen");
  });

  it("includes month only for explicit filter and cal only for calendar browse", () => {
    expect(
      buildVeranstaltungenHref("/dashboard/veranstaltungen", {
        tab: "BEVORSTEHEND",
        month: "2026-10",
        cal: null,
        search: "",
        location: null,
        review: "ALLE",
        publication: "ALLE",
      }),
    ).toBe("/dashboard/veranstaltungen?month=2026-10");

    expect(
      buildVeranstaltungenHref("/dashboard/veranstaltungen", {
        tab: "BEVORSTEHEND",
        month: null,
        cal: "2026-11",
        search: "",
        location: null,
        review: "ALLE",
        publication: "ALLE",
      }),
    ).toBe("/dashboard/veranstaltungen?cal=2026-11");
  });
});
