# Legacy UI inventory

This file tracks the styling and compatibility pieces that cannot be removed yet without changing an active workflow. New work should use Tamagui components and semantic theme tokens rather than adding consumers to this list.

## Completed migrations

- Add attendee and complete check-in history now use the shared Tamagui `Sheet`.
- Undo check-in, delete account, and delete client now use Tamagui `AlertDialog`.
- `LiquidModal` and its global styling have been removed.
- Historical pass-theme IDs now migrate to `minimal`; the editor and API no longer expose them.

## Replace next

### Liquid utility classes

Definitions: `src/app/globals.css`

- `liquid-card` and `liquid-lens` remain on `src/components/voting/public-voting-form.tsx`.
- `liquid-notice` remains on `src/components/dashboard/attendees-manager.tsx` and `src/components/dashboard/voting-form-builder.tsx`.
Replacement: Tamagui `YStack`/`Card`, themed icon containers, and shared notice/status components.

### Legacy panel aliases

Definitions: `src/app/globals.css`

- `control-panel` remains in attendee CSV import, check-in management, and voting CSV import.
- `surface-grid` remains on the check-in and raffle display pages.
- `precision-grid` remains in the authentication shell.

Replacement: shared Tamagui surface primitives. The two `*-grid` classes currently render no decorative grid, so they can disappear when those layouts are touched.

## Already Tamagui-backed

The compatibility imports below are safe to keep while callers migrate because their implementation is already Tamagui:

- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/confirm-dialog.tsx`
- `src/components/ui/alert-dialog-panel.tsx`
- `src/components/ui/preview-sheet.tsx`
- `src/components/ui/operation-select.tsx`
- `src/components/ui/date-picker-input.tsx`

They should not be counted as legacy styling even though they preserve the older import paths.
