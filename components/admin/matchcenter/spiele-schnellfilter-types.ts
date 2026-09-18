/** Serializable Schnellfilter option — built on the server, consumed by the client rail. */

export type SpieleSchnellfilterLinkOption = {
  key: string;
  label: string;
  href: string;
  active: boolean;
};

export type SpieleSchnellfilterZeitraumLinks = {
  monthLabel: string;
  previousHref: string;
  nextHref: string;
  todayHref: string | null;
};
