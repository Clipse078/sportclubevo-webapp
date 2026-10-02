import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { formatDate, formatTime } from "@/lib/tenant-runtime/formatters";

export type SportingActivityDetailScheduleParts = {
  dateLine: string;
  timeLine?: string;
};

/** Readable date/time group for Activity Detail (German locale via fmtCfg). */
export function formatSportingActivityDetailScheduleParts(input: {
  startAt: Date;
  endAt?: Date | null;
  allDay?: boolean;
  fmtCfg: TenantFormatConfig;
}): SportingActivityDetailScheduleParts {
  if (input.allDay) {
    return {
      dateLine: formatDate(input.startAt, input.fmtCfg, {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    };
  }

  const dateLine = formatDate(input.startAt, input.fmtCfg, {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const start = formatTime(input.startAt, input.fmtCfg);
  if (input.endAt) {
    const end = formatTime(input.endAt, input.fmtCfg);
    return { dateLine, timeLine: `${start}–${end}` };
  }

  return { dateLine, timeLine: start };
}
