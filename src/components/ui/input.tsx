import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-2xl border border-input bg-white px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";
