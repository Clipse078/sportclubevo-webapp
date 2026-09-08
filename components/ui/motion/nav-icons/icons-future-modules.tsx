import type { NavIconSvgProps } from "../motion-primitives";
import {
  NavIconSvg,
  StrokeCircle,
  StrokeLine,
  StrokePath,
  StrokeRect,
} from "../motion-primitives";

type IconProps = Omit<NavIconSvgProps, "iconKey" | "children">;

export function MitgliederIcon(props: IconProps) {
  return (
    <NavIconSvg iconKey="mitglieder" {...props}>
      <StrokeCircle cx="9" cy="9" r="3" className="ani-members-head" />
      <StrokePath d="M4 19c0-3 2-5 5-5s5 2 5 5" className="ani-members-body" />
      <StrokeCircle cx="17" cy="10" r="2.5" className="ani-members-head-2" />
      <StrokePath d="M14 19c0-2 1.5-3.5 3.5-3.5" className="ani-members-body-2" />
    </NavIconSvg>
  );
}

export function AufgabenIcon(props: IconProps) {
  return (
    <NavIconSvg iconKey="aufgaben" {...props}>
      <StrokeRect x="5" y="5" width="14" height="14" rx="2" className="ani-tasks-board" />
      <StrokePath d="M8 10l2 2 5-5" className="ani-tasks-check-1" />
      <StrokeLine x1="8" y1="15" x2="16" y2="15" className="ani-tasks-line-1" />
      <StrokeLine x1="8" y1="18" x2="13" y2="18" className="ani-tasks-line-2" />
    </NavIconSvg>
  );
}

export function HelfereinsaetzeIcon(props: IconProps) {
  return (
    <NavIconSvg iconKey="helfereinsaetze" {...props}>
      <StrokeCircle cx="12" cy="8" r="3" className="ani-volunteer-head" />
      <StrokePath d="M7 19c0-3 2.5-5 5-5s5 2 5 5" className="ani-volunteer-body" />
      <StrokePath d="M16 12l3 2-1 4h-4l-1-4 3-2z" className="ani-volunteer-hand" />
    </NavIconSvg>
  );
}

export function TrainerStaffIcon(props: IconProps) {
  return (
    <NavIconSvg iconKey="trainer-staff" {...props}>
      <StrokeCircle cx="12" cy="8" r="3" className="ani-staff-head" />
      <StrokePath d="M7 19c0-3 2.5-5 5-5s5 2 5 5" className="ani-staff-body" />
      <StrokePath d="M16 6l2 2-3 3-2-1 1-2 2-2z" className="ani-staff-badge" />
    </NavIconSvg>
  );
}

export function FormulareFreigabenIcon(props: IconProps) {
  return (
    <NavIconSvg iconKey="formulare-freigaben" {...props}>
      <StrokeRect x="5" y="4" width="14" height="16" rx="2" className="ani-form-page" />
      <StrokePath d="M8 12l2 2 5-5" className="ani-form-check" />
      <StrokeLine x1="8" y1="8" x2="14" y2="8" className="ani-form-line" />
    </NavIconSvg>
  );
}

export function VorfaelleDisziplinIcon(props: IconProps) {
  return (
    <NavIconSvg iconKey="vorfaelle-disziplin" {...props}>
      <StrokePath d="M12 3l7 14H5L12 3z" className="ani-incident-shield" />
      <StrokeLine x1="12" y1="9" x2="12" y2="13" className="ani-incident-line" />
      <StrokeCircle cx="12" cy="15.5" r="0.75" className="ani-incident-dot" fill="currentColor" />
    </NavIconSvg>
  );
}
