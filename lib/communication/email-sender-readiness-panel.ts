import type { EmailSenderReadinessPresentation } from "@/lib/communication/email-sender-display";
import type {
  SceReadinessStatusRow,
  SceSemanticFeedbackTone,
} from "@/lib/design-system/sce-feedback-status-foundation";

function checklistTone(state: "pass" | "fail" | "warn" | "neutral"): SceSemanticFeedbackTone {
  switch (state) {
    case "pass":
      return "SUCCESS";
    case "fail":
      return "ERROR";
    case "warn":
      return "WARNING";
    default:
      return "NEUTRAL";
  }
}

function checklistStateLabel(state: "pass" | "fail" | "warn" | "neutral"): string {
  switch (state) {
    case "pass":
      return "Erfüllt";
    case "fail":
      return "Offen";
    case "warn":
      return "Hinweis";
    default:
      return "Neutral";
  }
}

function presentationHeadlineTone(
  tone: EmailSenderReadinessPresentation["tone"],
): SceSemanticFeedbackTone {
  switch (tone) {
    case "success":
      return "SUCCESS";
    case "warning":
      return "WARNING";
    case "danger":
      return "ERROR";
    default:
      return "NEUTRAL";
  }
}

export function mapEmailSenderReadinessToPanelRows(
  presentation: EmailSenderReadinessPresentation,
): SceReadinessStatusRow[] {
  return presentation.checklist.map((item) => ({
    id: item.id,
    label: item.label,
    detail: item.detail,
    tone: checklistTone(item.state),
    stateLabel: checklistStateLabel(item.state),
  }));
}

export function mapEmailSenderReadinessHeadlineTone(
  presentation: EmailSenderReadinessPresentation,
): SceSemanticFeedbackTone {
  return presentationHeadlineTone(presentation.tone);
}
