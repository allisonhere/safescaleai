import * as React from "react";

import { cn } from "@/lib/utils";

export type BadgeProps = React.HTMLAttributes<HTMLDivElement>;

export function Badge({ className, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-transparent bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700",
        className
      )}
      {...props}
    />
  );
}
