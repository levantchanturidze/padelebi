import { Check } from "lucide-react";

export type StepKey = "venue" | "facility" | "done";

/**
 * Purely-visual progress indicator for the wizard shell. Doesn't render
 * links — steps are gated on server state; the shell handles routing.
 */
export function OnboardingStepper({
  current,
  labels,
}: {
  current: StepKey;
  labels: { venue: string; facility: string; done: string };
}) {
  const steps: { key: StepKey; label: string }[] = [
    { key: "venue", label: labels.venue },
    { key: "facility", label: labels.facility },
    { key: "done", label: labels.done },
  ];
  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <ol className="mx-auto mb-8 flex max-w-md items-center gap-2 text-xs font-medium">
      {steps.map((step, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <li key={step.key} className="flex flex-1 items-center gap-2 whitespace-nowrap">
            <span
              className={[
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
                isCurrent
                  ? "border-brand-600 bg-brand-500 text-foreground"
                  : isDone
                    ? "border-success bg-success text-white"
                    : "border-border bg-surface text-muted",
              ].join(" ")}
            >
              {isDone ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span
              className={[
                "min-w-0 truncate",
                isCurrent ? "text-foreground" : "text-muted",
              ].join(" ")}
            >
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <span
                className={[
                  "h-px flex-1",
                  isDone ? "bg-success" : "bg-border",
                ].join(" ")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
