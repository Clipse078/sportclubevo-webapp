import { describe, expect, it } from "vitest";
import { redirect } from "next/navigation";
import { actionErrorMessage } from "@/lib/next/rethrow-framework-control-flow";

describe("actionErrorMessage", () => {
  it("rethrows redirect errors", () => {
    let caught: unknown;
    try {
      redirect("/dashboard");
    } catch (error) {
      caught = error;
    }
    expect(() => actionErrorMessage(caught, "fallback")).toThrow();
  });

  it("returns domain error messages", () => {
    expect(actionErrorMessage(new Error("Tenant nicht gefunden."), "fallback")).toBe(
      "Tenant nicht gefunden.",
    );
  });
});
