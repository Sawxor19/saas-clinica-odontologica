"use client";

import { ReactNode } from "react";

export function ConfirmForm({
  action,
  message,
  children,
  className,
}: {
  action: (formData: FormData) => void;
  message: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </form>
  );
}
