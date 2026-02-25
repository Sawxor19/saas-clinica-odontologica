"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyPublicLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "Link copiado" : "Copiar link"}
    </Button>
  );
}
