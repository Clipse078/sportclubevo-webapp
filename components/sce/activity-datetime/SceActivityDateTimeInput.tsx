"use client";

import { useMemo, useRef } from "react";
import { cn } from "@/lib/cn";
import {
  combineIsoDateAndTimeToDateTimeLocal,
  compareWallClockRange,
  splitDateTimeLocalValue,
} from "@/lib/sce/activity-datetime/sce-activity-datetime";
import { SceActivityDateInput } from "./SceActivityDateInput";
import { SceActivityTimeInput } from "./SceActivityTimeInput";

export type SceActivityDateTimeRangeValue = {
  startAt: string;
  endAt: string;
};

export type SceActivityDateTimeInputProps = {
  value: SceActivityDateTimeRangeValue;
  onChange: (value: SceActivityDateTimeRangeValue) => void;
  disabled?: boolean;
  /** When true, end date may differ from start (defaults to same date). */
  allowEndDate?: boolean;
  fieldErrors?: {
    date?: string;
    startTime?: string;
    endTime?: string;
    range?: string;
  };
  testId?: string;
  className?: string;
};

export function SceActivityDateTimeInput({
  value,
  onChange,
  disabled = false,
  allowEndDate = false,
  fieldErrors,
  testId = "sce-activity-datetime",
  className,
}: SceActivityDateTimeInputProps) {
  const startParts = useMemo(() => splitDateTimeLocalValue(value.startAt), [value.startAt]);
  const endParts = useMemo(() => splitDateTimeLocalValue(value.endAt), [value.endAt]);

  const isoDateKey = startParts?.isoDateKey ?? "";
  const startTime = startParts?.time ?? "";
  const endTime = endParts?.time ?? "";
  const endDateKey = endParts?.isoDateKey ?? isoDateKey;
  const pendingStartDateRef = useRef(isoDateKey);

  function emit(startDate: string, nextStartTime: string, nextEndDate: string, nextEndTime: string) {
    if (startDate) {
      pendingStartDateRef.current = startDate;
    }
    const resolvedStartDate = startDate || pendingStartDateRef.current || isoDateKey;
    if (!resolvedStartDate || !nextStartTime) {
      if (!resolvedStartDate && !nextStartTime) {
        onChange({ startAt: "", endAt: value.endAt });
      }
      return;
    }
    const startAt = combineIsoDateAndTimeToDateTimeLocal(resolvedStartDate, nextStartTime);
    const endAt =
      nextEndTime && nextEndDate
        ? combineIsoDateAndTimeToDateTimeLocal(nextEndDate, nextEndTime)
        : "";
    onChange({ startAt, endAt });
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-[minmax(11rem,1.35fr)_minmax(6.5rem,1fr)_minmax(6.5rem,1fr)]",
        className,
      )}
      data-testid={testId}
      data-sce-activity-datetime-layout="termin-row"
    >
      <SceActivityDateInput
        label="Datum"
        value={isoDateKey}
        disabled={disabled}
        required
        error={fieldErrors?.date}
        testId={`${testId}-date`}
        onChange={(nextDate) => {
          pendingStartDateRef.current = nextDate;
          emit(nextDate, startTime, allowEndDate ? endDateKey : nextDate, endTime);
        }}
      />
      <SceActivityTimeInput
        label="Startzeit"
        value={startTime}
        disabled={disabled}
        required
        error={fieldErrors?.startTime}
        testId={`${testId}-start-time`}
        onChange={(nextStartTime) =>
          emit(pendingStartDateRef.current || isoDateKey, nextStartTime, endDateKey, endTime)
        }
      />
      <SceActivityTimeInput
        label="Endzeit"
        value={endTime}
        disabled={disabled}
        error={fieldErrors?.endTime ?? fieldErrors?.range}
        testId={`${testId}-end-time`}
        onChange={(nextEndTime) => {
          const range =
            isoDateKey && startTime && nextEndTime
              ? compareWallClockRange({
                  startDate: isoDateKey,
                  startTime,
                  endDate: allowEndDate ? endDateKey : isoDateKey,
                  endTime: nextEndTime,
                })
              : { ok: true as const };
          if (!range.ok) {
            emit(isoDateKey, startTime, endDateKey, nextEndTime);
            return;
          }
          emit(isoDateKey, startTime, allowEndDate ? endDateKey : isoDateKey, nextEndTime);
        }}
      />
    </div>
  );
}
