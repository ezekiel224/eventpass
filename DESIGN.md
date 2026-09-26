---
name: EventPass
description: Warm, precise event operations in one continuous workspace.
colors:
  alabaster: "#F0EBE5"
  warm-ink: "#191614"
  paper-card: "#F7F5F2"
  quiet-fill: "#E3DDD9"
  quiet-ink: "#68605A"
  spanish-orange: "#F4680A"
  royal-orange: "#F99D45"
  warm-rule: "#CEC6C0"
  dark-canvas: "#15110F"
  dark-card: "#1D1916"
  dark-muted: "#2A2623"
  dark-quiet-ink: "#B1A8A0"
  dark-rule: "#423C38"
  destructive-light: "hsl(14 72% 39%)"
  destructive-dark: "hsl(14 78% 58%)"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.35rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "0.19em"
rounded:
  check: "5px"
  control: "12px"
  panel: "14px"
  notice: "16px"
  pill: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  7: "28px"
components:
  button-primary:
    backgroundColor: "{colors.spanish-orange}"
    textColor: "#FFFFFF"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.paper-card}"
    textColor: "{colors.warm-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.paper-card}"
    textColor: "{colors.warm-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "44px"
  card:
    backgroundColor: "{colors.paper-card}"
    textColor: "{colors.warm-ink}"
    rounded: "{rounded.panel}"
    padding: "20px"
---

# Design System: EventPass

## Overview

**Creative North Star: "The Continuous Operations Desk"**

EventPass feels like a calm, purpose-built control surface for event operators. Its visual world is warm rather than clinical: Alabaster planes, warm ink, restrained rules, and a single orange voice make dense operational information feel approachable without becoming decorative.

The signature composition is the master-detail Event Workspace. A persistent dark navigation rail establishes product context, an anchored event stack preserves orientation, and the selected event opens into a broad operational plane. Light and dark modes keep the same hierarchy and interaction model; they change tonal values, not structure.

**Key Characteristics:**

- Warm, near-monochrome surfaces with Spanish Orange and Royal Orange as the only chromatic accents.
- A persistent master-detail workspace that keeps event choice and event operations visible together.
- Flat modular panels, crisp dividers, restrained shadows, and consistent 14px panel corners.
- Compact, highly legible Inter typography with tight display tracking and tabular operational numbers.
- Short spatial transitions that preserve continuity, with a complete reduced-motion path.

## Colors

The palette is warm, almost monochrome, and deliberately sparse; orange carries action, selection, progress, and important live state.

### Primary

- **Spanish Orange:** The principal action and selection color. Use it for primary buttons, active rules, focus rings, progress fills, selected-event markers, and important live state.

### Secondary

- **Royal Orange:** A lighter companion accent for secondary emphasis and accent-on-dark moments. It does not introduce a separate semantic status language.

### Neutral

- **Alabaster:** The light-mode canvas and defining brand neutral.
- **Warm Ink:** Primary text and the persistent dark rail in light mode.
- **Paper Card:** Light-mode card and raised-surface fill.
- **Quiet Fill:** Subdued controls, tracks, and low-emphasis surface separation.
- **Quiet Ink:** Supporting copy, metadata, and inactive navigation.
- **Warm Rule:** Borders and dividers; usually rendered with reduced opacity.
- **Dark Canvas / Dark Card / Dark Muted:** Warm near-black layers for dark mode. Never substitute cool blue-black neutrals.
- **Dark Quiet Ink / Dark Rule:** Muted copy and structure on warm near-black surfaces.
- **Destructive:** Reserved for truly destructive or error states; it is the sole exception to the orange-plus-neutral operational palette.

**The One Chromatic Voice Rule.** Orange owns routine action, selection, progress, and important state; do not introduce blue, green, purple, or multicolor status families.

**The Warm Neutral Rule.** Every neutral should retain a brown-orange undertone in both modes. Dark mode is warm near-black, never slate or navy.

**The No-Gradient Rule.** Use flat color only. Gradients are not part of the EventPass dashboard language.

## Typography

**Display Font:** Inter (with ui-sans-serif and system fallbacks)  
**Body Font:** Inter (with Segoe UI, Roboto, Helvetica Neue, Arial, and sans-serif fallbacks)

