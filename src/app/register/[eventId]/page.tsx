import { CalendarDays } from "lucide-react";
import { notFound } from "next/navigation";
import { RegisterForm } from "@/components/register/register-form";
import { Card, GlassCard } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { parseStringArray } from "@/lib/prisma-helpers";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RegisterPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({ where: { id: eventId } });

  if (!event) {
    notFound();
  }

  return (
    <main className="surface-grid mx-auto grid min-h-screen max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <div className="flex flex-col justify-center">
        <GlassCard className="animate-fade-up p-6">
          {event.photoUrl ? (
            <div className="mb-6 h-52 rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${event.photoUrl})` }} />
          ) : null}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <CalendarDays className="h-4 w-4" /> {formatDate(event.startsAt)}
          </div>
          <h1 className="mt-6 text-4xl font-semibold leading-tight">{event.name}</h1>
          <p className="mt-4 leading-7 text-muted-foreground">{event.description}</p>
          <div className="mt-6 rounded-2xl border border-border/80 bg-card/58 p-4">
            <p className="font-semibold">{event.venue}</p>
            <p className="text-sm text-muted-foreground">{event.address}</p>
          </div>
        </GlassCard>
      </div>
      <Card className="animate-fade-up p-6">
        <h2 className="text-2xl font-semibold">Register for your pass</h2>
        <p className="mt-2 text-sm text-muted-foreground">Your personalized QR pass is generated after registration.</p>
        <RegisterForm eventId={event.id} allergenOptions={parseStringArray(event.allergenOptions)} />
      </Card>
    </main>
  );
}
