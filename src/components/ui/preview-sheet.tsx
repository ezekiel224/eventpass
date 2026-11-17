"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button, Sheet } from "tamagui";
import "./preview-sheet.css";

export function PreviewSheet({
  open,
  onOpenChange,
  title,
  description,
  closeLabel = "Close preview",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  closeLabel?: string;
  children: ReactNode;
}) {
  const [position, setPosition] = useState(0);

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) setPosition(0);
        onOpenChange(nextOpen);
      }}
      position={position}
      onPositionChange={setPosition}
      snapPoints={[92]}
      snapPointsMode="percent"
      dismissOnSnapToBottom
      zIndex={130_000}
      transition="medium"
    >
      <Sheet.Overlay className="ep-nav-displacing-overlay" transition="medium" backgroundColor="shadow-6" opacity="enter:0 exit:0" />
      <Sheet.Handle backgroundColor="color-7" />
      <Sheet.Container className="ep-preview-sheet-container" flex={1}>
        <Sheet.Background />
        <div className="ep-preview-sheet-shell">
          <header className="ep-preview-sheet-header">
            <div className="ep-preview-sheet-copy">
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            <Button
              size="lg"
              circular
              variant="quiet"
              icon={ChevronDown}
              aria-label={closeLabel}
              onPress={() => onOpenChange(false)}
            />
          </header>
          <Sheet.ScrollView className="ep-preview-sheet-scroll" flex={1}>
            <div className="ep-preview-sheet-content">
              {children}
            </div>
          </Sheet.ScrollView>
        </div>
      </Sheet.Container>
    </Sheet>
  );
}
