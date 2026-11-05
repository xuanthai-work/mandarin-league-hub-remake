import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { matchesSearch } from "@/lib/search";
import { cn } from "@/lib/utils";

export type MemberOption = { id: string; full_name: string; member_code: string };

const NONE_VALUE = "__none__";

type MemberComboboxProps = {
  members: MemberOption[];
  value: string | null;
  onChange: (memberId: string | null) => void;
  id?: string;
  noneLabel?: string;
  placeholder?: string;
  className?: string;
};

export function MemberCombobox({
  members,
  value,
  onChange,
  id,
  noneLabel = "— Người nhận bên ngoài —",
  placeholder = "Tìm theo tên hoặc mã thành viên…",
  className,
}: MemberComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = members.find((m) => m.id === value) ?? null;
  const filtered = useMemo(
    () => members.filter((m) => matchesSearch(`${m.full_name} ${m.member_code}`, query)),
    [members, query],
  );

  const pick = (memberId: string | null) => {
    onChange(memberId);
    setQuery("");
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          id={id}
          aria-expanded={open}
          data-empty={!selected}
          className={cn(
            "h-9 w-full cursor-pointer justify-between gap-2 rounded-xl border-input bg-background px-3 text-left text-xs font-normal shadow-xs hover:bg-accent/50 data-[empty=true]:text-muted-foreground",
            className,
          )}
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-foreground">{selected.full_name}</span>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {selected.member_code}
              </span>
            </span>
          ) : (
            <span className="truncate">{noneLabel}</span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="z-[90] w-[var(--radix-popover-trigger-width)] min-w-64 overflow-hidden rounded-xl border border-border bg-popover p-0 shadow-2xl"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={placeholder}
            className="h-9 text-xs"
          />
          <CommandList className="custom-scrollbar max-h-64">
            <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
              Không tìm thấy thành viên phù hợp.
            </CommandEmpty>
            <CommandGroup>
              {!query.trim() && (
                <CommandItem
                  value={NONE_VALUE}
                  onSelect={() => pick(null)}
                  className="cursor-pointer text-xs text-muted-foreground"
                >
                  <Check className={cn("h-3.5 w-3.5", selected ? "opacity-0" : "opacity-100")} />
                  {noneLabel}
                </CommandItem>
              )}
              {filtered.map((m) => (
                <CommandItem
                  key={m.id}
                  value={m.id}
                  onSelect={() => pick(m.id)}
                  className="cursor-pointer text-xs"
                >
                  <Check
                    className={cn("h-3.5 w-3.5", m.id === value ? "opacity-100" : "opacity-0")}
                  />
                  <span className="min-w-0 flex-1 truncate">{m.full_name}</span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {m.member_code}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
