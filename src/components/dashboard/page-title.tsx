import { Button } from "@/components/ui/button";

export function PageTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: string }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-sm font-medium text-primary">{eyebrow}</p>
        <h1 className="mt-2 max-w-4xl text-4xl font-semibold leading-tight">{title}</h1>
      </div>
      {action ? <Button>{action}</Button> : null}
    </div>
  );
}
