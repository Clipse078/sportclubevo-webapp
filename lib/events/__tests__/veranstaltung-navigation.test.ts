import { describe, expect, it } from "vitest";
import {
  getVeranstaltungDetailHref,
  getVeranstaltungHref,
  VERANSTALTUNGEN_CREATE_PATH,
  VERANSTALTUNGEN_LIST_PATH,
} from "@/lib/events/veranstaltung-navigation";

describe("veranstaltung-navigation", () => {
  it("uses canonical edit route for existing events", () => {
    expect(getVeranstaltungHref("evt-abc")).toBe(
      "/dashboard/veranstaltungen/evt-abc/edit",
    );
    expect(getVeranstaltungDetailHref("evt-abc")).toBe(getVeranstaltungHref("evt-abc"));
  });

  it("exposes list and create paths", () => {
    expect(VERANSTALTUNGEN_LIST_PATH).toBe("/dashboard/veranstaltungen");
    expect(VERANSTALTUNGEN_CREATE_PATH).toBe("/dashboard/veranstaltungen/new");
  });
});
