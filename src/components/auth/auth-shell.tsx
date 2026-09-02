import { Gauge, ScanLine, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function AuthShell({ children, productName = "EventPass" }: { children: React.ReactNode; productName?: string }) {
  return (
    <main className="relative grid min-h-dvh overflow-hidden lg:grid-cols-[minmax(28rem,0.95fr)_minmax(32rem,1.05fr)]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-border/60 bg-foreground px-10 py-12 text-background dark:bg-card dark:text-foreground lg:flex xl:px-16 xl:py-16">
        <div aria-hidden="true" className="absolute inset-0 precision-grid opacity-40" />
        <div aria-hidden="true" className="absolute -left-48 top-1/4 h-[32rem] w-[32rem] rounded-full bg-primary/25 blur-[120px]" />
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-primary">Event Management</p>
          <div className="mt-6 h-px w-full bg-gradient-to-r from-primary/80 via-background/20 to-transparent dark:via-foreground/20" />
        </div>
        <div className="relative max-w-2xl">
          <p className="font-display text-5xl font-semibold leading-[0.98] tracking-[-0.055em] xl:text-6xl">Manage Events in One Place</p>
          <p className="mt-7 max-w-xl text-base leading-7 text-background/65 dark:text-muted-foreground">{productName} brings secure pass generation, live check-in, attendee operations, and event intelligence into one disciplined command center.</p>
          <div className="mt-10 grid gap-5 border-t border-background/15 pt-7 dark:border-border/70 sm:grid-cols-3">
            <AuthSignal icon={ShieldCheck} label="Permissions" detail="Role-secured" />
            <AuthSignal icon={Gauge} label="Live Updates" detail="Live operations" />
            <AuthSignal icon={ScanLine} label="Pass Validation" detail="Verified access" />
          </div>
        </div>
        <p className="relative text-[10px] font-bold uppercase tracking-[0.2em] text-background/45 dark:text-muted-foreground">Enterprise event operations</p>
      </section>
      <section className="relative grid min-h-dvh place-items-center px-4 py-16 sm:px-8 lg:px-12">
        <div className="absolute right-5 top-5 sm:right-8 sm:top-8"><ThemeToggle /></div>
        <div className="grid w-full place-items-center">{children}</div>
      </section>
    </main>
  );
}

function AuthSignal({ icon: Icon, label, detail }: { icon: typeof ShieldCheck; label: string; detail: string }) {
  return (
    <div>
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-1 text-xs text-background/50 dark:text-muted-foreground">{detail}</p>
    </div>
  );
}
