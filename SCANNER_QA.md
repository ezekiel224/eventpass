# EventPass scanner device QA

Run this checklist on every Android model that will be used at the venue, using the production HTTPS URL and the venue Wi-Fi.

## Install and display

- Open `/scan`, install the PWA, and launch it from the home screen.
- Confirm the scanner occupies the full screen with no browser chrome and no page scrolling.
- Confirm the event remains selected after closing and reopening the app.
- Confirm safe-area spacing does not cover controls on devices with a notch or camera cutout.

## Camera

- Grant camera access and confirm a rear-facing lens is selected by default.
- If the device exposes multiple rear lenses, switch lenses and confirm each preview works.
- Scan at approximately 20 cm, 40 cm, and 80 cm; confirm focus recovers without restarting.
- Wipe and partially obscure the lens to confirm staff can recognize a bad image.
- Test normal room light, a dim doorway, and glare from a bright phone screen.
- Rotate the device and confirm the portrait scanner remains usable.

## Check-in outcomes

- Valid pass: green confirmation and one persisted check-in.
- Same pass again: amber duplicate warning and no second check-in.
- Guest requiring age review: amber warning with the age-check message.
- Invalid, revoked, or wrong-event pass: red rejection.
- Enable Test mode, scan a valid pass, and confirm no check-in is persisted.
- Enter a fallback code and select a guest from attendee search.

## Raffle mode

- Scan a guest and confirm the available ticket balance.
- Allocate tickets across multiple prizes, save, reload the guest, and confirm the allocation persists.
- Confirm the UI prevents allocating more than the guest's available balance.
- Confirm Test mode prevents raffle changes from being saved.

## Network and power

- Disable Wi-Fi and cellular data; confirm the scanner clearly reports offline and blocks writes.
- On a throttled or weak venue connection, confirm the operator receives an error instead of an ambiguous success.
- Reconnect and confirm scanning resumes without reinstalling or signing in again.
- Confirm the status panel reports the connection type where supported.
- Test below 20% battery and while charging; confirm the status panel remains legible.
- Run a continuous 30-minute scan session and check battery drain, heat, camera stability, and session validity.

Record the device model, Android version, browser version, chosen rear lens, and any failure for each test run.
