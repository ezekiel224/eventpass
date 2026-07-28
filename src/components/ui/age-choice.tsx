import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Under21Value = "" | "yes" | "no";

export function AgeChoice({
  value,
  onChange,
  subject = "you",
  className
}: {
  value: Under21Value;
  onChange: (value: Under21Value) => void;
  subject?: "you" | "attendee" | "plus-one";
  className?: string;
}) {
  const question = subject === "you"
    ? "Are you 21 or older?"
    : `Is the ${subject} 21 or older?`;

  return (
    <fieldset className={cn("grid gap-2", className)}>
      <legend className="text-sm font-medium">{question}</legend>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={value === "no"}
          onClick={() => onChange("no")}
          className={cn(
            "focus-ring flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition",
            value === "no"
              ? "border-emerald-500 bg-emerald-500 text-white shadow-soft"
              : "border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-700 hover:border-emerald-500/70 hover:bg-emerald-500/[0.14] dark:text-emerald-300"
          )}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          Yes, 21+
        </button>
        <button
          type="button"
          aria-pressed={value === "yes"}
          onClick={() => onChange("yes")}
          className={cn(
            "focus-ring flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition",
            value === "yes"
              ? "border-rose-500 bg-rose-500 text-white shadow-soft"
              : "border-rose-500/35 bg-rose-500/[0.08] text-rose-700 hover:border-rose-500/70 hover:bg-rose-500/[0.14] dark:text-rose-300"
          )}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          No, under 21
        </button>
      </div>
    </fieldset>
  );
}
