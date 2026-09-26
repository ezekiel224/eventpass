# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users for the current product phase are event operators and administrators. They plan events, manage attendees and access, monitor live operations, and administer staff permissions from desktop and mobile web interfaces. Attendees also use public registration, pass, voting, and prize-acceptance flows, but those experiences are outside the first redesign scope.

## Product Purpose

EventPass manages the operational lifecycle of an event: creating and publishing events, registering attendees, issuing QR passes, checking people in, running raffles and voting, monitoring communications, and administering staff access. Success means an operator can understand an event's state quickly and complete time-sensitive work with confidence.

## Positioning

EventPass brings planning, attendee access, live-event operations, engagement activities, and permission-aware administration into one event workspace instead of splitting them across unrelated tools.

## Operating Context

Operators work across planning periods and live event environments. The system supports quick scanning at check-in, high-attention raffle and voting operations, bulk attendee and CSV workflows, display pairing, email delivery monitoring, and security-sensitive account and permission administration.

## Capabilities and Constraints

- The application is a Next.js web product backed by Prisma and SQLite.
- Existing dashboard and administration functionality, routes, permissions, data, and workflows must be preserved during the redesign.
- Access is permission-aware, with role permissions, per-user overrides, audit logging, and protected administrative mutations.
- The first redesign phase covers the authenticated dashboard and administration experience. Public registration, attendee passes, public voting, and prize acceptance remain unchanged.
- The interface must remain responsive for desktop and mobile web use, including live-event operational contexts.

## Brand Commitments

The product name is EventPass. Organization branding data and event imagery are functional content and must remain supported. No existing visual treatment is binding for the dashboard redesign.

For dashboard and administration surfaces, use a familiar modern product-dashboard structure with spacious hierarchy, modular data composition, and crisp borders. The color system is almost monochrome: Alabaster `#F0EBE5`, warm ink neutrals, Spanish Orange `#F4680A`, and Royal Orange `#F99D45`. Orange is reserved for actions, selection, and important state; no other chromatic status palette is used. Dark mode uses warm near-black neutrals with the same orange roles. Do not use gradients. The supplied dashboard references establish the expected craft level and clarity, not a layout or palette to copy.

## Evidence on Hand

- Product and deployment behavior are documented in `README.md`.
- Account, permission, and security behavior are documented in `ADMIN_RBAC.md`.
- The Prisma schema defines the operational data model in `prisma/schema.prisma`.
- Existing dashboard routes and components provide the factual workflows and states to preserve.
- Seed data provides realistic local demonstration content. No customer claims, testimonials, or performance benchmarks are available and none should be fabricated.

## Product Principles

- Make the current event state legible before exposing configuration detail.
- Keep urgent live-event actions fast, explicit, and difficult to trigger accidentally.
- Preserve operator confidence with clear status, feedback, permissions, and auditability.
- Let one connected event workspace replace fragmented operational tools.
- Keep infrequent administration discoverable without competing with daily event work.

## Accessibility & Inclusion

The dashboard must support keyboard navigation, visible focus, reduced motion, readable contrast, semantic controls, and responsive layouts without withholding core functionality by device size.
