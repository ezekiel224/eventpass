"use client";
import "./_confirm-dialog.css"

import { AlertDialog, Button } from "tamagui";
import "./tamagui-overlays.css";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  const Action = destructive ? AlertDialog.Destructive : AlertDialog.Action;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay
          className="ep-nav-displacing-overlay"
          animation="quick"
          backgroundColor="shadow-color"
          opacity="enter:0 exit:0"
        />
        <AlertDialog.Content
          className="ep-confirm-dialog-content"
          animation="medium"
          opacity="enter:0 exit:0"
          scale="enter:0.96 exit:0.98"
          y="enter:12px exit:8px"
        >
          <div className="is_View _f-2057920087 _g-924523017">
            <AlertDialog.Title fontSize="6" lineHeight="6" fontWeight="800" letterSpacing={-0.32}>
              {title}
            </AlertDialog.Title>
            <AlertDialog.Description asChild>
              <p className="is_Text font_body tm-paragraph _ff-163417665 _us-601593343 _ws-974065937 _fs-2127568095 _fw-333443377 _ls-888140088 _c-1455506574 _lh-95508613"  >{description}</p>
            </AlertDialog.Description>
          </div>
          <div className="is_View _f-27493358 _jc-1618422872 _g-924523017"  >
            <AlertDialog.Cancel asChild>
              <Button size="md" variant="outlined" aria-label="Cancel">Cancel</Button>
            </AlertDialog.Cancel>
            <Action asChild>
              <Button
                size="md"
                className={destructive ? undefined : "ep-confirm-primary-action"}
                aria-label={confirmLabel}
                backgroundColor={destructive ? "alert-500" : undefined}
                color={destructive ? "alert-950" : undefined}
                onPress={onConfirm}
              >
                {confirmLabel}
              </Button>
            </Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog>
  );
}
