/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi, beforeEach } from "vitest";
import deMessages from "@/messages/de.json";
import { FinanceFormalReforecastDialog } from "@/components/admin/finance/FinanceForecastRollingUxSections";
import type { FormalReforecastPreviewResult } from "@/lib/finance/forecast/formal-reforecast-contract";

const previewFormalReforecastAction = vi.fn();
const formalizeCurrentForecastAction = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/(admin)/dashboard/finance/forecast/actions", () => ({
  previewFormalReforecastAction: (...args: unknown[]) =>
    previewFormalReforecastAction(...args),
  formalizeCurrentForecastAction: (...args: unknown[]) =>
    formalizeCurrentForecastAction(...args),
}));

const samplePreview: FormalReforecastPreviewResult = {
  financeYearId: "fy1",
  forecastId: "fc1",
  currentForecastVersionId: "ver-current",
  currentVersionNumber: 2,
  nextVersionNumber: 3,
  lineCount: 5,
  incomeMinor: 28632700,
  expenseMinor: 10116100,
  resultMinor: 18516600,
  asOfDate: "2026-10-24",
  actualsThroughDate: "2026-10-24",
  revisionLabel: null,
  recommendedAsOfDate: "2026-10-24",
  amountsUnchangedByFormalization: true,
  previousFormalRevision: null,
};

function createDialogTranslate(messages: Record<string, unknown>) {
  const forecast = messages.Finance as { forecast: Record<string, unknown> };
  const formal = forecast.forecast.formalReforecast as Record<string, unknown>;
  return (key: string, values?: Record<string, string | number>) => {
    if (key === "formalReforecast.dialogTitle") return String(formal.dialogTitle);
    if (key === "formalReforecast.dialogDescription") {
      return String(formal.dialogDescription);
    }
    if (key === "formalReforecast.asOfLabel") return String(formal.asOfLabel);
    if (key === "formalReforecast.labelField") return String(formal.labelField);
    if (key === "formalReforecast.labelHint") return String(formal.labelHint);
    if (key === "formalReforecast.labelPlaceholder") {
      return String(formal.labelPlaceholder);
    }
    if (key === "formalReforecast.confirm") return String(formal.confirm);
    if (key === "formalReforecast.previewLoading") return String(formal.previewLoading);
    if (key === "formalReforecast.previewLoadFailed") {
      return String(formal.previewLoadFailed);
    }
    if (key === "formalReforecast.previewRetry") return String(formal.previewRetry);
    if (key === "formalReforecast.amountsUnchangedHint") {
      return String(formal.amountsUnchangedHint);
    }
    if (key === "formalReforecast.nextVersionMeta") {
      return `Nächste Version ${values?.version} · ${values?.count} Positionen`;
    }
    if (key === "totalIncome") return "Prognose-Einnahmen";
    if (key === "totalExpense") return "Prognose-Ausgaben";
    if (key === "plannedResult") return "Prognose-Ergebnis";
    if (key === "cancel") return "Abbrechen";
    return key;
  };
}

function renderDialog(open = true) {
  const messages = deMessages as Record<string, unknown>;
  return render(
    <NextIntlClientProvider locale="de" messages={messages}>
      <FinanceFormalReforecastDialog
        open={open}
        onClose={() => undefined}
        financeYearId="fy1"
        expectedVersionId="ver-current"
        defaultAsOfDate="2026-10-24"
        currency="CHF"
        formattingLocale="de-CH"
        onSuccess={() => undefined}
        onError={() => undefined}
        t={createDialogTranslate(messages) as never}
      />
    </NextIntlClientProvider>,
  );
}