**Character:** A single sans-serif family keeps operations direct and familiar. Hierarchy comes from weight, scale, tight headline tracking, tabular numerals, and occasional compact uppercase labels rather than a decorative type pairing.

### Hierarchy

- **Display** (600, 2.75rem, 1.05): Page titles on broad desktop surfaces; scales down to 1.875rem on narrow layouts.
- **Headline** (700, 2.35rem, 1.05): Selected event identity and primary workspace headings; uses tight negative tracking.
- **Title** (700, 1.5rem, 1.2): Event-list and section-level headings.
- **Body** (400, 0.875rem, 1.5): Interface copy, table content, metadata, and control text. Use 600 for interactive or structural emphasis.
- **Label** (750, 0.625rem, 0.19em tracking, uppercase): Sparse kickers and technical labels only.

**The Operational Numeral Rule.** Counts, dates, percentages, capacities, and timestamps use tabular numerals wherever alignment or comparison matters.

## Layout

The desktop shell uses a fixed 16rem navigation rail and a content stage capped at 112rem. The Event Workspace adds a 21.25rem event master column beside a fluid detail plane. The event list remains anchored while the selected event changes, preserving the operator's place and reducing route-like context loss.

Panels follow a 4px base rhythm, most often composing 12px, 16px, 20px, 24px, and 28px intervals. Detail content uses 20px padding on small screens and 28px horizontal padding from the small breakpoint upward. Repeated workspace panels are separated by 16px.

Below the extra-large breakpoint, the master and detail columns become a single column. Metrics stack until medium widths, the setup action drops below its checklist until large widths, horizontal tab strips scroll instead of wrapping, and wide activity tables retain a 42rem minimum width inside an overflow container. The persistent rail is replaced by a 44px menu control and a left drawer no wider than 20rem or 88vw. Core actions and content remain available on mobile.

**The Anchored Context Rule.** Event selection and event operations belong to one continuous plane. Do not replace the master-detail relationship with a disconnected KPI-card landing page.

## Elevation & Depth

The system is flat by default and uses tonal layering plus one-pixel warm borders for most depth. Resting cards use a restrained ambient shadow (`0 8px 22px rgb(36 28 22 / 0.06)`); primary actions use a low orange shadow (`0 10px 24px hsl(var(--primary) / 0.16)`). Larger modal elevation (`0 24px 64px rgb(20 16 13 / 0.24)`) is reserved for true overlays. Hover lift is limited to 1–2px and may deepen the ambient shadow.

### Shadow Vocabulary

- **Panel Ambient** (`0 8px 22px rgb(36 28 22 / 0.06)`): Resting cards and chrome panels.
- **Secondary Control** (`0 6px 18px rgb(36 28 22 / 0.06)`): Bordered secondary buttons.
- **Primary Action** (`0 10px 24px hsl(var(--primary) / 0.16)`): Orange primary actions only.
- **Modal** (`0 24px 64px rgb(20 16 13 / 0.24)`): Dialogs and blocking overlays.
- **Focus Halo** (`0 0 0 4px hsl(var(--primary) / 0.12)`): Input focus in addition to a visible orange border.

**The Structure-Before-Shadow Rule.** Establish hierarchy with fill, border, and layout first. Shadows support interaction or overlays; they do not turn every module into a floating card.

## Shapes

The form language is gently rounded but disciplined. Primary cards and workspace panels use 14px corners; controls, navigation items, buttons, and inputs use 12px corners; compact completion boxes use 5px corners. Pills are limited to dots, progress tracks, and genuinely compact status or avatar forms.

Borders are one pixel and warm, often shown at 66–90% token opacity. Dividers are structural: they connect metrics, tables, navigation tabs, and list rows into coherent operational groups. Do not use oversized bubble shapes or excessive nesting of rounded containers.

## Components

### Buttons

- **Shape:** Compact, gently rounded controls (12px) with a 44px default height and 16px horizontal padding.
- **Primary:** Spanish Orange with white text and a restrained orange shadow. Hover shifts to 90% color and rises 2px; active scales to 0.98.
- **Secondary:** Paper-card fill, warm border, warm-ink text, and a subtle neutral shadow. Hover strengthens the orange border and rises 2px.
- **Ghost:** Muted text on transparent fill; hover adds quiet fill and restores foreground contrast.
- **Danger:** Destructive fill with white text, used only for consequential destructive actions.
- **Focus:** A two-pixel orange ring with a two-pixel background-colored offset.

