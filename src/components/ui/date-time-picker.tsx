import { useEffect, useRef, useState } from "react";
import { vi } from "react-day-picker/locale";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  datePart,
  formatLocal,
  joinLocal,
  parseLocal,
  timePart,
  timeSlots,
  withSlot,
} from "@/lib/datetime-local";

export interface DateTimePickerProps {
  /** Local `YYYY-MM-DDTHH:mm` (the datetime-local format), or "". */
  value?: string;
  /** Receives a local `YYYY-MM-DDTHH:mm`, or "" when cleared. */
  onChange: (value: string) => void;
  /** Local `YYYY-MM-DDTHH:mm`: earlier days and earlier times on that day are disabled. */
  min?: string;
  /** Minutes between time slots. */
  minuteStep?: number;
  /** "HH:mm" used when a day is picked before any time. */
  defaultTime?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Show a footer button that clears the value (onChange receives ""). */
  clearable?: boolean;
  clearLabel?: string;
  className?: string;
  id?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Shadcn/UI date + time picker: an outline button trigger showing `DD/MM/YYYY · HH:mm`
 * plus one popover with a Vietnamese calendar and a column of time slots. Reads and
 * writes the same `YYYY-MM-DDTHH:mm` local string as `<input type="datetime-local">`.
 */
export function DateTimePicker({
  value,
  onChange,
  min,
  minuteStep = 15,
  defaultTime = "09:00",
  placeholder = "Chọn ngày giờ",
  disabled,
  clearable = false,
  clearLabel = "Xóa ngày giờ",
  className,
  id,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const day = datePart(value);
  const time = timePart(value);
  const selectedDay = parseLocal(value);
  const minDay = parseLocal(min);
  const slots = withSlot(timeSlots(minuteStep), time);

  const dayISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  /** Never emit a value earlier than `min`. */
  const clampToMin = (v: string) => (min && v < min ? min : v);

  /** Picking a day keeps the current time (or defaultTime) and leaves the popup open for the time. */
  const pickDay = (d: Date | undefined) => {
    if (!d) return;
    onChange(clampToMin(joinLocal(dayISO(d), time || defaultTime)));
  };

  /** Picking a time completes the value and closes the popup. */
  const pickTime = (t: string) => {
    const baseDay = day || datePart(min) || dayISO(new Date());
    onChange(clampToMin(joinLocal(baseDay, t)));
    setOpen(false);
  };

  /** Times before `min` on the same day as `min` are disabled. */
  const timeDisabled = (t: string) => {
    if (!min) return false;
    const baseDay = day || datePart(min);
    return baseDay === datePart(min) && t < timePart(min);
  };

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const list = listRef.current;
      const el = list?.querySelector<HTMLElement>('[data-selected="true"]');
      if (!list || !el) return;
      list.scrollTop = el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2;
      list.scrollLeft = el.offsetLeft - list.clientWidth / 2 + el.clientWidth / 2;
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          disabled={disabled}
          data-empty={!selectedDay}
          className={cn(
            "h-9 w-full justify-between rounded-xl px-3 text-left text-xs font-normal shadow-xs border-input bg-transparent hover:bg-accent/50 cursor-pointer data-[empty=true]:text-muted-foreground",
            className,
          )}
        >
          {selectedDay ? formatLocal(value) : <span>{placeholder}</span>}
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
        <div className="flex flex-col sm:flex-row">
          <Calendar
            mode="single"
            locale={vi}
            selected={selectedDay}
            onSelect={pickDay}
            defaultMonth={selectedDay ?? minDay ?? new Date()}
            disabled={minDay ? [{ before: minDay }] : []}
            className="w-auto p-2.5 [--cell-size:2rem] [&_.rdp-caption_label]:text-xs [&_.rdp-day_button]:text-xs [&_.rdp-weekday]:text-[0.7rem]"
          />
          <div className="w-0 min-w-full border-t border-border sm:w-[92px] sm:min-w-0 sm:border-t-0 sm:border-l">
            <p className="px-3 pt-2.5 pb-1.5 text-[11px] font-medium text-muted-foreground">Giờ</p>
            <div
              ref={listRef}
              className="custom-scrollbar relative flex gap-1 overflow-x-auto px-2 pb-2 sm:max-h-[252px] sm:flex-col sm:overflow-x-hidden sm:overflow-y-auto"
            >
              {slots.map((t) => (
                <button
                  key={t}
                  type="button"
                  data-selected={t === time}
                  disabled={timeDisabled(t)}
                  onClick={() => pickTime(t)}
                  className="shrink-0 cursor-pointer rounded-lg px-2.5 py-1.5 text-xs tabular-nums text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-35 data-[selected=true]:bg-primary data-[selected=true]:font-semibold data-[selected=true]:text-primary-foreground"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        {clearable && value && (
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
