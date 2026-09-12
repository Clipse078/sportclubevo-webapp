/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

import NativeBillingCreateBankAccountForm from "../NativeBillingCreateBankAccountForm";

const legalEntities = [{ key: "demo-entity", label: "Demo Rechtsträger AG" }];

const fixtureIban = "CH9300762011623852957";
const fixtureQrIban = "CH4431999123000889012";

function getForm() {
  return document.querySelector("form") as HTMLFormElement;
}

function fillRequiredFields() {
  fireEvent.change(screen.getByRole("combobox", { name: /Rechtsträger/i }), {
    target: { value: "demo-entity" },
  });
  fireEvent.change(screen.getByLabelText(/Bezeichnung/i), {
    target: { value: "Test CHF Konto" },
  });
  fireEvent.change(screen.getByLabelText(/^IBAN$/i), {
    target: { value: fixtureIban },
  });
  fireEvent.change(screen.getByLabelText(/QR-IBAN/i), {
    target: { value: fixtureQrIban },
  });
  fireEvent.change(screen.getByPlaceholderText("Name"), {
    target: { value: "Demo Gläubiger GmbH" },
  });
  fireEvent.change(screen.getByPlaceholderText("Strasse"), {
    target: { value: "Musterweg" },
  });
  fireEvent.change(screen.getByPlaceholderText("PLZ"), { target: { value: "4000" } });
  fireEvent.change(screen.getByPlaceholderText("Ort"), { target: { value: "Basel" } });
}

describe("NativeBillingCreateBankAccountForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  beforeEach(() => {
    vi.clearAllMocks();
    refreshMock.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          bankAccount: {
            id: "ba-1",
            ibanMasked: "****2957",
            qrIbanMasked: "****9012",
          },
        }),
      }),
    );
  });

  it("resets the form after a successful save using the captured form element", async () => {
    render(<NativeBillingCreateBankAccountForm legalEntities={legalEntities} />);
    fillRequiredFields();

    const form = getForm();
    const resetSpy = vi.spyOn(form, "reset");

    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalledTimes(1);
      expect(resetSpy).toHaveBeenCalledTimes(1);
    });

    expect((screen.getByLabelText(/^IBAN$/i) as HTMLInputElement).value).toBe("");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not dereference null event.currentTarget after the async request", async () => {
    const form = document.createElement("form");
    document.body.appendChild(form);
    let currentTarget: HTMLFormElement | null = form;
    const pooledEvent = {
      get currentTarget() {
        return currentTarget;
      },
    };
    const capturedForm = pooledEvent.currentTarget as HTMLFormElement;
    currentTarget = null;
    const resetSpy = vi.spyOn(capturedForm, "reset");

    expect(() => (pooledEvent.currentTarget as HTMLFormElement).reset()).toThrow();
    capturedForm.reset();
    expect(resetSpy).toHaveBeenCalledTimes(1);
  });

  it("resets after a delayed successful response without a second fetch", async () => {
    let resolveFetch!: (value: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );

    render(<NativeBillingCreateBankAccountForm legalEntities={legalEntities} />);
    fillRequiredFields();

    const form = getForm();
    const resetSpy = vi.spyOn(form, "reset");

    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    await act(async () => {
      resolveFetch({
        ok: true,
        json: async () => ({ bankAccount: { ibanMasked: "****2957" } }),
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(resetSpy).toHaveBeenCalledTimes(1);
      expect(refreshMock).toHaveBeenCalledTimes(1);
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not reset the form when the save request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "IBAN ist ungültig." }),
      }),
    );

    render(<NativeBillingCreateBankAccountForm legalEntities={legalEntities} />);
    fillRequiredFields();

    const form = document.querySelector("form") as HTMLFormElement;
    const resetSpy = vi.spyOn(form, "reset");

    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText("IBAN ist ungültig.")).toBeTruthy();
    });

    expect(resetSpy).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
    expect((screen.getByLabelText(/^IBAN$/i) as HTMLInputElement).value).toBe(fixtureIban);
  });

  it("shows a safe German message for unexpected client errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new TypeError("Cannot read properties of null (reading 'reset')");
        },
      }),
    );

    render(<NativeBillingCreateBankAccountForm legalEntities={legalEntities} />);
    fillRequiredFields();

    await act(async () => {
      fireEvent.submit(document.querySelector("form") as HTMLFormElement);
    });

    await waitFor(() => {
      expect(
        screen.getByText("Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut."),
      ).toBeTruthy();
    });
    expect(screen.queryByText(/Cannot read properties of null/i)).toBeNull();
  });

  it("allows retry after a failed save without duplicate success side effects", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "IBAN ist ungültig." }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bankAccount: { ibanMasked: "****2957" } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<NativeBillingCreateBankAccountForm legalEntities={legalEntities} />);
    fillRequiredFields();
    const form = getForm();

    await act(async () => {
      fireEvent.submit(form);
    });
    await waitFor(() => expect(screen.getByText("IBAN ist ungültig.")).toBeTruthy());

    await act(async () => {
      fireEvent.submit(form);
    });
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((screen.getByLabelText(/^IBAN$/i) as HTMLInputElement).value).toBe("");
  });

  it("does not render raw IBAN values from the API response in the form", async () => {
    render(<NativeBillingCreateBankAccountForm legalEntities={legalEntities} />);
    fillRequiredFields();

    await act(async () => {
      fireEvent.submit(document.querySelector("form") as HTMLFormElement);
    });

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());

    expect(screen.queryByDisplayValue(fixtureIban)).toBeNull();
    expect(screen.queryByDisplayValue(fixtureQrIban)).toBeNull();
  });
});
