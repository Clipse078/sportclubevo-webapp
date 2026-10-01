/**
 * @vitest-environment jsdom
 *
 * SCE-HOTFIX-LOGIN-01 — login loading gate must recover on sign-in failures.
 */

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockSignIn, mockGetSession } = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
  mockGetSession: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  signIn: mockSignIn,
  getSession: mockGetSession,
}));

vi.mock("next/image", () => ({
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

import LoginForm from "../LoginForm";

describe("LoginForm post-login loading gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockGetSession.mockResolvedValue(null);
  });

  it("re-enables submit when signIn rejects (Auth.js client parse edge case)", async () => {
    mockSignIn.mockRejectedValueOnce(new TypeError("Invalid URL"));

    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText("E-Mail"), "user@example.test");
    await userEvent.type(screen.getByLabelText("Passwort"), "secret");
    await userEvent.click(screen.getByRole("button", { name: "Einloggen" }));

    expect(await screen.findByText(/Anmeldung fehlgeschlagen/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Einloggen" })).not.toBeDisabled();
  });

  it("re-enables submit when credentials are invalid", async () => {
    mockSignIn.mockResolvedValueOnce({ error: "CredentialsSignin", ok: false, status: 401, url: null });

    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText("E-Mail"), "user@example.test");
    await userEvent.type(screen.getByLabelText("Passwort"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Einloggen" }));

    expect(await screen.findByText(/Ungültige E-Mail oder Passwort/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Einloggen" })).not.toBeDisabled();
  });

  it("navigates using Auth.js redirect url on success", async () => {
    const assignMock = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign: assignMock, origin: "https://fcallschwil.sportclubevo.com" },
    });

    mockSignIn.mockResolvedValueOnce({
      error: undefined,
      ok: true,
      status: 200,
      url: "https://fcallschwil.sportclubevo.com/dashboard",
    });

    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText("E-Mail"), "user@example.test");
    await userEvent.type(screen.getByLabelText("Passwort"), "secret");
    await userEvent.click(screen.getByRole("button", { name: "Einloggen" }));

    expect(assignMock).toHaveBeenCalledWith("/dashboard");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("re-enables submit after post-login stall timeout", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockSignIn.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves — simulates hung client sign-in */
        }),
    );

    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText("E-Mail"), "user@example.test", { delay: null });
    await userEvent.type(screen.getByLabelText("Passwort"), "secret", { delay: null });
    await userEvent.click(screen.getByRole("button", { name: "Einloggen" }), { delay: null });

    expect(screen.getByRole("button", { name: /Anmeldung läuft/i })).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(20_000);
    });

    expect(screen.getByRole("button", { name: "Einloggen" })).not.toBeDisabled();
    expect(screen.getByText(/Weiterleitung zum Dashboard dauert ungewöhnlich lange/i)).toBeInTheDocument();

    vi.useRealTimers();
  }, 15_000);

  it("offers direct dashboard navigation when session exists after stall", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockSignIn.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );

    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText("E-Mail"), "user@example.test", { delay: null });
    await userEvent.type(screen.getByLabelText("Passwort"), "secret", { delay: null });
    await userEvent.click(screen.getByRole("button", { name: "Einloggen" }), { delay: null });

    await act(async () => {
      vi.advanceTimersByTime(20_000);
    });

    expect(screen.getByRole("link", { name: "Zum Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByText(/Anmeldung war erfolgreich/i)).toBeInTheDocument();

    vi.useRealTimers();
  }, 15_000);
});
