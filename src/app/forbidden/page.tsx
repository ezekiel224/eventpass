import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <main className="public-shell grid min-h-dvh place-items-center px-4 py-10">
      <Card className="w-full max-w-lg p-8 text-center sm:p-10">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-destructive/25 bg-destructive/[0.07] text-destructive"><ShieldX className="h-7 w-7" aria-hidden="true" /></span>
        <p className="mt-6 panel-label text-destructive">Authorization required</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.045em]">Access denied</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Your account does not have permission to open this administrative area.</p>
        <Link className="focus-ring mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground" href="/dashboard">Return to dashboard</Link>
      </Card>
    </main>
  );
}
