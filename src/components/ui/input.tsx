import * as React from "react";
import { cn } from "@/lib/utils";

const fieldBase = [
  "h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface",
  "px-3 text-sm text-foreground placeholder:text-muted",
  "shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]",
  "transition-shadow duration-150",
  "focus-ring focus-visible:shadow-[inset_0_1px_2px_rgba(0,0,0,0.04),0_0_0_3px_rgba(21,163,71,0.12)]",
  "disabled:opacity-50 disabled:cursor-not-allowed",
].join(" ");

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldBase, className)} {...props} />;
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cn(fieldBase, "pr-8 cursor-pointer", className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(fieldBase, "min-h-24 py-2 resize-y", className)}
        {...props}
      />
    );
  },
);

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
}
