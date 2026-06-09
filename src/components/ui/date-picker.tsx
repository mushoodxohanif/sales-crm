"use client";

import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

function parseDateValue(value: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  required = false,
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseDateValue(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon />
          {selected ? format(selected, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date: Date | undefined) => {
            if (!date) {
              onChange("");
              return;
            }

            onChange(format(date, "yyyy-MM-dd"));
            setOpen(false);
          }}
          required={required}
        />
      </PopoverContent>
    </Popover>
  );
}
