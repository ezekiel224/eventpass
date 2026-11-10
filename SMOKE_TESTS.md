# EventPass smoke-test checklist

Run this checklist before and after structural cleanup or deployment changes.

## Automated baseline

```bash
npm run verify
```

This runs the strict ESLint configuration and a production Next.js build.

## Authentication and permissions

- Sign in with an active administrator and confirm the dashboard opens.
- Confirm a user only sees navigation allowed by their assigned permissions.
- Confirm sign out returns to the login screen.

## Events and attendees

- Create a draft event, publish it, duplicate it, and archive the duplicate.
- Open the registration builder and confirm the preview shows only name and attendee age as locked core questions before the ordered add-ons.
- Create and edit an event; confirm guest, menu, dietary, and work-center questions are absent and the Registration options section points operators to Registration forms.
- Add each registration preset and confirm Guest, Email, Phone, Work center, Menu, Dietary needs, and Accessibility render and map into the attendee record.
- Add select and multiselect options containing spaces and commas; save, reload, and confirm the text is preserved exactly.
- Register with the core-only form, then add Guest and custom required fields. Confirm guest age appears only when the Guest add-on is present and selected, and required choice validation is clear.
- Register without an Email field and confirm an immediate pass link appears without an email attempt. Confirm attendees cannot edit their own submission.
- Open an attendee and export registrations; confirm custom answers are visible to staff and included in the CSV.
- Remove a custom question after an attendee has answered it; confirm Rest of fields retains the original question label and stable ID. Confirm raw JSON shows the attendee record with QR and fallback pass credentials redacted.
- Edit an attendee, toggle VIP, export CSV, and import the CSV template.
- Send a pass email and open the attendee pass.

## Campaigns and formatted content

- Create an event and open Campaigns. Confirm a “Thank you for registering” automated message exists for that event and does not change another event’s message when edited.
- Customize the registration message subject, body, action label, and attendee/event variables. Register an attendee and resend the pass; confirm both emails use the event-specific saved version.
- Disable Email confirmations on an event and register with an email address; confirm the registration succeeds without an automatic email attempt. Re-enable it and confirm the next registration receives the message.
- Create a one-time campaign with bold text, a heading, a list, a safe link, and personalization variables. Compare Write and Preview, send it, and confirm the delivered email matches the preview.
- Format an event description and a prize description with the shared toolbar. Confirm formatting appears on public registration, raffle, and prize-acceptance surfaces in light and dark mode.
- Enter raw HTML and a `javascript:` Markdown link. Confirm HTML is shown as text and the unsafe link is not navigable.

## Check-in

- Check in with a QR code and with a fallback code.
- Scan the same pass twice and confirm duplicate handling remains visible.
- Open the live check-in display and confirm new scans appear.

## Raffles and prize receipts

- Allocate tickets, assign entries, draw a winner, and reroll only after confirmation.
- Open the secure winner link, acknowledge the tax language, and sign.
- Confirm the prize changes from Pending to Signed.
- Download the Excel workbook and confirm the legal template, funding selection, values, signatures, dates, and total formula.

## Branding and responsive layout

- Change branding colors and confirm dashboard and public pages update.
- Check dashboard navigation, forms, tables, pass, registration, and signing pages at mobile and desktop widths.