### Cards / Containers

- **Corner Style:** Gently rounded panels (14px).
- **Background:** Paper-card in light mode and dark-card in dark mode; workspace subsections may use a translucent canvas fill against the card plane.
- **Shadow Strategy:** Ambient and restrained; rely on borders and tonal layers first.
- **Border:** One-pixel warm rule, commonly at 70–80% opacity.
- **Internal Padding:** Usually 20px; headers may use 16px vertical by 20px horizontal padding.

### Inputs / Fields

- **Style:** 44px tall, 12px corners, paper-card fill, one-pixel warm border, 14px horizontal padding, and 14px body text.
- **Hover:** Border moves toward Spanish Orange at 45% opacity.
- **Focus:** Solid Spanish Orange border plus a four-pixel translucent orange halo.
- **Disabled / Error:** Preserve readable contrast and use the destructive token only for actual invalid or failed states.

### Navigation

The desktop rail is a fixed warm-ink surface with 44px minimum-height links. Inactive items use softened white; hover adds a faint white fill. The active item uses a 12% orange wash, a 25% orange border, a narrow orange left marker, and an orange icon. Mobile uses the same rail treatment in a slide-in drawer over a 72% black scrim.

### Event Workspace

The signature component pairs a selectable event stack with the selected event's detail plane. The active event receives a 10% orange wash and a 4px orange leading rule. Workspace tabs use a two-pixel orange underline. Readiness, setup, and activity sections share 14px corners, warm borders, connected dividers, and one focused orange action rather than independent colorful cards.

Selecting an event moves the shared leading rule over 420ms and slides the detail plane on a shared horizontal axis. Progress fills animate over 800ms. These transitions clarify continuity; they never delay access to controls.

### Mobile Pass Scanner

The pass scanner is a focused, full-viewport operational surface reached from the check-in desk. It removes the dashboard shell, keeps the rear-camera action dominant, prevents the screen from sleeping when supported, and continues accepting passes after each short feedback cycle. Successful scans use the standard orange confirmation treatment; invalid or duplicate passes use the destructive token.

An under-21 attendee or underage guest triggers a persistent `Age check required` panel naming the affected person, paired with a distinct alert tone and vibration pattern when the device permits them. The warning never relies on sound, vibration, or color alone, and it remains visible until another pass is scanned. Operators always retain a clear route back to manual check-in.

### Motion

The standard transition is 240–300ms with the expressive easing `cubic-bezier(0.16, 1, 0.3, 1)`. Master-detail changes and the mobile drawer use 420ms with that same easing. Hover lifts are limited to 1–2px. Pressed primary controls may use a short ripple and 0.98 scale.

When `prefers-reduced-motion: reduce` is active, smooth scrolling is disabled and all animations and transitions collapse to 0.01ms with a single iteration. No meaning, state, or control availability may depend on motion.

**The Continuity-Only Motion Rule.** Animate shared position, selection, progress, and overlays to explain a state change; do not add ambient or ornamental dashboard motion.

## Do's and Don'ts

### Do:

- **Do** reserve Spanish Orange for primary actions, selection, progress, focus, and important live state.
- **Do** use warm near-monochrome planes, 14px workspace panels, and one-pixel structural borders.
- **Do** keep the event stack anchored beside event operations when desktop space allows.
- **Do** preserve visible keyboard focus, 44px controls, responsive overflow, and the complete reduced-motion override.
- **Do** use tabular numerals for operational metrics and timestamps.

### Don't:

- **Don't** use gradients, cool slate neutrals, or blue-black dark surfaces.
- **Don't** introduce a multicolor semantic status palette; routine states remain neutral or orange.
- **Don't** dissolve the Event Workspace into an interchangeable sidebar-plus-KPI-card dashboard.
- **Don't** overuse shadows, glass blur, pill shapes, or floating containers where borders and tonal layers suffice.
- **Don't** hide core event operations on mobile or make comprehension depend on animation.
