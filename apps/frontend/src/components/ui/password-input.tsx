"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Button } from "./button";

export function PasswordInput({ className, ...props }: React.ComponentProps<"input">) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className={cn("relative", className)}>
      <Input type={visible ? "text" : "password"} className="pr-10" {...props} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-0 top-0 h-full rounded-l-none text-dash-muted-foreground hover:bg-transparent"
      >
        {visible ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
}