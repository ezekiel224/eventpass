import { Button } from "@/components/ui/button";

export function PageTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: string }) {
  return (
    <div className="relative flex flex-col justify-between gap-5 border-b border-border/60 pb-7 sm:flex-row sm:items-end">
      <div>
        <p className="editorial-kicker">{eyebrow}</p>
        <h1 className="mt-3 max-w-4xl font-display text-3xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-4xl lg:text-[2.75rem]">{title}</h1>
      </div>
      {action ? <Button>{action}</Button> : null}
      <span aria-hidden="true" className="absolute -bottom-px left-0 h-px w-24 bg-primary shadow-[0_0_18px_hsl(var(--primary)/0.65)]" />
    </div>
  );
}
