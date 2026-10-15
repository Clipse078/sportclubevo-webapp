/**
 * SCE-NAVBAR-UPGRADE-01-R10 — canonical L1 route vs panel-open visual states
 */

import { describe, expect, it } from "vitest";
import {
  primaryL1VisualStateClass,
  resolvePrimaryL1VisualState,
} from "@/lib/nav/primary-l1-visual-state";

describe("primary L1 visual state", () => {
  it("uses strong route-active when no panel is open", () => {
    expect(
      resolvePrimaryL1VisualState("club", "club", null, false),
    ).toBe("strong");
    expect(primaryL1VisualStateClass("strong")).toBe(
      "sce-global-primary-nav-item--active",
    );
  });

  it("uses strong open state for the panel domain and subdued route context for the route domain", () => {
    expect(
      resolvePrimaryL1VisualState("planning", "club", "planning", false),
    ).toBe("strong");
    expect(
      resolvePrimaryL1VisualState("club", "club", "planning", false),
    ).toBe("route-subtle");
    expect(primaryL1VisualStateClass("route-subtle")).toBe(
      "sce-global-primary-nav-item--route-context",
    );
  });

  it("restores strong route-active when the panel closes", () => {
    expect(
      resolvePrimaryL1VisualState("club", "club", null, false),
    ).toBe("strong");
  });

  it("never marks dashboard as route-active in L1", () => {
    expect(
      resolvePrimaryL1VisualState("planning", "dashboard", null, true),
    ).toBe("neutral");
  });
});
