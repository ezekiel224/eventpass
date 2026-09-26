import { Button } from "@/components/ui/button";

export function PageTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: string }) {
  return (
    <div className="flex flex-col justify-between gap-5 border-b border-border pb-6 sm:flex-row sm:items-end">
      <div>
        <h1 className="max-w-4xl font-display text-3xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-4xl lg:text-[2.75rem]">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{eyebrow}</p>
      </div>
      {action ? <Button>{action}</Button> : null}
    </div>
  );
}
