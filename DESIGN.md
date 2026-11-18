---
name: Praxis
description: Calm event operations in an adaptive, user-selectable color workspace.
colors:
  canvas: "#F3F5F6"
  surface: "#FFFFFF"
  subtle: "#E9EEF2"
  rule: "#D7DEE2"
  quiet-ink: "#56646E"
  ink: "#10161C"
  harbor: "#5278C7"
  copper: "#A95632"
  aubergine: "#79526F"
  amber: "#9A5D12"
  dark-canvas: "#10161C"
  dark-surface: "#1B252E"
  destructive: "#DD4E36"
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
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.08em"
rounded:
  control: "12px"
  panel: "16px"
  nav: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
components:
  button-primary:
    backgroundColor: "{colors.harbor}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "20px"
---

# Design System: Praxis

## Overview

**Creative North Star: "The Adaptive Operations Bar"**

Praxis is a calm, precise operations product with four selectable color families, each available in accessible light and dark appearances. The interface starts flat and spacious, then the navigation condenses into a floating pill as content moves beneath it. Dense event work remains approachable through strong hierarchy, connected surfaces, and gentle interaction feedback.

The system is built from Tamagui themes and components. Shared palette families are declared in `src/app/globals.css`, selected through `src/components/theme-system.tsx`, and consumed through semantic Tamagui and Tailwind tokens. Page-specific palettes must not be introduced.

**Key Characteristics:**

- Four restrained palette families with independent light and dark appearances.
- A centered multicolor Insight wordmark that doubles as the theme selector.
- An event selector at the leading edge, with grouped hover navigation and account controls at the trailing edge.
- Flat sections, crisp borders, restrained shadows, and consistent 12–16px corners.
- Gentle transform-and-opacity motion with a complete reduced-motion path.

## Colors

The palette system keeps structure and semantic meaning constant while allowing the user to choose its visual character.

### Theme Families

- **Harbor Blue** (`#5278C7` light / `#83A6ED` dark): Calm, trustworthy default.
- **Ink & Copper** (`#A95632` light / `#E19369` dark): Warm and event-forward.
- **Aubergine & Clay** (`#79526F` light / `#C18AAC` dark): Editorial and composed.
- **Carbon & Amber** (`#9A5D12` light / `#E5A84C` dark): Technical and high-focus.

### Neutral

- **Canvas:** Each family supplies a softly tinted light ground and a near-black dark ground.
- **Surface:** Panels remain visibly separate from the canvas in every variant.
- **Quiet Ink:** Secondary copy must maintain at least 4.5:1 contrast against its rendered surface.
- **Ink:** Primary text is never pure white-on-white or black-on-black and maintains strong contrast.
- **Destructive** (`#DD4E36`): Errors and consequential destructive actions only.

**The One Active Accent Rule.** Only the selected theme family owns routine emphasis. Semantic success, warning, and destructive colors remain independent and are used only for those meanings.

**The Palette Source Rule.** New colors must be derived from the shared theme-family ramps instead of being authored per page.

**The No-Gradient Rule.** Use flat color only.

## Typography

**Display Font:** Inter with system sans-serif fallbacks
**Body Font:** Inter with system sans-serif fallbacks

Hierarchy comes from weight, scale, tight headline tracking, and tabular operational numbers rather than decorative type.

- **Display** (600, 2.75rem, 1.05): Broad desktop page titles.
- **Headline** (700, 2.35rem, 1.05): Event identity and primary workspace headings.
- **Title** (700, 1.5rem, 1.2): Section headings.
- **Body** (400, 0.875rem, 1.5): Interface copy, tables, and controls.
- **Label** (700, 0.6875rem, 0.08em): Sparse technical labels only.

**The Operational Numeral Rule.** Counts, dates, percentages, capacities, and timestamps use tabular numerals when comparison matters.

## Layout

Authenticated pages use one shared top navigation and a fluid content stage. The multicolor Insight wordmark remains centered; each letter is itself a palette control that previews and commits its assigned theme on hover, focus, or tap. Do not add a separate theme tray or menu. The event selector sits at the leading edge and ends with a “View all events” route; related destinations are compressed into hover-driven groups instead of a persistent sidebar.

Content follows a 4px base rhythm with 12, 16, 20, 24, and 32px intervals. Wide pages use a centered maximum width while operational tables may scroll horizontally. On compact screens, the same information architecture moves into touch-friendly menus without hiding core actions.

**The Shared Frame Rule.** Dashboard and administration routes use the same app frame, page title, action row, panel, and responsive spacing primitives.

**The Single Event Context Rule.** Event-scoped dashboard workspaces resolve their selected event from the global navigation's `eventId` URL context. Do not repeat an event selector inside the workspace when the shared navigation already owns that choice.

## Elevation & Depth

The system is flat at rest. Tonal separation and one-pixel borders do most of the work; shadows are quiet and reserved for the condensed navigation, interactive lift, and true overlays.

