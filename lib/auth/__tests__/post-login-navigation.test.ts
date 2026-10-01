import { describe, expect, it } from "vitest";
import { resolvePostLoginNavigationTarget } from "../post-login-navigation";

describe("resolvePostLoginNavigationTarget", () => {
  const origin = "https://fcallschwil.sportclubevo.com";

  it("falls back when redirect url is missing", () => {
    expect(resolvePostLoginNavigationTarget(null, origin)).toBe("/dashboard");
    expect(resolvePostLoginNavigationTarget(undefined, origin)).toBe("/dashboard");
    expect(resolvePostLoginNavigationTarget("  ", origin)).toBe("/dashboard");
  });

  it("accepts absolute Auth.js callback urls on the same host", () => {
    expect(
      resolvePostLoginNavigationTarget(`${origin}/dashboard`, origin),
    ).toBe("/dashboard");
  });

  it("accepts relative callback paths", () => {
    expect(resolvePostLoginNavigationTarget("/dashboard", origin)).toBe("/dashboard");
  });

  it("preserves query parameters for auth error redirects", () => {
    expect(
      resolvePostLoginNavigationTarget(
        `${origin}/login?error=CredentialsSignin&code=credentials`,
        origin,
      ),
    ).toBe("/login?error=CredentialsSignin&code=credentials");
  });

});
