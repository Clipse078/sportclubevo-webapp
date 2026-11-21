"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { useUmsetzungsplanungTaskRowPointerDrag } from "./useUmsetzungsplanungTaskRowPointerDrag";

export type VereinsentwicklungBacklogTitleDragProps = {
  enabled: boolean;
  onDragStart: (event: React.DragEvent) => void;
  onDragEnd: () => void;
  pending?: boolean;
};

type Props = {
  title: string;
  href?: string;
  className?: string;
  /** Block browser URL-drag ghosts on task title links inside scheduling tables. */
  suppressNativeLinkDrag?: boolean;
  schedulingDrag?: VereinsentwicklungBacklogTitleDragProps;
};

export default function VereinsentwicklungBacklogTruncatingTitle({
  title,
  href,
  className,
  suppressNativeLinkDrag = false,
  schedulingDrag,
}: Props) {
  const fullTextId = useId();
  const router = useRouter();
  const pointerDrag = useUmsetzungsplanungTaskRowPointerDrag();
  const dragEnabled = Boolean(schedulingDrag?.enabled && !schedulingDrag.pending);

  const sharedClass = cn(
    "block min-w-0 truncate text-sm font-medium text-[var(--foreground)] hover:text-[var(--sce-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] rounded-sm",
    dragEnabled && "cursor-grab active:cursor-grabbing select-none",
    className,
  );

  const preventNativeLinkDrag = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const pointerHandlers = dragEnabled
    ? {
        onPointerDown: pointerDrag.onPointerDown,
        onPointerMove: pointerDrag.onPointerMove,
        onPointerUp: pointerDrag.onPointerUp,
        onPointerCancel: pointerDrag.onPointerCancel,
      }
    : {};

  const navigate = () => {
    if (!href) return;
    router.push(href);
  };

  const onTitleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate();
    }
  };

  const clickGuard = (event: React.MouseEvent) => {
    if (pointerDrag.consumeSuppressClick()) {
      event.preventDefault();
      return;
    }
    if (dragEnabled && href) {
      event.preventDefault();
      navigate();
    }
  };

  const dragHandlers = dragEnabled
    ? {
        draggable: true,
        onDragStart: (event: React.DragEvent) => {
          if (!pointerDrag.shouldAllowDragStart()) {
            event.preventDefault();
            return;
          }
          pointerDrag.onDragStartAfterThreshold();
          schedulingDrag!.onDragStart(event);
        },
        onDragEnd: () => {
          pointerDrag.resetPointerGesture();
          schedulingDrag!.onDragEnd();
        },
      }
    : suppressNativeLinkDrag
      ? {
          draggable: false,
          onDragStart: preventNativeLinkDrag,
        }
      : {};

  return (
    <div className="min-w-0">
      {href && dragEnabled ? (
        <span
          role="link"
          tabIndex={0}
          className={sharedClass}
          title={title}
          aria-describedby={fullTextId}
          onClick={clickGuard}
          onKeyDown={onTitleKeyDown}
          {...pointerHandlers}
          {...dragHandlers}
          data-testid="vereinsentwicklung-backlog-title-link"
        >
          {title}
        </span>
      ) : href ? (
        <Link
          href={href}
          className={sharedClass}
          title={title}
          aria-describedby={fullTextId}
          {...dragHandlers}
          data-testid="vereinsentwicklung-backlog-title-link"
        >
          {title}
        </Link>
      ) : (
        <span
          className={sharedClass}
          title={title}
          tabIndex={0}
          aria-describedby={fullTextId}
          {...pointerHandlers}
          {...dragHandlers}
        >
          {title}
        </span>
      )}
      <span id={fullTextId} className="sr-only">
        {title}
      </span>
    </div>
  );
}