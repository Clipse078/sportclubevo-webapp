// @vitest-environment jsdom
/**
 * SCE-COMM-EVO-01 — Ansicht / INBOX-02 layout preference defects.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  defaultListSplitPercentForLayout,
  defaultInboxWorkspacePreference,
} from "@/lib/communication/inbox/inbox-workspace-preferences";
import { useCommunicationInboxWorkspacePreferences } from "@/components/admin/communication/inbox/useCommunicationInboxWorkspacePreferences";

describe("SCE-COMM-EVO-01 inbox Ansicht defects", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("product contract: switching layout preset applies that layout default split (currently fails on client)", () => {
    const { result } = renderHook(() => useCommunicationInboxWorkspacePreferences());

    act(() => {
      result.current.setLayout("READING_LARGE");
    });

    expect(result.current.preference.layout).toBe("READING_LARGE");
    expect(result.current.preference.listSplitPercent).toBe(
      defaultListSplitPercentForLayout("READING_LARGE"),
    );
  });

  it("product contract: stale initial GET must not overwrite a newer local layout choice (currently fails)", async () => {
    let resolveGet: ((value: Response) => void) | undefined;
    const getPromise = new Promise<Response>((resolve) => {
      resolveGet = resolve;
    });

    vi.spyOn(global, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes("/api/communication/inbox/workspace-preferences") && init?.method !== "PUT") {
        return getPromise;
      }
      if (url.includes("/api/communication/inbox/workspace-preferences") && init?.method === "PUT") {
        return new Promise(() => {
          /* intentionally pending — isolate GET race from PUT reconciliation */
        });
      }
      return Promise.resolve(new Response("{}", { status: 404 }));
    });

    const { result } = renderHook(() => useCommunicationInboxWorkspacePreferences());

    act(() => {
      result.current.setLayout("READING_LARGE");
    });

    expect(result.current.preference.layout).toBe("READING_LARGE");

    await act(async () => {
      resolveGet!(
        new Response(
          JSON.stringify({
            preference: defaultInboxWorkspacePreference(),
          }),
          { status: 200 },
        ),
      );
    });

    await waitFor(() => {
      expect(result.current.preference.layout).toBe("READING_LARGE");
    });
  });
});
