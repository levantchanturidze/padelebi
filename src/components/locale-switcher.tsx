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
      className="rounded-md px-1 py-1 text-xl leading-none transition-opacity hover:opacity-70 disabled:opacity-40"
      aria-label="Switch language"
      title={current === "en" ? "ქართული" : "English"}
    >
      {current === "en" ? "🇬🇪" : "🇬🇧"}
    </button>
  );
}
