"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { registrationSeries } from "@/lib/mock-data";

export function RegistrationsChart() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Registrations over time</h2>
          <p className="text-sm text-muted-foreground">Last five business days</p>
        </div>
      </div>
      <div className="mt-6 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={registrationSeries}>
            <defs>
              <linearGradient id="registrations" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border) / 0.58)" vertical={false} />
            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid hsl(var(--border))", background: "hsl(var(--card) / 0.92)", backdropFilter: "blur(16px)" }} />
            <Area type="monotone" dataKey="registrations" stroke="hsl(var(--primary))" fill="url(#registrations)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function CheckinChart() {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">Check-in timeline</h2>
      <p className="text-sm text-muted-foreground">Scans per operating window</p>
      <div className="mt-6 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={registrationSeries}>
            <CartesianGrid stroke="hsl(var(--border) / 0.58)" vertical={false} />
            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid hsl(var(--border))", background: "hsl(var(--card) / 0.92)", backdropFilter: "blur(16px)" }} />
            <Bar dataKey="checkins" fill="hsl(var(--accent))" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
