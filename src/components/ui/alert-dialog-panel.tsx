"use client";

import type { ReactNode } from "react";
import { AlertDialog } from "tamagui";
import "./tamagui-overlays.css";

export function AlertDialogPanel({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
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
          className="ep-confirm-dialog-content ep-alert-dialog-panel"
          animation="medium"
          opacity="enter:0 exit:0"
          scale="enter:0.96 exit:0.98"
          y="enter:12px exit:8px"
        >
          <div className="ep-alert-dialog-heading">
            <AlertDialog.Title fontSize="6" lineHeight="6" fontWeight="800" letterSpacing={-0.32}>
              {title}
            </AlertDialog.Title>
            <AlertDialog.Description color="color-10" fontSize="3" lineHeight="4">
              {description}
            </AlertDialog.Description>
          </div>
          <div className="ep-alert-dialog-body">{children}</div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog>
  );
}
