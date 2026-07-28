import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <main className="surface-grid grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-lg p-8 text-center">
        <ShieldX className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
        <h1 className="mt-5 text-3xl font-semibold">Access denied</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Your account does not have permission to open this administrative area.</p>
        <Link className="focus-ring mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground" href="/dashboard">Return to dashboard</Link>
      </Card>
    </main>
  );
}
