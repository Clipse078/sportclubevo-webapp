import { describe, expect, it } from "vitest";
import {
  buildTaskManagementHref,
  buildTaskManagementResetHref,
  hasSecondaryTaskFilters,
  parseTaskManagementQuery,
  parseTaskManagementSort,
  parseTaskManagementView,
  resolveTaskManagementQuery,
  PERSONAL_DEFAULT_VIEW,
  TENANT_WIDE_DEFAULT_VIEW,
} from "../management-navigation";

describe("task management navigation", () => {
  it("parses default query state for tenant-wide visibility", () => {
    expect(parseTaskManagementQuery({}, { tenantWideVisibility: true })).toMatchObject({
      view: TENANT_WIDE_DEFAULT_VIEW,
      search: "",
      sort: "DEADLINE_ASC",
      status: "ACTIVE",
      page: 1,
    });
  });

  it("parses default query state for personal visibility", () => {
    expect(parseTaskManagementQuery({}, { tenantWideVisibility: false })).toMatchObject({
      view: PERSONAL_DEFAULT_VIEW,
    });
  });

  it("parses management perspectives from view param", () => {
    expect(parseTaskManagementView("meine")).toBe("MEINE");
    expect(parseTaskManagementView("ueberfaellig")).toBe("UEBERFAELLIG");
    expect(parseTaskManagementView("invalid")).toBe("ALLE");
  });

  it("builds hrefs preserving canonical state", () => {
    const current = parseTaskManagementQuery({
      view: "MEINE",
      q: "Material",
      sort: "PRIORITY_DESC",
      page: "2",
    });
    const href = buildTaskManagementHref(
      "/dashboard/aufgaben",
      { view: "UEBERFAELLIG" },
      current,
    );
    expect(href).toContain("view=UEBERFAELLIG");
    expect(href).toContain("q=Material");
    expect(href).toContain("sort=PRIORITY_DESC");
    expect(href).not.toContain("page=2");
  });

  it("detects secondary filters", () => {
    expect(hasSecondaryTaskFilters(parseTaskManagementQuery({}))).toBe(false);
    expect(hasSecondaryTaskFilters(parseTaskManagementQuery({ q: "x" }))).toBe(true);
    expect(hasSecondaryTaskFilters(parseTaskManagementQuery({ assignee: "u1" }))).toBe(true);
  });

  it("reset href keeps active perspective", () => {
    expect(buildTaskManagementResetHref("/dashboard/aufgaben", "MEINE")).toBe(
      "/dashboard/aufgaben?view=MEINE",
    );
  });

  it("parses sort param", () => {
    expect(parseTaskManagementSort("TITLE_ASC")).toBe("TITLE_ASC");
    expect(parseTaskManagementSort(undefined)).toBe("DEADLINE_ASC");
  });

  it("resolveTaskManagementQuery downscopes manipulated ALLE for personal users", () => {
    expect(resolveTaskManagementQuery({ view: "ALLE" }, false).view).toBe("MEINE");
  });
});