- **Panel Ambient** (`0 8px 22px rgb(6 17 12 / 0.06)`): Resting panels.
- **Primary Action** (`0 10px 24px hsl(var(--primary) / 0.16)`): High-emphasis controls.
- **Modal** (`0 24px 64px rgb(2 14 9 / 0.24)`): Blocking overlays.
- **Focus Halo** (`0 0 0 4px hsl(var(--primary) / 0.12)`): Keyboard focus on fields.

**The Structure-Before-Shadow Rule.** Establish hierarchy with fill, border, spacing, and typography before adding elevation.

## Shapes

Panels use 16px corners and controls use 12px corners. The top navigation becomes fully pill-shaped only in its condensed scrolled state. Pills remain purposeful: navigation chrome, status, avatars, and compact metadata.

Borders are one pixel and drawn from the active theme's neutral scale. Avoid nested rounded containers when a divider or spacing can express the relationship more clearly.

## Components

### Navigation

The top navigation begins flat and integrated with the page. Scrolling condenses it into a centered pill using transform, opacity, border, and shadow transitions. Menus open on hover where a precise pointer is available, remain keyboard accessible, and use click/tap on touch devices.

Portal-based menus, selects, dialogs, and sheets temporarily move the navigation stage fully above the viewport while preserving its layout space. Use the shared 420ms continuity easing for this movement so the overlay receives a clear visual stage without making the page jump.

**The Clear Overlay Stage Rule.** Every portal overlay displaces the shared navigation through the same coordinated transition; do not leave navigation competing above an active overlay or collapse its reserved space.

### Buttons

- **Primary:** Active-theme accent fill with its tested contrasting ink, 44px height, and a restrained shadow.
- **Secondary:** Surface fill, base-scale border, and primary ink.
- **Ghost:** Transparent at rest with a subtle base-scale hover fill.
- **Danger:** Alert-scale fill for consequential destructive actions only.
- **Focus:** A visible active-theme accent ring with background-colored offset.

### Cards / Containers

Panels use surface fills, 16px corners, one-pixel base-scale borders, and 20px internal padding. Connected rows and tables prefer dividers to individually floating cards.

### Inputs / Fields

Fields are 44px tall with 12px corners, surface fill, and a base-scale border. Hover moves the border toward the active accent; focus adds a solid accent border and translucent halo. Error treatment uses the alert palette and never color alone.

### Event Selector

The selector keeps the current event visible in the shared navigation. Its menu uses clear event names and dates, followed by one terminal “View all events” action leading to event creation, archived events, and deletion controls.

### Preview Sheets

Use the shared Tamagui preview sheet for read-only, page-scale previews at every viewport. It rises from the bottom to 92% of the viewport, keeps its header fixed above a scroll-contained content plane, and caps the inner reading width while the sheet itself remains edge-to-edge. The sheet and dimming overlay use the same medium transition so they read as one continuous movement.

Preview content uses the same Tamagui fields and layout primitives as the product surface, preserves the source content's real order, and makes every field and submission action visibly inactive. Do not revive legacy page-specific form sections or choice-tile styling inside the preview.

**The One Preview Plane Rule.** Page-scale previews use the shared bottom sheet at every viewport; do not switch to a centered dialog on wide screens.

### Mobile Pass Scanner

The scanner is a focused full-viewport surface using the active family's darkest neutral colors. Successful scans use the semantic success color; invalid or duplicate passes use the alert palette. Underage warnings remain visible and include text, iconography, and device feedback when supported.

### Motion

Use 240–300ms for control feedback and up to 420ms for shared navigation continuity. Portal overlays and the navigation displacement use the same 420ms continuity curve, with the navigation moving by transform so its layout space remains stable. Animate transform, opacity, color, border, and shadow; avoid width, height, padding, or margin animation. Reduced motion collapses transitions without removing information or controls.

## Do's and Don'ts

### Do:

- **Do** use the shared palette families and semantic tokens as the single color source.
- **Do** preserve the centered organization home control and leading event selector.
- **Do** let the global navigation own event context for event-scoped dashboard workspaces.
- **Do** use shared Tamagui surfaces for dashboard and administration routes.
- **Do** displace the navigation with the shared 420ms transition whenever a portal overlay is active.
- **Do** use the shared 92%-height bottom sheet for page-scale previews on every viewport.
- **Do** preserve visible keyboard focus, 44px controls, responsive overflow, and reduced motion.
- **Do** keep motion gentle and continuity-driven.

### Don't:

- **Don't** revive legacy warm, orange, or page-specific palettes.
- **Don't** add a persistent left navigation rail.
- **Don't** use gradients or unrelated semantic color families.
- **Don't** overuse shadows, blur, pills, or nested cards.
- **Don't** hide core event operations on mobile or make comprehension depend on animation.
