import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "border border-primary/20 bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(37,99,235,0.25)] hover:brightness-105",
  secondary:
    "border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline:
    "border border-border bg-white text-foreground hover:bg-muted",
  ghost: "bg-transparent text-foreground hover:bg-muted",
  destructive:
    "border border-destructive/30 bg-destructive text-destructive-foreground hover:brightness-105",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4",
  lg: "h-11 px-6",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        "hover:-translate-y-0.5",
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
