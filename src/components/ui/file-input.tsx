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
        className="inline-flex h-10 items-center justify-center rounded-2xl border border-border bg-white px-4 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:bg-muted"
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
