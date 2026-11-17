"use client";
import "./_tamagui-dashboard-home.css"

import { Activity, ArrowRight, CalendarDays, CheckCircle2, MailCheck, MapPin, QrCode, UserRoundPlus, Users } from "lucide-react";
import type { ReactNode } from "react";
import { View } from "tamagui";
import { RollingNumber } from "@/components/ui/rolling-number";
import "./tamagui-dashboard-home.css";

export type DashboardHomeData = {
  event: { id: string; name: string; venue: string; address: string; startsAt: string; dateLabel: string; timeLabel: string; capacity: number; status: string; registrationEnabled: boolean };
  metrics: { registered: number; expectedGuests: number; waitlisted: number; checkedIn: number; checkInRate: number; capacityRate: number; emailRate: number; emailTotal: number };
  registrationActivity: { day: string; count: number }[];
  stations: { name: string; count: number }[];
  campaignSummary: { count: number; delivered: number; failed: number };
  activity: { id: string; time: string; type: string; subject: string; detail: string }[];
};

function Metric({ label, value, suffix, detail, icon }: { label: string; value: number; suffix?: string; detail: string; icon: ReactNode }) {
  return <div className="is_View _f-1514526504 _mw-213409336 _p-65588144 _b-1366116888 ep-home-metric"      >
    <div className="is_View _f-1839199510 _ai-1055227096 _jc-509505936 _g-924523017"   ><span className="is_Text _c-1338521705 _fs-553823584 _fw-291939625"  >{label}</span><div className="is_View _c-674849594">{icon}</div></div>
    <span className="is_Text _c-479604596 _fs-553860102 _lh-1392630827 _fw-291940586 _m-1018323161 ep-tabular"     ><RollingNumber value={value} suffix={suffix} /></span>
    <span className="is_Text _c-1338521705 _fs-553823584 _m-1018323099"  >{detail}</span>
  </div>;
}

