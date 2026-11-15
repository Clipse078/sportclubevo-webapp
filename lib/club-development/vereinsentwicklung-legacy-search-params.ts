/** Search params bag for Vereinsentwicklung legacy redirect pages (no JSX-generics in page files). */

export type VereinsentwicklungLegacySearchParams = {
  [key: string]: string | undefined;
};

export type VereinsentwicklungLegacyPageProps = {
  searchParams?: Promise<VereinsentwicklungLegacySearchParams>;
};