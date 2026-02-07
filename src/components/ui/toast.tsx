"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function Toast({
  message,
  variant = "success",
  onClose,
}: {
  message: string;
  variant?: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 rounded-lg px-4 py-3 text-sm shadow-lg",
        variant === "success"
          ? "bg-emerald-600 text-white"
          : "bg-red-600 text-white"
      )}
    >
      {message}
    </div>
  );
}
