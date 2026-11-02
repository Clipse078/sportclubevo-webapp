import { describe, expect, it } from "vitest";
import { enrichPreviewScreen1HeaderConfig } from "@/lib/infoboard/preview-header-config";

describe("enrichPreviewScreen1HeaderConfig", () => {
  it("adds preview-only page heading for LIGHT fc-allschwil UAT", () => {
    const result = enrichPreviewScreen1HeaderConfig({
      headerConfig: {
        subtitleEnabled: true,
        subtitleText: "HERZLICH WILLKOMMEN",
        showTime: true,
        showDate: true,
        showWeather: false,
      },
      theme: "LIGHT",
      tenant: { key: "fc-allschwil", id: "t1", name: "FC Allschwil", timezone: "Europe/Zurich" },
      board: null,
    });
    expect(result?.pageHeadingText).toBe("HEUTE IM BRÜEL");
  });

  it("does not inject page heading for DARK theme", () => {
    const result = enrichPreviewScreen1HeaderConfig({
      headerConfig: {
        subtitleEnabled: true,
        subtitleText: "HERZLICH WILLKOMMEN",
        showTime: true,
        showDate: true,
        showWeather: false,
      },
      theme: "DARK",
      tenant: { key: "fc-allschwil" },
      board: null,
    });
    expect(result?.pageHeadingText).toBeUndefined();
  });

  it("preserves explicit pageHeadingText", () => {
    const result = enrichPreviewScreen1HeaderConfig({
      headerConfig: {
        subtitleEnabled: false,
        subtitleText: null,
        showTime: true,
        showDate: true,
        showWeather: false,
        pageHeadingText: "HEUTE AUF DER ANLAGE",
      },
      theme: "LIGHT",
      tenant: { key: "other-club" },
      board: null,
    });
    expect(result?.pageHeadingText).toBe("HEUTE AUF DER ANLAGE");
  });
});
