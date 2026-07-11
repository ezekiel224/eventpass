import { BarChart3, CalendarDays, MailCheck, QrCode, ShieldCheck, Zap } from "lucide-react";

export const features = [
  { icon: QrCode, title: "QR Code Passes", text: "Signed attendee passes with fallback codes and elegant Apple Wallet inspired layouts." },
  { icon: MailCheck, title: "Instant Email Delivery", text: "Responsive confirmation, reminder, event update, cancellation, and pass emails." },
  { icon: Zap, title: "Fast Check-in", text: "Camera scanning, instant validation, duplicate detection, and mobile-first staff workflows." },
  { icon: BarChart3, title: "Analytics Dashboard", text: "Registration trends, attendance rate, capacity usage, and email health in one view." },
  { icon: CalendarDays, title: "Multi-event Management", text: "Draft, publish, duplicate, archive, and operate multiple events from one workspace." },
  { icon: ShieldCheck, title: "Secure Authentication", text: "Admin-only dashboards, signed QR payloads, rate limits, and server validation." }
];

export const events = [
  {
    id: "evt_aurora",
    name: "Aurora Product Summit",
    description: "A premium launch conference for product, design, and operations teams.",
    venue: "Pier 27",
    address: "San Francisco, CA",
    date: "2026-08-18T16:00:00.000Z",
    end: "2026-08-18T23:00:00.000Z",
    capacity: 1200,
    registered: 936,
    checkedIn: 522,
    status: "Published",
    organizer: "Northstar Labs",
    emailSuccess: 98.7
  },
  {
    id: "evt_signal",
    name: "Signal Executive Dinner",
    description: "Invite-only dinner for enterprise operators and founders.",
    venue: "The Modern",
    address: "New York, NY",
    date: "2026-09-04T00:00:00.000Z",
    end: "2026-09-04T03:00:00.000Z",
    capacity: 180,
    registered: 164,
    checkedIn: 0,
    status: "Draft",
    organizer: "EventPass",
    emailSuccess: 100
  },
  {
    id: "evt_field",
    name: "Field Ops Forum",
    description: "Operational leaders meet for hands-on sessions and rapid check-in labs.",
    venue: "Austin Convention Center",
    address: "Austin, TX",
    date: "2026-10-12T15:00:00.000Z",
    end: "2026-10-13T00:00:00.000Z",
    capacity: 860,
    registered: 438,
    checkedIn: 0,
    status: "Published",
    organizer: "Field Guild",
    emailSuccess: 96.1
  }
];

export const attendees = [
  { id: "att_1001", name: "Maya Chen", email: "maya@example.com", phone: "+1 415 555 0121", company: "Stripe", tier: "VIP", status: "Registered", checkedIn: true, notes: "Speaker guest" },
  { id: "att_1002", name: "Jordan Lee", email: "jordan@example.com", phone: "+1 646 555 0192", company: "Linear", tier: "General", status: "Registered", checkedIn: false, notes: "Vegetarian meal" },
  { id: "att_1003", name: "Amara Okafor", email: "amara@example.com", phone: "+1 312 555 0148", company: "Vercel", tier: "Partner", status: "Waitlist", checkedIn: false, notes: "Needs invoice" },
  { id: "att_1004", name: "Noah Patel", email: "noah@example.com", phone: "+1 206 555 0188", company: "Notion", tier: "General", status: "Registered", checkedIn: true, notes: "Arrived with team" }
];

export const registrationSeries = [
  { day: "Mon", registrations: 86, checkins: 16 },
  { day: "Tue", registrations: 122, checkins: 38 },
  { day: "Wed", registrations: 184, checkins: 74 },
  { day: "Thu", registrations: 238, checkins: 132 },
  { day: "Fri", registrations: 306, checkins: 262 }
];

export const emailLogs = [
  { id: "eml_1", recipient: "maya@example.com", type: "Digital pass", status: "Delivered", time: "2 min ago" },
  { id: "eml_2", recipient: "jordan@example.com", type: "Registration confirmation", status: "Delivered", time: "9 min ago" },
  { id: "eml_3", recipient: "amara@example.com", type: "Reminder", status: "Queued", time: "18 min ago" }
];
