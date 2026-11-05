import { useState } from "react";
import { vi } from "react-day-picker/locale";
import { ChevronDownIcon } from "lucide-react";
import type { Matcher } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DatePickerProps {
  /** ISO `YYYY-MM-DD` (the format Postgres `date` columns use). */
  value?: string;
  onChange: (dateISO: string) => void;
  /** ISO `YYYY-MM-DD` — days before this are disabled. */
  min?: string;
  /** ISO `YYYY-MM-DD` — days after this are disabled. */
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** Show a footer button that clears the date (onChange receives ""). Off by default. */
  clearable?: boolean;
  /** Label of the clear button. */
  clearLabel?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO `YYYY-MM-DD` → Date at local midnight, so the label never drifts a day. */
function parseISO(value?: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

const toISO = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const toDisplay = (date: Date) =>
  `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

/**
 * Shadcn/UI date picker: an outline button trigger showing `DD/MM/YYYY` plus a
 * popover calendar (react-day-picker, Vietnamese locale) that reports ISO
 * `YYYY-MM-DD`.
 */
export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "Chọn ngày",
  disabled,
  className,
  id,
  clearable = false,
  clearLabel = "Xóa ngày",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseISO(value);
  const fromDate = parseISO(min);
  const toDate = parseISO(max);

  const matchers: Matcher[] = [];
  if (fromDate) matchers.push({ before: fromDate });
  if (toDate) matchers.push({ after: toDate });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          disabled={disabled}
          data-empty={!selectedDate}
          className={cn(
            "h-9 w-full justify-between rounded-xl px-3 text-left text-xs font-normal shadow-xs border-input bg-transparent hover:bg-accent/50 cursor-pointer data-[empty=true]:text-muted-foreground",
            className,
          )}
        >
          {selectedDate ? toDisplay(selectedDate) : <span>{placeholder || "Chọn ngày"}</span>}
          <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        avoidCollisions
        className="z-[90] w-auto overflow-hidden rounded-xl border border-border bg-popover p-0 shadow-2xl"
      >
        <Calendar
          mode="single"
          locale={vi}
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) return;
            onChange(toISO(date));
            setOpen(false);
          }}
          defaultMonth={selectedDate ?? fromDate ?? new Date()}
          disabled={matchers}
          className="w-auto p-2.5 [--cell-size:2rem] [&_.rdp-caption_label]:text-xs [&_.rdp-day_button]:text-xs [&_.rdp-weekday]:text-[0.7rem]"
        />
        {clearable && selectedDate && (
          <div className="border-t border-border p-1.5">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {clearLabel}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
