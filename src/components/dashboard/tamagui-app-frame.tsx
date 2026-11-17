"use client";

import {
  Archive, CalendarDays, ChevronDown, CircleUserRound, Fingerprint,
  Gift, KeyRound, LayoutDashboard, LogOut, MailCheck, Menu, Moon, Palette,
  QrCode, Search, Settings, Sun, UserCog, UserRoundPlus, Users, Vote,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import { Theme } from "tamagui";
import { persistAppearance, runThemeTransition, siteThemes, useSiteTheme, type SiteThemeId } from "@/components/theme-system";
import "./tamagui-app-frame.css";
import "./dashboard-surface.css";

type ShellEvent = { id: string; name: string; status: string; startsAt: string };

type NavigationItem = {
  href: string;
  label: string;
  detail: string;
  permission: string;
  adminOnly?: boolean;
  icon: typeof LayoutDashboard;
};

const navigationGroups: { label: string; items: NavigationItem[] }[] = [
  {
    label: "Plan",
    items: [
      { href: "/dashboard/registration", label: "Registration", detail: "Forms and attendee questions", permission: "events:manage", icon: UserRoundPlus },
      { href: "/dashboard/waitlist", label: "Waitlist", detail: "Capacity and promotions", permission: "attendees:manage", icon: Users },
      { href: "/dashboard/pass-designs", label: "Pass designs", detail: "Digital passes and identity", permission: "passes:manage", icon: Palette },
    ],
  },
  {
    label: "Audience",
    items: [
      { href: "/dashboard/attendees", label: "Attendees", detail: "People, passes, and records", permission: "attendees:manage", icon: Users },
      { href: "/dashboard/campaigns", label: "Campaigns", detail: "Messages and reminders", permission: "settings:manage", icon: MailCheck },
    ],
  },
  {
    label: "Live",
    items: [
      { href: "/dashboard/check-in", label: "Check in", detail: "Admissions and scanning", permission: "checkins:manage", icon: QrCode },
      { href: "/dashboard/raffles", label: "Raffles", detail: "Draws, prizes, and displays", permission: "raffles:manage", icon: Gift },
      { href: "/dashboard/voting", label: "Voting", detail: "Ballots and live results", permission: "voting:manage", icon: Vote },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/dashboard/settings", label: "Settings", detail: "Organization preferences", permission: "settings:manage", icon: Settings },
      { href: "/admin/settings/accounts", label: "Accounts", detail: "Staff access", permission: "users:view", icon: UserCog },
      { href: "/admin/settings/permissions", label: "Permissions", detail: "Roles and capabilities", permission: "roles:view", icon: KeyRound },
      { href: "/admin/audit", label: "Audit trail", detail: "Administrative history", permission: "audit:view", adminOnly: true, icon: Fingerprint },
    ],
  },
];

const subscribeToClient = () => () => undefined;

function IconControl({ label, children, onClick, expanded }: { label: string; children: ReactNode; onClick?: (event: MouseEvent<HTMLButtonElement>) => void; expanded?: boolean }) {
  return <button className="ep-nav-icon" type="button" aria-label={label} aria-expanded={expanded} onClick={onClick}>{children}</button>;
}

export function TamaguiAppFrame({
  children,
  active,
  organizationName,
  accountName,
  events,
  permissions,
  isAdmin,
}: {
  children: ReactNode;
  active: string;
  organizationName: string;
  accountName: string;
  events: ShellEvent[];
  permissions: string[];
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { palette, setPalette } = useSiteTheme();
  const themeReady = useSyncExternalStore(subscribeToClient, () => true, () => false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dark = themeReady && resolvedTheme === "dark";
  const ownsPageSpacing = active === "Dashboard" || active === "Analytics";

  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 24);
    const frame = window.requestAnimationFrame(() => {
      const selected = new URLSearchParams(window.location.search).get("eventId");
      if (selected && events.some((event) => event.id === selected)) setEventId(selected);
      updateScrolled();
    });
    window.addEventListener("scroll", updateScrolled, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateScrolled);
    };
  }, [events]);

  useEffect(() => {
    function closeMenus(event: PointerEvent) {
      if (!(event.target instanceof Element) || !event.target.closest(".ep-nav-group")) {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeMenus);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenus);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const selectedEvent = events.find((event) => event.id === eventId) ?? events[0];
  const visibleGroups = useMemo(() => navigationGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => permissions.includes(item.permission) && (!item.adminOnly || isAdmin)),
  })).filter((group) => group.items.length > 0), [permissions, isAdmin]);

  function eventHref(id: string) {
    if (pathname === "/dashboard/events") return `/dashboard?eventId=${encodeURIComponent(id)}`;
    return `${pathname}?eventId=${encodeURIComponent(id)}`;
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  function searchAttendees() {
    const params = new URLSearchParams();
    if (eventId) params.set("eventId", eventId);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    router.push(`/dashboard/attendees${params.size ? `?${params}` : ""}`);
  }

  function openSearch() {
    setOpenMenu("search");
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function switchAppearance(event: MouseEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const nextTheme = dark ? "light" : "dark";
    persistAppearance(nextTheme);
    runThemeTransition(() => {
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
      document.documentElement.classList.toggle("light", nextTheme === "light");
      setTheme(nextTheme);
    }, { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 });
  }

  return (
    <Theme name={dark ? "dark" : "light"}>
      <div className="ep-app-frame">
        <div className="ep-nav-stage">
          <header className={`ep-site-nav${scrolled ? " is-scrolled" : ""}`}>
            <div className="ep-nav-left">
              <div className={`ep-nav-group ep-event-group${openMenu === "events" ? " is-open" : ""}`}>
                <button className="ep-event-switcher" type="button" aria-label={`Select event, current event ${selectedEvent?.name ?? "none"}`} aria-haspopup="menu" aria-expanded={openMenu === "events"} onClick={() => setOpenMenu((value) => value === "events" ? null : "events")}>
                  <CalendarDays size={14} />
                  <span className="ep-event-name">{selectedEvent?.name ?? "No active events"}</span>
                  <ChevronDown className="ep-nav-chevron" size={12} />
                </button>
                <div className="ep-hover-panel ep-event-panel">
                  <span className="ep-panel-label">Active events</span>
                  {events.length ? events.slice(0, 6).map((event) => (
                    <Link key={event.id} href={eventHref(event.id)} className={`ep-panel-link${event.id === selectedEvent?.id ? " is-selected" : ""}`}>
                      <div className="ep-nav-item-copy">
                        <span className="ep-nav-item-label">{event.name}</span>
                        <span className="ep-nav-item-detail">{event.status.toLowerCase()} · {new Date(event.startsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      </div>
                    </Link>
                  )) : <span className="ep-nav-item-detail ep-panel-empty">Create an event to begin.</span>}
                  <div className="ep-menu-divider" />
                  <Link href="/dashboard/events" className="ep-panel-link ep-view-all"><Archive size={15} /><span className="ep-nav-item-label">View all events</span></Link>
                </div>
              </div>
              <form className={`ep-nav-group ep-search-group${openMenu === "search" ? " is-open" : ""}`} onSubmit={(event) => { event.preventDefault(); searchAttendees(); }} role="search">
                <button className="ep-nav-icon ep-search-toggle" type="button" aria-label="Search attendees" aria-controls="nav-attendee-search" aria-expanded={openMenu === "search"} onClick={openSearch}><Search size={16} /></button>
                <input ref={searchInputRef} id="nav-attendee-search" className="ep-nav-search-input" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Name, email, or pass" aria-label="Search attendees" tabIndex={openMenu === "search" ? 0 : -1} />
                <button className="ep-search-submit" type="submit" tabIndex={openMenu === "search" ? 0 : -1}>Search</button>
              </form>
            </div>

            <ThemeWordmark palette={palette} setPalette={setPalette} organizationName={organizationName} />

            <nav className="ep-nav-right" aria-label="Primary navigation">
              <Link href={`/dashboard${eventId ? `?eventId=${encodeURIComponent(eventId)}` : ""}`} className={`ep-top-link${active === "Dashboard" || active === "Analytics" ? " is-active" : ""}`}>
                <span className="ep-top-link-label">Overview</span>
              </Link>
              <div className="ep-desktop-nav">
                {visibleGroups.map((group) => (
                  <div className={`ep-nav-group${openMenu === group.label ? " is-open" : ""}`} key={group.label}>
                    <button className={`ep-top-link${group.items.some((item) => item.label.toLowerCase() === active.toLowerCase()) ? " is-active" : ""}`} type="button" aria-haspopup="menu" aria-expanded={openMenu === group.label} onClick={() => setOpenMenu((value) => value === group.label ? null : group.label)}>
                      <span className="ep-top-link-label">{group.label}</span>
                    </button>
                    <div className="ep-hover-panel">
                      <span className="ep-panel-label">{group.label}</span>
                      {group.items.map((item) => <NavigationLink key={item.href} item={item} active={active} eventId={eventId} />)}
                    </div>
                  </div>
                ))}
              </div>
              <IconControl label={dark ? "Use light theme" : "Use dark theme"} onClick={switchAppearance}>{dark ? <Sun size={16} /> : <Moon size={16} />}</IconControl>
              <div className={`ep-nav-group ep-account-group${mobileOpen ? " is-open" : ""}`}>
                <IconControl label="Open navigation menu" expanded={mobileOpen} onClick={() => { setOpenMenu(null); setMobileOpen((value) => !value); }}><Menu size={17} /></IconControl>
                <div className="ep-hover-panel ep-account-panel">
                  <div className="ep-account-summary">
                    <div className="ep-account-avatar"><CircleUserRound size={16} /></div>
                    <div className="ep-nav-item-copy"><span className="ep-nav-item-label">{accountName}</span><span className="ep-nav-item-detail">Signed in</span></div>
                  </div>
                  <div className="ep-mobile-links">
                    <Link href={`/dashboard${eventId ? `?eventId=${encodeURIComponent(eventId)}` : ""}`} className="ep-mobile-link"><LayoutDashboard size={15} /><span className="ep-nav-item-label">Overview</span></Link>
                    {visibleGroups.flatMap((group) => group.items).map((item) => <NavigationLink key={item.href} item={item} active={active} eventId={eventId} mobile />)}
                  </div>
                  <div className="ep-menu-divider" />
                  <button className="ep-sign-out" type="button" onClick={signOut}><LogOut size={15} /><span className="ep-nav-item-label">Sign out</span></button>
                </div>
              </div>
            </nav>
          </header>
        </div>
        <main className="ep-main-stage">
          {ownsPageSpacing ? children : <div className="ep-workspace-page">{children}</div>}
        </main>
      </div>
    </Theme>
  );
}

function ThemeWordmark({ palette, setPalette, organizationName }: { palette: SiteThemeId; setPalette: (palette: SiteThemeId, origin?: { x: number; y: number }) => void; organizationName: string }) {
  const [switchLocked, setSwitchLocked] = useState(false);
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const letters = [
    { letter: "I", theme: siteThemes[0] },
    { letter: "n", theme: siteThemes[1] },
    { letter: "s", theme: siteThemes[2] },
    { letter: "i", theme: siteThemes[3] },
    { letter: "g", theme: siteThemes[0] },
    { letter: "h", theme: siteThemes[1] },
    { letter: "t", theme: siteThemes[2] },
  ];

  useEffect(() => () => {
    if (unlockTimer.current) clearTimeout(unlockTimer.current);
    if (previewTimer.current) clearTimeout(previewTimer.current);
  }, []);

  function originFor(element: HTMLElement) {
    const bounds = element.getBoundingClientRect();
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
  }

  function preview(theme: SiteThemeId, element: HTMLElement) {
    if (switchLocked) return;
    setPalette(theme, originFor(element));
  }

  function queuePreview(theme: SiteThemeId, element: HTMLElement) {
    if (switchLocked) return;
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => preview(theme, element), 110);
  }

  function cancelPreview() {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = null;
  }

  function commit(theme: SiteThemeId, element: HTMLElement) {
    cancelPreview();
    setPalette(theme, originFor(element));
    setSwitchLocked(true);
    if (unlockTimer.current) clearTimeout(unlockTimer.current);
    unlockTimer.current = setTimeout(() => setSwitchLocked(false), 620);
  }

  return (
    <div className="ep-org-home ep-theme-wordmark" role="group" aria-label={`${organizationName} color theme`} data-switch-locked={switchLocked || undefined}>
      {letters.map(({ letter, theme }, index) => (
        <button
          key={`${letter}-${index}`}
          className="ep-theme-letter"
          type="button"
          data-theme-letter={theme.id}
          aria-label={`Use ${theme.name} theme`}
          aria-pressed={palette === theme.id}
          aria-disabled={switchLocked || undefined}
          title={theme.name}
          onPointerEnter={(event) => queuePreview(theme.id, event.currentTarget)}
          onPointerLeave={cancelPreview}
          onFocus={(event) => preview(theme.id, event.currentTarget)}
          onPointerDown={(event) => commit(theme.id, event.currentTarget)}
          onClick={(event) => { if (event.detail === 0) commit(theme.id, event.currentTarget); }}
        >{letter}</button>
      ))}
    </div>
  );
}

function NavigationLink({ item, active, eventId, mobile = false }: { item: NavigationItem; active: string; eventId: string; mobile?: boolean }) {
  const Icon = item.icon;
  const href = `${item.href}${eventId ? `?eventId=${encodeURIComponent(eventId)}` : ""}`;
  return (
    <Link href={href} className={`${mobile ? "ep-mobile-link" : "ep-panel-link"}${active.toLowerCase() === item.label.toLowerCase() ? " is-selected" : ""}`}>
      <div className="ep-link-icon"><Icon size={15} /></div>
      <div className="ep-nav-item-copy"><span className="ep-nav-item-label">{item.label}</span>{!mobile && <span className="ep-nav-item-detail">{item.detail}</span>}</div>
    </Link>
  );
}
