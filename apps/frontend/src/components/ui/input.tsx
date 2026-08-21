import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-dash-input bg-dash-card px-3 py-1 text-sm shadow-sm transition-all duration-200 placeholder:text-dash-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}