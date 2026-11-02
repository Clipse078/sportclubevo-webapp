import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buildScreen1KioskPresentation: vi.fn(),
  getInfoboardBySlug: vi.fn(),
}));

vi.mock("@/lib/infoboard/screen1-kiosk-presentation", () => ({
  buildScreen1KioskPresentation: mocks.buildScreen1KioskPresentation,
}));
vi.mock("@/lib/infoboard/queries", () => ({
  getInfoboardBySlug: mocks.getInfoboardBySlug,
}));
vi.mock("@/lib/publishing/infoboard/canonical-source-loader", () => ({
  createCanonicalInfoboardSourceLoader: () => ({}),
}));
vi.mock("@/lib/infoboard/screen1-tournament-composition", () => ({
  createScreen1TournamentPresentationDatabase: () => ({}),
  resolveScreen1OrganizerClubsByName: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findMany: vi.fn() },
    trainingSession: { findMany: vi.fn() },
    facilityResource: { findMany: vi.fn() },
  },
}));

const tenant = {
  id: "tenant-fca",
  key: "fc-allschwil",
  name: "FC Allschwil",
  timezone: "Europe/Zurich",
};

describe("buildScreen1PreviewData displayTheme override", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getInfoboardBySlug.mockResolvedValue({
      id: "board-1",
      displayTheme: "DARK",
      headerSubtitleEnabled: true,
      headerSubtitleText: "Welcome",
      headerShowTime: true,
      headerShowDate: true,
      headerShowWeather: false,
    });
    mocks.buildScreen1KioskPresentation.mockResolvedValue({
      payload: {
        feed: {},
        theme: "LIGHT",
        headerConfig: {
          subtitleEnabled: true,
          subtitleText: "Welcome",
          showTime: true,
          showDate: true,
          showWeather: false,
        },
      },
      weather: null,
      infoboardScreen1Props: {},
    });
  });

  it("passes preview-only displayTheme into kiosk presentation boardConfig", async () => {
    const { buildScreen1PreviewData } = await import("@/lib/infoboard/preview-data");
    await buildScreen1PreviewData(tenant, new Date(), {
      displayThemeOverride: "LIGHT",
    });
    expect(mocks.buildScreen1KioskPresentation).toHaveBeenCalledWith(
      expect.objectContaining({
        boardConfig: expect.objectContaining({ displayTheme: "LIGHT" }),
      }),
    );
  });
});
