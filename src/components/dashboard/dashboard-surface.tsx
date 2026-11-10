"use client";
import "./_dashboard-surface.css"

import type { ReactNode } from "react";
import { Text, XStack, YStack, html } from "tamagui";

export function DashboardStack({ children, className }: { children: ReactNode; className?: string }) {
  return <YStack className={className} gap="5">{children}</YStack>;
}

export function DashboardActions({ children }: { children: ReactNode }) {
  return <div className="is_View _f-27493358 _g-924523017 _jc-1618422872 ep-page-actions"   >{children}</div>;
}

export function DashboardLinkButton({ href, children, tone = "primary" }: { href: string; children: ReactNode; tone?: "primary" | "secondary" }) {
  return <html.a href={href} className={`ep-page-link-button is-${tone}`}>{children}</html.a>;
}

export function DashboardRow({ children, className }: { children: ReactNode; className?: string }) {
  return <XStack className={`ep-dashboard-row${className ? ` ${className}` : ""}`} alignItems="center" justifyContent="space-between" gap="4">{children}</XStack>;
}

export function DashboardBadge({ children, tone = "quiet" }: { children: ReactNode; tone?: "quiet" | "brand" | "danger" }) {
  return <Text className={`ep-dashboard-badge is-${tone}`} fontSize={10} lineHeight={14} fontWeight="800">{children}</Text>;
}

export function DashboardPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <YStack
      className={`ep-dashboard-panel${className ? ` ${className}` : ""}`}
      borderWidth={1}
      borderColor="border-color"
      borderRadius="4"
      backgroundColor="background"
      overflow="hidden"
    >
      {children}
    </YStack>
  );
}

export function DashboardPanelHeader({ title, description, aside }: { title: string; description?: string; aside?: ReactNode }) {
  return (
    <div className="is_View _f-27493358 _ai-1055227096 _jc-509505936 _g-924523079 ep-dashboard-panel-head"    >
      <div className="is_View _f-2057920087 _mw-839999524 _g-924522986" >
        <span className="is_Text font_heading tm-paragraph _us-601593343 _ws-974065937 _ff-163417665 _m-2017216831 _ls-888140243 _c-479604596 _fs-553827428 _lh-341113537 _fw-291939625"   >{title}</span>
        {description ? <span className="is_Text _c-1589498260 _fs-553823584 _lh-341113512"  >{description}</span> : null}
      </div>
      {aside ? <div className="is_View">{aside}</div> : null}
    </div>
  );
}

export function DashboardEmpty({ children }: { children: ReactNode }) {
  return <span className="is_Text _c-1589498260 _fs-553824545 _lh-341113514 _p-1370393695"   >{children}</span>;
}
