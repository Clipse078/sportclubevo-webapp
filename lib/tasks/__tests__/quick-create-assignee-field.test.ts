import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TaskForbiddenError, TaskValidationError } from "../errors";
import {
  findForbiddenQuickCreateFormFields,
  normalizeQuickCreateAssigneeIds,
  parseQuickCreateAssigneeField,
} from "../quick-create";

const ctx = {
  tenantId: "t1",
  userId: "u-self",
  permissionKeys: [PERMISSIONS.TASKS_VIEW],
};

describe("parseQuickCreateAssigneeField", () => {
  it("absent field defaults to self at normalize layer", () => {
    const fd = new FormData();
    fd.set("title", "x");
    const parsed = parseQuickCreateAssigneeField(fd);
    expect(parsed).toEqual({ ok: true, ids: [], defaultToSelfWhenEmpty: true });
    expect(
      normalizeQuickCreateAssigneeIds(ctx, parsed.ok ? parsed.ids : [], false, true),
    ).toEqual(["u-self"]);
  });

  it("explicit empty string fails closed", () => {
    const fd = new FormData();
    fd.set("assigneeUserIds", "");
    expect(parseQuickCreateAssigneeField(fd)).toEqual({ ok: false });
  });

  it("whitespace-only tokens fail closed", () => {
    const fd = new FormData();
    fd.set("assigneeUserIds", "  ,  , ");
    expect(parseQuickCreateAssigneeField(fd)).toEqual({ ok: false });
  });

  it("valid explicit self id is accepted", () => {
    const fd = new FormData();
    fd.set("assigneeUserIds", "u-self");
    const parsed = parseQuickCreateAssigneeField(fd);
    expect(parsed).toEqual({ ok: true, ids: ["u-self"], defaultToSelfWhenEmpty: false });
  });

  it("duplicate self ids dedupe to self-only", () => {
    const ids = normalizeQuickCreateAssigneeIds(ctx, ["u-self", "u-self"], false, false);
    expect(ids).toEqual(["u-self"]);
  });

  it("empty normalize without default throws", () => {
    expect(() => normalizeQuickCreateAssigneeIds(ctx, [], false, false)).toThrow(
      TaskValidationError,
    );
  });

  it("other user without assign capability throws", () => {
    expect(() =>
      normalizeQuickCreateAssigneeIds(ctx, ["u-other"], false, false),
    ).toThrow(TaskForbiddenError);
  });
});

describe("findForbiddenQuickCreateFormFields", () => {
  it("detects hidden tenant and creator fields", () => {
    const fd = new FormData();
    fd.set("tenantId", "evil");
    expect(findForbiddenQuickCreateFormFields(fd)).toBe("tenantId");
    fd.delete("tenantId");
    fd.set("visibilityScope", "ORG_UNIT");
    expect(findForbiddenQuickCreateFormFields(fd)).toBe("visibilityScope");
  });
});
