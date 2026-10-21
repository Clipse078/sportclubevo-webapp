import { describe, expect, it } from "vitest";
import {
  PERSONAL_ACTION_INBOX_TYPE_SEMANTICS,
  personalActionTypePillText,
  personalActionTypeSemantic,
} from "../personal-action-type-semantics";

describe("personal action inbox type semantics (DS-10 R4.1)", () => {
  it("locks shared textual + colour semantics", () => {
    expect(PERSONAL_ACTION_INBOX_TYPE_SEMANTICS.TASK_TYPE_TEXT_REQUIRED).toBe("YES");
    expect(PERSONAL_ACTION_INBOX_TYPE_SEMANTICS.COLOUR_ONLY_TASK_TYPE_SEMANTICS).toBe("NO");
    expect(PERSONAL_ACTION_INBOX_TYPE_SEMANTICS.TASK_TYPE_VISUAL_SYSTEM_SHARED).toBe("YES");
  });

  it("maps AUFGABE, TEILNAHME, ANFORDERUNG with distinct restrained tones", () => {
    const task = personalActionTypeSemantic("TASK");
    const attendance = personalActionTypeSemantic("ATTENDANCE_RESPONSE");
    const requirement = personalActionTypeSemantic("REQUIREMENT");

    expect(personalActionTypePillText("TASK")).toBe("AUFGABE");
    expect(personalActionTypePillText("ATTENDANCE_RESPONSE")).toBe("TEILNAHME");
    expect(personalActionTypePillText("REQUIREMENT")).toBe("ANFORDERUNG");

    expect(task?.surfaceClass).toContain("--sce-warning");
    expect(attendance?.surfaceClass).toContain("--sce-primary");
    expect(requirement?.surfaceClass).toContain("--sce-success");
    expect(task?.surfaceClass).not.toBe(attendance?.surfaceClass);
  });
});
