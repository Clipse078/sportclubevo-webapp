import { SceSkeleton } from "@/components/sce/feedback/SceSkeleton";

/** Loading placeholder matching Personen & Zugänge list geometry (DS-07 R1). */
export default function PeopleAccessListLoadingState() {
  return (
    <SceSkeleton
      recipe="people-access-list"
      rows={6}
      data-testid="people-access-list-loading"
    />
  );
}
