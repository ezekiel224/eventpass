"use client";

import { Check, ChevronDown } from "lucide-react";
import { Select, Sheet } from "tamagui";
import "./operation-select.css";

export type OperationSelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

export function OperationSelect({
  value,
  onValueChange,
  options,
  label,
  placeholder = "Choose an option",
  disabled = false,
  compact = false,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: OperationSelectOption[];
  label: string;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <Select value={value} onValueChange={onValueChange} size={compact ? "md" : "lg"} zIndex={120_000}>
      <Select.Trigger className="ep-operation-select" aria-label={label} disabled={disabled}>
        <Select.Value placeholder={placeholder}>{selectedLabel}</Select.Value>
        <Select.Icon><ChevronDown size={15} /></Select.Icon>
      </Select.Trigger>

      <Select.Adapt when="max-sm">
        <Sheet modal dismissOnSnapToBottom snapPoints={[58]} transition="medium">
          <Sheet.Overlay className="ep-nav-displacing-overlay" animation="quick" opacity="enter:0 exit:0" />
          <Sheet.Handle />
          <Sheet.Container className="ep-operation-select-sheet" padding="2">
            <Sheet.Background className="ep-operation-select-sheet-background" />
            <Sheet.ScrollView padding="2">
              <Select.Adapt.Contents />
            </Sheet.ScrollView>
          </Sheet.Container>
        </Sheet>
      </Select.Adapt>

      <Select.Content>
        <Select.ScrollUpButton />
        <Select.Viewport className="ep-operation-select-viewport ep-nav-displacing-overlay" minWidth={240}>
          <Select.Group>
            <Select.Label className="ep-operation-select-label">{label}</Select.Label>
            {options.map((option) => (
              <Select.Item className="ep-operation-select-item" key={option.value} value={option.value} disabled={option.disabled}>
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator><Check size={14} /></Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Group>
        </Select.Viewport>
        <Select.ScrollDownButton />
      </Select.Content>
    </Select>
  );
}
