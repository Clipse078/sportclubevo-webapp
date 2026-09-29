/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { communicationAudienceDiscoverFetch } from "@/lib/communication/audience/communication-audience-discover-client";
import {
  SCE_SELECTOR_DISCOVER_ERROR_FORBIDDEN,
  SCE_SELECTOR_DISCOVER_ERROR_UNAUTHORIZED,
} from "@/lib/sce/list-selector/selector-discover-api-errors";

describe("communicationAudienceDiscoverFetch (R2 error UX)", () => {
  const enabledFeatures = {
    wholeOrganisation: false,
    orgUnits: true,
    teams: true,
    roles: true,
    targetGroups: false,
    persons: false,
    externalContacts: false,
  };

  it("maps HTTP 403 to German permission copy", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    ) as typeof fetch;

    const fetchFn = communicationAudienceDiscoverFetch({
      context: "TARGET_GROUP_MANAGEMENT",
      enabledFeatures,
    });
    const result = await fetchFn({ query: "", category: "all", signal: new AbortController().signal });
    expect(result.error).toBe(SCE_SELECTOR_DISCOVER_ERROR_FORBIDDEN);
  });

  it("maps HTTP 401 to session copy", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    ) as typeof fetch;

    const fetchFn = communicationAudienceDiscoverFetch({
      context: "TARGET_GROUP_MANAGEMENT",
      enabledFeatures,
    });
    const result = await fetchFn({ query: "", category: "all", signal: new AbortController().signal });
    expect(result.error).toBe(SCE_SELECTOR_DISCOVER_ERROR_UNAUTHORIZED);
  });
});
