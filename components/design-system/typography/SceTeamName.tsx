import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  sceTeamNameClassName,
  type SceTeamNameClassOptions,
} from "@/lib/design-system/sce-team-name-typography";

type SceTeamNameOwnProps = SceTeamNameClassOptions & {
  /** Visible team label — stored value, not transformed in the DOM. */
  children: ReactNode;
  as?: ElementType;
  /** Native title when truncation may hide characters (defaults on when truncate). */
  title?: string;
};

export type SceTeamNameProps<T extends ElementType = "span"> = SceTeamNameOwnProps &
  Omit<ComponentPropsWithoutRef<T>, keyof SceTeamNameOwnProps | "as" | "children">;

/**
 * Canonical team name renderer — uppercase italic via CSS only; underlying string unchanged.
 */
export function SceTeamName<T extends ElementType = "span">({
  children,
  as,
  density,
  truncate = true,
  lineClamp = 2,
  className,
  title,
  ...rest
}: SceTeamNameProps<T>) {
  const Tag = (as ?? "span") as ElementType;
  const text = typeof children === "string" ? children : undefined;
  const resolvedTitle = title ?? (truncate && text ? text : undefined);

  return (
    <Tag
      {...rest}
      className={cn(sceTeamNameClassName({ density, truncate, lineClamp, className }))}
      title={resolvedTitle}
      data-sce-team-name=""
    >
      {children}
    </Tag>
  );
}
