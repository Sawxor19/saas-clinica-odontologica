"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export function FileInput({
  name,
  accept,
  required,
  label = "Adicionar arquivo",
  helperText,
  className,
}: {
  name: string;
  accept?: string;
  required?: boolean;
  label?: string;
  helperText?: string;
  className?: string;
}) {
  const id = useId();
  const [fileName, setFileName] = useState<string>("");

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        className="sr-only"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          setFileName(file?.name ?? "");
        }}
      />
      <label
        htmlFor={id}
        className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-all hover:-translate-y-0.5 hover:bg-accent hover:shadow-lg hover:shadow-emerald-500/20"
      >
        {label}
      </label>
      {fileName ? (
        <span className="text-xs text-muted-foreground">{fileName}</span>
      ) : helperText ? (
        <span className="text-xs text-muted-foreground">{helperText}</span>
      ) : null}
    </div>
  );
}
