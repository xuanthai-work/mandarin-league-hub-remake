import { useState } from "react";
import { vi } from "react-day-picker/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseDob } from "@/lib/recruitment";

const pad = (n: number) => String(n).padStart(2, "0");

/** Popup date-of-birth picker with quick month/year dropdowns; value is DD/MM/YYYY. */
export function DobPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const iso = parseDob(value);
  const selected = iso ? new Date(iso + "T00:00:00") : undefined;
  const today = new Date();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            className,
            "flex items-center gap-2 text-left",
            !selected && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-gold" />
          {selected ? value : "Chọn ngày tháng năm sinh"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={vi}
          captionLayout="dropdown"
          startMonth={new Date(1940, 0)}
          endMonth={today}
          defaultMonth={selected ?? new Date(2004, 0)}
          disabled={{ after: today }}
          selected={selected}
          onSelect={(d) => {
            if (!d) return;
            onChange(`${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`);
            setOpen(false);
          }}
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
