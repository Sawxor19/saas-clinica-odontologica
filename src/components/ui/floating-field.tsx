"use client";

import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type FloatingFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function FloatingLabelInput({ label, className, id, ...props }: FloatingFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className="relative">
      <input
        id={inputId}
        placeholder=" "
        className={cn(
          "peer h-12 w-full rounded-2xl border border-input bg-white px-4 pb-2 pt-6 text-sm text-foreground placeholder:text-transparent shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          className
        )}
        {...props}
      />
      <label
        htmlFor={inputId}
        className="pointer-events-none absolute left-4 top-3 text-xs text-muted-foreground transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:text-muted-foreground/70 peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-primary"
      >
        {label}
      </label>
    </div>
  );
}

type FloatingTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

export function FloatingLabelTextarea({
  label,
  className,
  id,
  ...props
}: FloatingTextareaProps) {
  const autoId = useId();
  const textareaId = id ?? autoId;

  return (
    <div className="relative">
      <textarea
        id={textareaId}
        placeholder=" "
        className={cn(
          "peer min-h-[120px] w-full rounded-2xl border border-input bg-white px-4 pb-3 pt-6 text-sm text-foreground placeholder:text-transparent shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          className
        )}
        {...props}
      />
      <label
        htmlFor={textareaId}
        className="pointer-events-none absolute left-4 top-3 text-xs text-muted-foreground transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-muted-foreground/70 peer-focus:top-3 peer-focus:text-xs peer-focus:text-primary"
      >
        {label}
      </label>
    </div>
  );
}
