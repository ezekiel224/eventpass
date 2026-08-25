"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card } from "@/components/ui/card";

export type OperationsChartPoint = {
  day: string;
  registrations: number;
  checkins: number;
};

export function RegistrationsChart({ data }: { data: OperationsChartPoint[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-5 sm:px-6">
        <div>
          <p className="panel-label">Registration velocity</p>
          <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em]">Registrations over time</h2>
          <p className="mt-1 text-xs text-muted-foreground">Last seven days · live registration data</p>
        </div>
        <span className="mt-1 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" /> Live</span>
      </div>
      <div className="h-72 px-3 pb-4 pt-6 sm:px-5">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="registrations" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border) / 0.46)" strokeDasharray="4 8" vertical={false} />
            <XAxis axisLine={false} dataKey="day" stroke="hsl(var(--muted-foreground))" tickLine={false} tickMargin={12} />
            <Tooltip cursor={{ stroke: "hsl(var(--primary) / 0.22)", strokeWidth: 1 }} contentStyle={{ borderRadius: 14, border: "1px solid hsl(var(--border))", background: "hsl(var(--card) / 0.94)", boxShadow: "0 20px 60px rgba(2,6,23,.18)", backdropFilter: "blur(20px)" }} />
            <Area type="monotone" dataKey="registrations" stroke="hsl(var(--primary))" fill="url(#registrations)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function CheckinChart({ data }: { data: OperationsChartPoint[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border/60 px-5 py-5 sm:px-6">
        <p className="panel-label">Access throughput</p>
        <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em]">Check-in timeline</h2>
        <p className="mt-1 text-xs text-muted-foreground">Successful scans over the last seven days</p>
      </div>
      <div className="h-72 px-3 pb-4 pt-6 sm:px-5">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="hsl(var(--border) / 0.46)" strokeDasharray="4 8" vertical={false} />
            <XAxis axisLine={false} dataKey="day" stroke="hsl(var(--muted-foreground))" tickLine={false} tickMargin={12} />
            <Tooltip cursor={{ fill: "hsl(var(--primary) / 0.05)" }} contentStyle={{ borderRadius: 14, border: "1px solid hsl(var(--border))", background: "hsl(var(--card) / 0.94)", boxShadow: "0 20px 60px rgba(2,6,23,.18)", backdropFilter: "blur(20px)" }} />
            <Bar dataKey="checkins" fill="hsl(var(--primary))" radius={[8, 8, 2, 2]} maxBarSize={34} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