export function TamaguiDashboardHome({ data, permissions }: { data: DashboardHomeData | null; permissions: string[] }) {
  const can = (permission: string) => permissions.includes(permission);
  if (!data) return <div className="is_View _mw-726256970 _w-1646821508 _as-909197424 _p-1370393664 ep-home"    ><div className="is_View _b-659677367 _br-127788188 _b-1729970936 _o-1119039191 _p-1370393664"><span role="heading" aria-level={1} className="is_Text _c-479604596 _fs-553854336 _fw-291940586"  >Your event workspace is ready.</span><span className="is_Text _c-1338521705 _fs-553825506 _m-1018323099"  >Create an event to begin registration, admissions, and reporting.</span>{can("events:manage") ? <a href="/dashboard/events" className="is_DOM ep-primary-link">Create an event <ArrowRight size={15} /></a> : null}</div></div>;

  const { event, metrics } = data;
  const maxDaily = Math.max(1, ...data.registrationActivity.map((item) => item.count));
  const eventQuery = `eventId=${encodeURIComponent(event.id)}`;
  return <div className="is_View _mw-726256970 _w-1646821508 _as-909197424 _p-1370393664 _g-924523110 ep-home"     >
    <div className="is_View _f-1839199510 _ai-1238633270 _jc-509505936 _g-924523110 ep-home-heading"    >
      <div className="is_View _mw-2096154094">
        <div className="is_View _f-1839199510 _ai-1055227096 _g-924523017 _m-555476042"   ><div className="is_View _w-223963569 _h-1919519632 _br-1681904590 _b-347830866"    /><span className="is_Text _c-674849594 _fs-553822623 _fw-291940586 _ls-2094073845"   >{event.status} · {event.registrationEnabled ? "REGISTRATION OPEN" : "REGISTRATION CLOSED"}</span></div>
        <span role="heading" aria-level={1} className="is_Text _c-479604596 _fs-553887971 _lh-1392657735 _fw-291940586 _ls-379883670"    >{event.name}</span>
        <div className="is_View _f-1791708213 _g-924523079 _m-1018323161"   ><div className="is_View _f-1839199510 _ai-1055227096 _g-924523017"  ><CalendarDays size={14} /><span className="is_Text _c-1338521705 _fs-553824545" >{event.dateLabel} · {event.timeLabel}</span></div><div className="is_View _f-1839199510 _ai-1055227096 _g-924523017"  ><MapPin size={14} /><span className="is_Text _c-1338521705 _fs-553824545" >{event.venue}</span></div></div>
      </div>
      <div className="is_View _f-1839199510 _g-924523017 ep-home-actions"  >{can("attendees:manage") ? <a href={`/dashboard/attendees?${eventQuery}`} className="is_DOM ep-secondary-link"><Users size={15} /> Attendees</a> : null}{can("checkins:manage") ? <a href={`/dashboard/check-in?${eventQuery}`} className="is_DOM ep-primary-link"><QrCode size={15} /> Open check-in</a> : null}</div>
    </div>

    <div className="is_View _b-659677367 _br-127788188 _b-1729970936 _o-1119039191 _f-1791708213" >
      <Metric label="Registered" value={metrics.registered} detail={`${metrics.capacityRate}% of ${event.capacity} capacity`} icon={<UserRoundPlus size={15} />} />
      <Metric label="Expected guests" value={metrics.expectedGuests} detail={`${metrics.waitlisted} on the waitlist`} icon={<Users size={15} />} />
      <Metric label="Checked in" value={metrics.checkedIn} detail={`${metrics.checkInRate}% arrival rate`} icon={<CheckCircle2 size={15} />} />
      <Metric label="Email delivery" value={metrics.emailRate} suffix="%" detail={`${metrics.emailTotal} logged sends`} icon={<MailCheck size={15} />} />
    </div>

    <div className="is_View _f-1839199510 _g-924523110 _ai-100157154 ep-home-grid"   >
      <div className="is_View _b-659677367 _br-127788188 _b-1729970936 _o-1119039191 _f-1514526504 _mw-839999524" >
        <div className="is_View _p-1791069041 _b-1079586356"   ><span className="is_Text _c-479604596 _fs-553827428 _fw-291939625"  >Registration activity</span><span className="is_Text _c-1338521705 _fs-553823584 _m-1018323099"  >The last 14 days for this event</span></div>
        <div className="is_View _h-2123837242 _p-1618875165 _f-1839199510 _ai-1238633270 _g-924523017 ep-chart"       >
          {data.registrationActivity.map((item) => <div key={item.day} tabIndex={0} aria-label={`${item.day}: ${item.count} registrations`} className="is_View _f-1514526504 _h-624191107 _jc-1618422872 _ai-1055227096 ep-chart-column"    ><span className="is_Text _c-479604596 _fs-1090503735 _fw-291939625 ep-chart-value"   >{item.count}</span><View className="ep-chart-bar" w="100%" maxW={34} minH={3} backgroundColor="brand-500" borderTopLeftRadius={6} borderTopRightRadius={6} style={{ height: `${Math.max(3, (item.count / maxDaily) * 100)}%` }} /><span className="is_Text _c-1338521674 _fs-1090504696 _m-1018323130"  >{item.day.slice(5)}</span></div>)}
        </div>
      </div>
      <div className="is_View _b-659677367 _br-127788188 _b-1729970936 _o-1119039191 _w-486201944 _mw-214452021 ep-stations"  >
        <div className="is_View _p-1791069041 _b-1079586356"   ><span className="is_Text _c-479604596 _fs-553827428 _fw-291939625"  >Admissions pulse</span><span className="is_Text _c-1338521705 _fs-553823584 _m-1018323099"  >Check-ins by station</span></div>
        <div className="is_View _p-1370393726 _g-924523048 _f-1514526504"  >{data.stations.length ? data.stations.slice(0, 5).map((station) => <div key={station.name} className="is_View _f-1839199510 _ai-1055227096 _jc-509505936 _g-924523048"   ><span className="is_Text _c-479604596 _fs-553824545 _fw-291938664"  >{station.name}</span><span className="is_Text _c-674849594 _fs-553824545 _fw-291940586 ep-tabular"   >{station.count}</span></div>) : <span className="is_Text _c-1338521705 _fs-553824545" >No attributed check-ins yet.</span>}</div>
        <div className="is_View _p-1370393726 _b-745001674 _b-1885185172"   ><span className="is_Text _c-1338521705 _fs-553822623" >{data.campaignSummary.count} campaigns · {data.campaignSummary.delivered} delivered · {data.campaignSummary.failed} failed</span></div>
      </div>
    </div>

    <div className="is_View _b-659677367 _br-127788188 _b-1729970936 _o-1119039191">
      <div className="is_View _p-1791069041 _f-1839199510 _ai-1055227096 _jc-509505936 _b-1079586356"      ><div className="is_View _f-1839199510 _ai-1055227096 _g-924523017"  ><Activity size={15} /><span className="is_Text _c-479604596 _fs-553827428 _fw-291939625"  >Recent activity</span></div>{can("attendees:manage") ? <a href={`/dashboard/attendees?${eventQuery}`} className="is_DOM ep-inline-link">View attendees <ArrowRight size={13} /></a> : null}</div>
      {data.activity.length ? data.activity.map((item, index) => <div key={item.id} className={["is_View _f-1839199510 _ai-1055227096 _g-924523079 _p-1791069010 ep-activity-row", (index === data.activity.length - 1) ? "_b-1582576941" : "_b-1079586356"].filter(Boolean).join(" ")}       ><span className="is_Text _w-1646948505 _c-1338521705 _fs-553822623 ep-tabular"   >{item.time}</span><div className={["is_View _w-223962608 _h-1919518671 _br-1681904590", (item.type === "Email") ? "_b-266458885" : "_b-347830866"].filter(Boolean).join(" ")}    /><div className="is_View _f-1514526504 _mw-839999524" ><span className="is_Text _c-479604596 _fs-553824545 _fw-291939625"  >{item.subject}</span><span className="is_Text _c-1338521705 _fs-553822623 _m-1018323099"  >{item.type} · {item.detail}</span></div></div>) : <span className="is_Text _c-1338521705 _fs-553824545 _p-1370393695"  >Activity will appear as guests register, receive messages, and check in.</span>}
    </div>
  </div>;
}
