"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Input } from "@/components/ui/input";

export function DashboardSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = query.trim();
    router.push(normalized ? `/dashboard/attendees?q=${encodeURIComponent(normalized)}` : "/dashboard/attendees");
  }

  return (
    <form className="relative hidden max-w-md flex-1 sm:block" role="search" onSubmit={submit}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search names, emails, pass IDs…" aria-label="Search attendees and passes" />
    </form>
  );
}
