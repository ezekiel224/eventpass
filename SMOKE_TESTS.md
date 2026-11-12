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
- Open the public registration page and register an attendee.
- Edit an attendee, toggle VIP, export CSV, and import the CSV template.
- Send a pass email and open the attendee pass.

## Check-in

- Check in with a QR code and with a fallback code.
- Scan the same pass twice and confirm duplicate handling remains visible.
- Scan the same pass on two devices at nearly the same moment and confirm exactly one admission and one duplicate.
- Run multiple scanners on the same venue network and confirm they do not share a device rate-limit bucket.
- Open the live check-in display and confirm new scans appear.
- Clear the live display, scan another pass, and confirm the new arrival appears immediately.
- Open complete history, search for an attendee and guest, and load another page of results when available.

## Raffles and prize receipts

- Allocate tickets, assign entries, draw a winner, and reroll only after confirmation.
- Open the secure winner link, acknowledge the tax language, and sign.
- Confirm the prize changes from Pending to Signed.
- Download the Excel workbook and confirm the legal template, funding selection, values, signatures, dates, and total formula.

## Branding and responsive layout

- Change branding colors and confirm dashboard and public pages update.
- Check dashboard navigation, forms, tables, pass, registration, and signing pages at mobile and desktop widths.
