import type { ReactElement, ReactNode } from "react";
import {
  VENUE_SEMANTIC_LABEL_ATTR,
  type VenueSemanticLabelKind,
} from "@/lib/infoboard/venue-semantic-label";

export type VenueSemanticLabelProps = {
  kind: VenueSemanticLabelKind;
  children?: ReactNode;
  className: string;
  /** When set, also sets legacy `data-event-type` for transitional CSS/tests. */
  legacyEventTypeAttr?: string;
};

export function VenueSemanticLabel({
  kind,
  children,
  className,
  legacyEventTypeAttr,
}: VenueSemanticLabelProps): ReactElement {
  const label = children ?? kind;
  return (
    <span
      className={className}
      {...{ [VENUE_SEMANTIC_LABEL_ATTR]: kind }}
      data-event-type={legacyEventTypeAttr ?? kind}
    >
      {label}
    </span>
  );
}
