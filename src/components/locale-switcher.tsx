"use client";

import { useTransition } from "react";
import { setLocaleAction } from "@/i18n/actions";

export function LocaleSwitcher({ current }: { current: string }) {
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = current === "en" ? "ka" : "en";
    startTransition(() => { setLocaleAction(next); });
  };

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className="rounded-md px-2 py-1 text-sm font-medium text-muted hover:text-foreground transition-colors"
      aria-label="Switch language"
    >
      {current === "en" ? "ქართული" : "English"}
    </button>
  );
}
