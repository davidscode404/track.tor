"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const ButtonGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "horizontal" | "vertical";
  }
>(({ className, orientation = "horizontal", ...props }, ref) => (
  <div
    ref={ref}
    role="group"
    data-slot="button-group"
    className={cn(
      "inline-flex [--radius:0.625rem]",
      orientation === "horizontal" && "flex-row [&>*:first-child]:rounded-l-[var(--radius)] [&>*:last-child]:rounded-r-[var(--radius)]",
      orientation === "vertical" && "flex-col [&>*:first-child]:rounded-t-[var(--radius)] [&>*:last-child]:rounded-b-[var(--radius)]",
      "[&>*]:rounded-none",
      className,
    )}
    {...props}
  />
));
ButtonGroup.displayName = "ButtonGroup";

export { ButtonGroup };
