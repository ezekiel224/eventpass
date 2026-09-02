import { BadgeCheck, Gift, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { Card, GlassCard } from "@/components/ui/card";
import { PrizeAcceptanceForm } from "@/components/prize/prize-acceptance-form";
import { prisma } from "@/lib/db";
import { hashPrizeAcceptanceToken } from "@/lib/prize-acceptance";

export const dynamic = "force-dynamic";

export default async function PrizeAcceptancePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const prize = await prisma.rafflePrize.findUnique({
    where: { acceptanceTokenHash: hashPrizeAcceptanceToken(token) },
    include: { event: true }
  });
  if (!prize || !prize.winnerName) notFound();

  const expired = prize.acceptanceStatus !== "PENDING" || !prize.acceptanceExpiresAt || prize.acceptanceExpiresAt <= new Date();
  const numericValue = prize.value ? Number(prize.value) : Number.NaN;
  const formattedValue = Number.isFinite(numericValue) ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(numericValue) : prize.value;

  return (
    <main className="public-shell px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:min-h-[calc(100dvh-6rem)] lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
      <GlassCard className="self-start overflow-hidden p-0 lg:sticky lg:top-12">
        <div className="border-b border-border/60 bg-primary/[0.04] p-6 sm:p-7">
          <span className="inline-flex rounded-2xl border border-primary/20 bg-primary/[0.08] p-3 text-primary"><Gift className="h-5 w-5" /></span>
          <p className="mt-6 panel-label text-primary">Prize receipt</p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-[1.08] tracking-[-0.045em]">Prize Receipt for {prize.winnerName}</h1>
        </div>
        <dl className="grid gap-px bg-border/60 text-sm">
          <div className="bg-card/85 p-5"><dt className="panel-label">Event / promotion</dt><dd className="mt-2 font-semibold">{prize.event.name}</dd></div>
          <div className="bg-card/85 p-5"><dt className="panel-label">Gift / prize</dt><dd className="mt-2 font-semibold">{prize.name}{prize.description ? ` — ${prize.description}` : ""}</dd></div>
          <div className="bg-card/85 p-5"><dt className="panel-label">Fair-market value</dt><dd className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-primary">{formattedValue || "Contact the event organizer"}</dd></div>
        </dl>
        <div className="flex items-center gap-2 border-t border-border/60 px-5 py-4 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> Secure acknowledgment workflow</div>
      </GlassCard>
      <Card className="self-start overflow-hidden p-0">
        <div className="border-b border-border/60 px-6 py-6 sm:px-8"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/[0.08] text-primary"><BadgeCheck className="h-4 w-4" /></span><div><p className="panel-label">Required acknowledgment</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Review and sign</h2></div></div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">Complete this form yourself. Your signature, date, and acknowledgment will be placed on the event’s payroll prize receipt spreadsheet.</p></div>
        <div className="p-6 sm:p-8">
          {expired ? <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">This link is expired or has already been used. Contact {prize.event.contactEmail} if you need a new link.</div> : <PrizeAcceptanceForm token={token} winnerName={prize.winnerName} />}
        </div>
      </Card>
      </div>
    </main>
  );
}
