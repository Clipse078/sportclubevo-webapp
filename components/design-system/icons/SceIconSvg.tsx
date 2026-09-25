import type { SVGProps } from "react";
import { cn } from "@/lib/cn";
import { SCE_ICON_VIEWBOX } from "./SceIcon.types";

export type SceIconRole = "primary" | "secondary" | "accent" | "muted";

const ROLE_STROKE: Record<SceIconRole, string> = {
  primary: "var(--sce-icon-primary)",
  secondary: "var(--sce-icon-secondary)",
  accent: "var(--sce-icon-accent)",
  muted: "var(--sce-icon-muted)",
};

export const SCE_ICON_STROKE_WIDTH = 1.75;

type SceIconSvgProps = {
  size: number;
  viewBox?: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
};

/** SVG frame for SCE icons — default 24×24; approved masters supply their own viewBox. */
export function SceIconSvg({
  size,
  viewBox = SCE_ICON_VIEWBOX,
  className,
  title,
  children,
}: SceIconSvgProps) {
  const decorative = !title;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      className={cn("sce-icon shrink-0 text-[var(--sce-icon-primary)]", className)}
      aria-hidden={decorative ? true : undefined}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

type StrokeElementProps = {
  role?: SceIconRole;
  className?: string;
};

function strokeProps(role: SceIconRole): Pick<SVGProps<SVGElement>, "stroke" | "strokeWidth" | "strokeLinecap" | "strokeLinejoin"> {
  return {
    stroke: ROLE_STROKE[role],
    strokeWidth: SCE_ICON_STROKE_WIDTH,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
}

export function IconPath({
  role = "primary",
  className,
  ...props
}: StrokeElementProps & SVGProps<SVGPathElement>) {
  return <path className={className} fill="none" {...strokeProps(role)} {...props} />;
}

export function IconLine({
  role = "primary",
  className,
  ...props
}: StrokeElementProps & SVGProps<SVGLineElement>) {
  return <line className={className} {...strokeProps(role)} {...props} />;
}

export function IconRect({
  role = "primary",
  className,
  ...props
}: StrokeElementProps & SVGProps<SVGRectElement>) {
  return <rect className={className} {...strokeProps(role)} {...props} />;
}

export function IconCircle({
  role = "primary",
  className,
  ...props
}: StrokeElementProps & SVGProps<SVGCircleElement>) {
  return <circle className={className} {...strokeProps(role)} {...props} />;
}

/** Monochrome utility strokes — inherit `currentColor` from the SVG. */
export function MonoPath(props: SVGProps<SVGPathElement>) {
  return (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth={SCE_ICON_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

export function MonoLine(props: SVGProps<SVGLineElement>) {
  return (
    <line
      stroke="currentColor"
      strokeWidth={SCE_ICON_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

export function MonoCircle(props: SVGProps<SVGCircleElement>) {
  return (
    <circle
      fill="none"
      stroke="currentColor"
      strokeWidth={SCE_ICON_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}
