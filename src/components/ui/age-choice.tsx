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
    <fieldset className={cn("grid gap-3", className)}>
      <legend className="text-sm font-semibold">{question}</legend>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={value === "no"}
          onClick={() => onChange("no")}
          className={cn(
            "focus-ring flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition duration-300 ease-luxury",
            value === "no"
              ? "border-primary bg-primary text-primary-foreground shadow-[0_12px_30px_hsl(var(--primary)/0.22)]"
              : "border-border/80 bg-background/50 text-muted-foreground hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/[0.05] hover:text-foreground"
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
            "focus-ring flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition duration-300 ease-luxury",
            value === "yes"
              ? "border-destructive bg-destructive text-white shadow-[0_12px_30px_hsl(var(--destructive)/0.18)]"
              : "border-border/80 bg-background/50 text-muted-foreground hover:-translate-y-0.5 hover:border-destructive/40 hover:bg-destructive/[0.05] hover:text-foreground"
          )}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          No, under 21
        </button>
      </div>
    </fieldset>
  );
}
