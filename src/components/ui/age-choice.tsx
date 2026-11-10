"use client";

import { Check, X } from "lucide-react";
import { SizableText, XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "./age-choice.css";

type Under21Value = "" | "yes" | "no";

export function AgeChoice({ value, onChange, subject = "you", className }: {
  value: Under21Value;
  onChange: (value: Under21Value) => void;
  subject?: "you" | "attendee" | "guest" | "plus-one";
  className?: string;
}) {
  const question = subject === "you" ? "Are you 21 or older?" : `Is the ${subject} 21 or older?`;

  return (
    <YStack asChild gap="3" className={cn("ep-age-choice", className)}>
      <fieldset>
        <SizableText asChild fontSize="sm" fontWeight="700"><legend>{question}</legend></SizableText>
        <XStack gap="2" marginTop="3" flexWrap="wrap">
          <Button type="button" variant="secondary" aria-pressed={value === "no"} data-selected={value === "no" || undefined} onClick={() => onChange("no")} className="ep-age-choice-option"><Check aria-hidden="true" /> Yes, 21+</Button>
          <Button type="button" variant="secondary" aria-pressed={value === "yes"} data-selected={value === "yes" || undefined} data-age="minor" onClick={() => onChange("yes")} className="ep-age-choice-option"><X aria-hidden="true" /> No, under 21</Button>
        </XStack>
      </fieldset>
    </YStack>
  );
}
