"use client";

import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";
import {
  buildHumanReadableZielgruppeRules,
  type ZielgruppeRuleLabels,
} from "@/lib/communication/zielgruppen/human-readable-rules";

type Props = {
  definition: ZielgruppeEditorDefinition;
  labels?: ZielgruppeRuleLabels;
};

export default function ZielgruppeHumanRulesPanel({ definition, labels }: Props) {
  const rules = buildHumanReadableZielgruppeRules(definition, labels);

  if (rules.isEmpty) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Noch keine Regeln definiert. Fügen Sie mindestens ein Zielkriterium hinzu.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-[var(--foreground)]">{rules.compositionHint}</p>
      {rules.inclusionLines.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--text-2)]">
          {rules.inclusionLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {rules.exclusionLines.length > 0 ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            Ausschlüsse
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[var(--text-2)]">
            {rules.exclusionLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="text-xs leading-5 text-[var(--muted)]">{rules.dynamicNotice}</p>
    </div>
  );
}
