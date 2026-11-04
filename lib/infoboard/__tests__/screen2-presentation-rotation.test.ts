import { describe, expect, it } from "vitest";
import {
  SCREEN2_PRESENTATION_ANLAGEPLAN_MS,
  SCREEN2_PRESENTATION_INITIAL,
  SCREEN2_PRESENTATION_OV_MS,
  catchUpScreen2Presentation,
  durationMsForScreen2Presentation,
  nextScreen2Presentation,
  resolveScreen2PresentationAtElapsedMs,
} from "@/lib/infoboard/screen2-presentation-rotation";

describe("screen2-presentation-rotation", () => {
  it("starts on ANLAGEPLAN with configured durations", () => {
    expect(SCREEN2_PRESENTATION_INITIAL).toBe("anlageplan");
    expect(durationMsForScreen2Presentation("anlageplan")).toBe(
      SCREEN2_PRESENTATION_ANLAGEPLAN_MS,
    );
    expect(durationMsForScreen2Presentation("ov")).toBe(SCREEN2_PRESENTATION_OV_MS);
    expect(SCREEN2_PRESENTATION_ANLAGEPLAN_MS).toBe(25_000);
    expect(SCREEN2_PRESENTATION_OV_MS).toBe(20_000);
  });

  it("alternates ANLAGEPLAN → ÖV → ANLAGEPLAN", () => {
    expect(nextScreen2Presentation("anlageplan")).toBe("ov");
    expect(nextScreen2Presentation("ov")).toBe("anlageplan");
  });

  it("resolves presentation across elapsed cycle time", () => {
    expect(resolveScreen2PresentationAtElapsedMs(0).presentation).toBe("anlageplan");
    expect(resolveScreen2PresentationAtElapsedMs(24_999).presentation).toBe("anlageplan");
    expect(resolveScreen2PresentationAtElapsedMs(25_000).presentation).toBe("ov");
    expect(resolveScreen2PresentationAtElapsedMs(44_999).presentation).toBe("ov");
    expect(resolveScreen2PresentationAtElapsedMs(45_000).presentation).toBe("anlageplan");
  });

  it("catchUpScreen2Presentation advances overdue states", () => {
    const enteredAt = 1_000;
    const now = enteredAt + 26_000;
    const caught = catchUpScreen2Presentation("anlageplan", enteredAt, now);
    expect(caught.presentation).toBe("ov");
    expect(caught.enteredAtMs).toBe(enteredAt + SCREEN2_PRESENTATION_ANLAGEPLAN_MS);
  });
});
