import { cn } from "@/lib/cn";

type TeamOption = { id: string; label: string };

type Props = {
  formId: string;
  searchName: string;
  searchValue?: string;
  teamName: string;
  teamValue?: string;
  statusName: string;
  statusValue?: string;
  statusOptions: { value: string; label: string }[];
  teamOptions: TeamOption[];
  hiddenFields?: Record<string, string | undefined>;
  className?: string;
};

export default function TrainingManagementFilters({
  formId,
  searchName,
  searchValue,
  teamName,
  teamValue,
  statusName,
  statusValue,
  statusOptions,
  teamOptions,
  hiddenFields,
  className,
}: Props) {
  return (
    <form
      id={formId}
      method="get"
      action="/dashboard/training"
      className={cn("flex flex-wrap items-end gap-2", className)}
      data-testid={`${formId}-filters`}
    >
      {hiddenFields
        ? Object.entries(hiddenFields).map(([key, value]) =>
            value ? <input key={key} type="hidden" name={key} value={value} /> : null,
          )
        : null}
      <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
        <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]">Suche</span>
        <input
          type="search"
          name={searchName}
          defaultValue={searchValue ?? ""}
          placeholder="Suchen …"
          className="fca-input h-9 text-sm"
        />
      </label>
      <label className="flex min-w-[8rem] flex-col gap-1">
        <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]">Team</span>
        <select name={teamName} defaultValue={teamValue ?? ""} className="fca-input h-9 text-sm">
          <option value="">Alle Teams</option>
          {teamOptions.map((team) => (
            <option key={team.id} value={team.id}>
              {team.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-[8rem] flex-col gap-1">
        <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]">Status</span>
        <select name={statusName} defaultValue={statusValue ?? ""} className="fca-input h-9 text-sm">
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="fca-button-secondary h-9 px-3 text-sm">
        Filtern
      </button>
    </form>
  );
}
