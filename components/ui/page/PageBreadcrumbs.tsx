import {
  SceBreadcrumbs,
  type SceBreadcrumbItem,
} from "@/components/sce/navigation/SceBreadcrumbs";

export type BreadcrumbItem = SceBreadcrumbItem;

type PageBreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
};

/**
 * @deprecated Import `SceBreadcrumbs` from `@/components/sce/navigation/SceBreadcrumbs` for new work.
 * Retained as a thin alias for existing page patterns during DS-03 rollout.
 */
export function PageBreadcrumbs(props: PageBreadcrumbsProps) {
  return <SceBreadcrumbs {...props} ariaLabel="Breadcrumb" />;
}
