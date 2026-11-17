export type MeetingOutcomeOriginLink = {
  label: string;
  href: string | null;
  restricted: boolean;
};

export type MeetingOutcomeOrigin = {
  links: MeetingOutcomeOriginLink[];
};