describe("FIN-04C-05R4 FinanceFormalReforecastDialog preview state", () => {
  beforeEach(() => {
    previewFormalReforecastAction.mockReset();
    formalizeCurrentForecastAction.mockReset();
  });

  it("PO UAT: loading clears and CTA enables after preview resolves", async () => {
    let resolvePreview!: (value: unknown) => void;
    previewFormalReforecastAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePreview = resolve;
        }),
    );

    renderDialog();
    const confirm = screen.getByRole("button", { name: "Prognose festhalten" });
    expect(confirm).toBeDisabled();
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Vorschau wird geladen …");
    });

    resolvePreview({ ok: true, preview: samplePreview });

    await waitFor(() => {
      expect(screen.queryByRole("status")).toBeNull();
    });
    expect(screen.getByText("Nächste Version 3 · 5 Positionen")).toBeTruthy();
    await waitFor(() => {
      expect(confirm).not.toBeDisabled();
    });
  });

  it("optional label blur updates preview without keystroke request loop", async () => {
    previewFormalReforecastAction.mockResolvedValue({ ok: true, preview: samplePreview });
    const user = userEvent.setup();
    renderDialog();

    await waitFor(() => {
      expect(previewFormalReforecastAction).toHaveBeenCalledTimes(1);
    });

    const label = screen.getByPlaceholderText("z. B. Q3 Review");
    await user.type(label, "Q3 Review");
    expect(previewFormalReforecastAction).toHaveBeenCalledTimes(1);

    await user.tab();
    await waitFor(() => {
      expect(previewFormalReforecastAction).toHaveBeenCalledTimes(2);
    });
  });

  it("blank label remains valid for submit after preview", async () => {
    previewFormalReforecastAction.mockResolvedValue({ ok: true, preview: samplePreview });
    renderDialog();
    const confirm = screen.getByRole("button", { name: "Prognose festhalten" });
    await waitFor(() => {
      expect(confirm).not.toBeDisabled();
    });
  });

  it("stale preview response cannot replace latest preview", async () => {
    let resolveA!: (value: unknown) => void;
    let resolveB!: (value: unknown) => void;
    previewFormalReforecastAction
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveA = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveB = resolve;
          }),
      );

    renderDialog();
    await waitFor(() => expect(previewFormalReforecastAction).toHaveBeenCalledTimes(1));

    const dateInput = screen.getByLabelText(/Datenstand/i);
    fireEvent.change(dateInput, { target: { value: "2026-09-30" } });
    await waitFor(() => expect(previewFormalReforecastAction).toHaveBeenCalledTimes(2));

    const previewB = { ...samplePreview, asOfDate: "2026-09-30", nextVersionNumber: 3 };
    resolveB({ ok: true, preview: previewB });
    await waitFor(() => {
      expect(screen.getByText("Nächste Version 3 · 5 Positionen")).toBeTruthy();
    });

    resolveA({ ok: true, preview: { ...samplePreview, nextVersionNumber: 99 } });
    await waitFor(() => {
      expect(screen.queryByText("Nächste Version 99 · 5 Positionen")).toBeNull();
    });
  });

  it("preview failure exits loading and supports retry", async () => {
    previewFormalReforecastAction
      .mockResolvedValueOnce({
        ok: false,
        outcome: "UNEXPECTED_ERROR",
        error: "internal",
      })
      .mockResolvedValueOnce({ ok: true, preview: samplePreview });

    const user = userEvent.setup();
    renderDialog();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Die Vorschau konnte nicht geladen werden.",
      );
    });
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("button", { name: "Prognose festhalten" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Prognose festhalten" })).not.toBeDisabled();
    });
  });

  it("cannot double-submit while formalization is in flight", async () => {
    previewFormalReforecastAction.mockResolvedValue({ ok: true, preview: samplePreview });
    let resolveSubmit!: (value: unknown) => void;
    formalizeCurrentForecastAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        }),
    );

    const user = userEvent.setup();
    renderDialog();
    const confirm = screen.getByRole("button", { name: "Prognose festhalten" });
    await waitFor(() => expect(confirm).not.toBeDisabled());

    await user.click(confirm);
    expect(confirm).toBeDisabled();
    await user.click(confirm);
    expect(formalizeCurrentForecastAction).toHaveBeenCalledTimes(1);

    resolveSubmit({
      ok: true,
      result: {},
    });
    await waitFor(() => expect(formalizeCurrentForecastAction).toHaveBeenCalledTimes(1));
  });

  it("reopening dialog does not retain stuck loading state", async () => {
    previewFormalReforecastAction.mockResolvedValue({ ok: true, preview: samplePreview });
    const { rerender } = renderDialog(true);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Prognose festhalten" })).not.toBeDisabled();
    });

    rerender(
      <NextIntlClientProvider locale="de" messages={deMessages as Record<string, unknown>}>
        <FinanceFormalReforecastDialog
          open={false}
          onClose={() => undefined}
          financeYearId="fy1"
          expectedVersionId="ver-current"
          defaultAsOfDate="2026-10-24"
          currency="CHF"
          formattingLocale="de-CH"
          onSuccess={() => undefined}
          onError={() => undefined}
          t={((key: string) => key) as never}
        />
      </NextIntlClientProvider>,
    );

    rerender(
      <NextIntlClientProvider locale="de" messages={deMessages as Record<string, unknown>}>
        <FinanceFormalReforecastDialog
          open={true}
          onClose={() => undefined}
          financeYearId="fy1"
          expectedVersionId="ver-current"
          defaultAsOfDate="2026-10-24"
          currency="CHF"
          formattingLocale="de-CH"
          onSuccess={() => undefined}
          onError={() => undefined}
          t={((key: string) => key) as never}
        />
      </NextIntlClientProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByRole("status")).toBeNull();
    });
  });
});
