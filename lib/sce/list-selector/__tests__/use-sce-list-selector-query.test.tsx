/**
 * @vitest-environment jsdom
 * SCE-SELECTOR-01R1 — query lifecycle / abort / timeout invariants
 */
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useSceListSelectorQuery } from "@/lib/sce/list-selector/use-sce-list-selector-query";
import type { SceListSelectorFetchParams } from "@/lib/sce/list-selector/use-sce-list-selector-query";

describe("useSceListSelectorQuery", () => {
  it("starts empty-query browse on open", async () => {
    const fetchResults = vi.fn(async () => ({
      groups: [
        {
          type: "TEAM" as const,
          heading: "Teams",
          items: [{ id: "t1", type: "TEAM" as const, label: "Team A" }],
        },
      ],
    }));

    const { result } = renderHook(() =>
      useSceListSelectorQuery({
        open: true,
        enabledTypes: ["TEAM"],
        fetchResults,
      }),
    );

    await waitFor(() => expect(fetchResults).toHaveBeenCalled());
    await waitFor(() => expect(result.current.groups).toHaveLength(1));
    expect(result.current.loading).toBe(false);
    expect(fetchResults).toHaveBeenCalledWith(
      expect.objectContaining({ query: "", category: "all" }),
    );
    expect(result.current.status).toBe("success");
  });

  it("clears loading after success and on empty response", async () => {
    const fetchResults = vi.fn(async () => ({ groups: [], noAccess: false }));
    const { result } = renderHook(() =>
      useSceListSelectorQuery({
        open: true,
        enabledTypes: ["TEAM"],
        fetchResults,
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status).toBe("empty");
  });

  it("surfaces error and clears loading", async () => {
    const fetchResults = vi.fn(async () => {
      throw new Error("network");
    });
    const { result } = renderHook(() =>
      useSceListSelectorQuery({
        open: true,
        enabledTypes: ["TEAM"],
        fetchResults,
      }),
    );

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.loading).toBe(false);
    expect(result.current.status).toBe("error");
  });

  it("timeout error clears loading", async () => {
    const fetchResults = vi.fn(async () => {
      throw new Error("SCE_SELECTOR_FETCH_TIMEOUT");
    });
    const { result } = renderHook(() =>
      useSceListSelectorQuery({
        open: true,
        enabledTypes: ["TEAM"],
        fetchResults,
      }),
    );

    await waitFor(() => expect(result.current.error).toBe("Auswahl konnte nicht geladen werden."));
    expect(result.current.loading).toBe(false);
  });

  it("retry starts a fresh request", async () => {
    let call = 0;
    const fetchResults = vi.fn(async () => {
      call += 1;
      if (call === 1) throw new Error("fail");
      return {
        groups: [
          {
            type: "TEAM" as const,
            heading: "Teams",
            items: [{ id: "t1", type: "TEAM" as const, label: "Team A" }],
          },
        ],
      };
    });

    const { result } = renderHook(() =>
      useSceListSelectorQuery({
        open: true,
        enabledTypes: ["TEAM"],
        fetchResults,
      }),
    );

    await waitFor(() => expect(result.current.error).toBeTruthy());

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.groups).toHaveLength(1));
    expect(result.current.loading).toBe(false);
    expect(fetchResults).toHaveBeenCalledTimes(2);
  });

  it("stale responses cannot overwrite the latest generation", async () => {
    const resolvers: Array<
      (value: {
        groups: Array<{
          type: "TEAM";
          heading: string;
          items: Array<{ id: string; type: "TEAM"; label: string }>;
        }>;
      }) => void
    > = [];
    const fetchResults = vi.fn(
      () =>
        new Promise<{
          groups: Array<{
            type: "TEAM";
            heading: string;
            items: Array<{ id: string; type: "TEAM"; label: string }>;
          }>;
        }>((resolve) => {
          resolvers.push(resolve);
        }),
    );

    const { result } = renderHook(() =>
      useSceListSelectorQuery({
        open: true,
        enabledTypes: ["TEAM", "ORG_UNIT"],
        fetchResults,
      }),
    );

    await waitFor(() => expect(resolvers).toHaveLength(1));

    await act(async () => {
      result.current.setCategory("team");
    });

    await waitFor(() => expect(resolvers.length).toBeGreaterThanOrEqual(2));

    await act(async () => {
      resolvers[0]?.({
        groups: [
          {
            type: "TEAM",
            heading: "Teams",
            items: [{ id: "stale", type: "TEAM", label: "Stale" }],
          },
        ],
      });
    });

    await act(async () => {
      resolvers[1]?.({
        groups: [
          {
            type: "TEAM",
            heading: "Teams",
            items: [{ id: "t2", type: "TEAM", label: "Latest" }],
          },
        ],
      });
    });

    await waitFor(() => expect(result.current.groups[0]?.items[0]?.label).toBe("Latest"));
    expect(result.current.loading).toBe(false);
  });

  it("loadMore appends rows and passes continuation cursor", async () => {
    const fetchResults = vi.fn(async (params: SceListSelectorFetchParams) => {
      if (params.cursors?.TEAM) {
        return {
          groups: [
            {
              type: "TEAM" as const,
              heading: "Teams",
              items: [{ id: "t2", type: "TEAM" as const, label: "Team B" }],
              hasMore: false,
              nextCursor: null,
            },
          ],
        };
      }
      return {
        groups: [
          {
            type: "TEAM" as const,
            heading: "Teams",
            items: [{ id: "t1", type: "TEAM" as const, label: "Team A" }],
            hasMore: true,
            nextCursor: "1",
          },
        ],
      };
    });

    const { result } = renderHook(() =>
      useSceListSelectorQuery({
        open: true,
        enabledTypes: ["TEAM"],
        fetchResults,
      }),
    );

    await waitFor(() => expect(result.current.groups[0]?.items).toHaveLength(1));

    await act(async () => {
      result.current.loadMore("TEAM");
    });

    await waitFor(() => expect(result.current.groups[0]?.items).toHaveLength(2));
    expect(fetchResults).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursors: { TEAM: "1" } }),
    );
    expect(result.current.loadingMore).toBe(false);
  });

  it("rapid open/close/open settles without permanent loading", async () => {
    const fetchResults = vi.fn(
      (params: SceListSelectorFetchParams) =>
        new Promise<{ groups: [] }>((resolve, reject) => {
          params.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
          setTimeout(() => resolve({ groups: [] }), 30);
        }),
    );

    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) =>
        useSceListSelectorQuery({
          open,
          enabledTypes: ["TEAM"],
          fetchResults,
        }),
      { initialProps: { open: true } },
    );

    rerender({ open: false });
    rerender({ open: true });

    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
