"use client";

import { AlertTriangle } from "lucide-react";
import type { FacilityIntegrityFinding } from "@/lib/facilities/facility-integrity-diagnosis";

type Props = {
  findings: FacilityIntegrityFinding[];
};

export function FacilityIntegrityAlerts({ findings }: Props) {
  if (findings.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="facility-integrity-alerts">
      {findings.map((finding) => (
        <div
          key={finding.code + finding.title}
          className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          data-testid={`facility-integrity-finding-${finding.code}`}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          <div>
            <p className="font-semibold">{finding.title}</p>
            <p className="mt-1 text-amber-900/90">{finding.detail}</p>
            {finding.resourceCodes.length > 0 ? (
              <p className="mt-2 font-mono text-xs text-amber-800/80">
                Codes: {finding.resourceCodes.join(", ")}
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
