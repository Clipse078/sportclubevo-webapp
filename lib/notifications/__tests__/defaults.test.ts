import { describe, expect, it } from "vitest";
import { getDefaultNotificationPreferences } from "../defaults";

describe("notification defaults", () => {
  it("matches Aufgaben V1 defaults", () => {
    const defaults = getDefaultNotificationPreferences();
    expect(defaults.TASK_ASSIGNED).toEqual({ inAppEnabled: true, emailEnabled: true });
    expect(defaults.TASK_DEADLINE_CHANGED).toEqual({
      inAppEnabled: true,
      emailEnabled: false,
    });
  });
});
