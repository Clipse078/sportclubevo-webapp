/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import FacilitiesOperationalSettingsPanel from "../FacilitiesOperationalSettingsPanel";
import {
  SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES,
  SCE_PLATFORM_DEFAULT_TRAINING_DURATION_MINUTES,
  SCE_PLATFORM_DEFAULT_TOURNAMENT_DURATION_MINUTES,
} from "@/lib/operational/defaults";

const platformPolicy = {
  MATCH: { durationMinutes: SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES, isClubConfigured: false },
  TRAINING: {
    durationMinutes: SCE_PLATFORM_DEFAULT_TRAINING_DURATION_MINUTES,
    isClubConfigured: false,
  },
  TOURNAMENT: {
    durationMinutes: SCE_PLATFORM_DEFAULT_TOURNAMENT_DURATION_MINUTES,
    isClubConfigured: false,
  },
};

const defaultPresets = {
  training: { beforeMinutes: 30, afterMinutes: 30 },
  match: { beforeMinutes: 60, afterMinutes: 45 },
  tournament: { beforeMinutes: 60, afterMinutes: 60 },
};

describe("FacilitiesOperationalSettingsPanel", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("operational-duration-policy")) {
          return new Response(JSON.stringify({ policy: platformPolicy }), { status: 200 });
        }
        if (url.includes("dressing-room-occupancy-presets")) {
          return new Response(JSON.stringify({ presets: defaultPresets }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: "unknown" }), { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows platform defaults 120 / 90 / 120", () => {
    render(
      <FacilitiesOperationalSettingsPanel
        initialPolicy={platformPolicy}
        initialPresets={defaultPresets}
        canManage
      />,
    );
    expect(screen.getByTestId("match-default-duration-minutes")).toHaveValue(120);
    expect(screen.getByTestId("training-default-duration-minutes")).toHaveValue(90);
    expect(screen.getByTestId("tournament-default-duration-minutes")).toHaveValue(120);
  });

  it("disables save and cancel until the form is dirty", () => {
    render(
      <FacilitiesOperationalSettingsPanel
        initialPolicy={platformPolicy}
        initialPresets={defaultPresets}
        canManage
      />,
    );
    expect(screen.getByTestId("facilities-operational-settings-save")).toBeDisabled();
    expect(screen.getByTestId("facilities-operational-settings-cancel")).toBeDisabled();
  });

  it("Abbrechen restores persisted values without saving", async () => {
    render(
      <FacilitiesOperationalSettingsPanel
        initialPolicy={platformPolicy}
        initialPresets={defaultPresets}
        canManage
      />,
    );
    const matchInput = screen.getByTestId("match-default-duration-minutes");
    fireEvent.change(matchInput, { target: { value: "100" } });
    expect(matchInput).toHaveValue(100);
    fireEvent.click(screen.getByTestId("facilities-operational-settings-cancel"));
    expect(matchInput).toHaveValue(120);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("save persists dirty values via both tenant APIs", async () => {
    render(
      <FacilitiesOperationalSettingsPanel
        initialPolicy={platformPolicy}
        initialPresets={defaultPresets}
        canManage
      />,
    );
    fireEvent.change(screen.getByTestId("match-default-duration-minutes"), {
      target: { value: "105" },
    });
    fireEvent.click(screen.getByTestId("facilities-operational-settings-save"));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByTestId("facilities-operational-settings-save")).toBeDisabled(),
    );
  });

  it("uses fca-minutes-input on duration fields (no native spinner class regression)", () => {
    render(
      <FacilitiesOperationalSettingsPanel
        initialPolicy={platformPolicy}
        initialPresets={defaultPresets}
        canManage
      />,
    );
    expect(screen.getByTestId("match-default-duration-minutes").className).toMatch(/fca-minutes-input/);
  });
});
