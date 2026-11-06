import type { ReactNode } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type SegmentedOption<T extends string> = { value: T; label: ReactNode };

type SegmentedControlProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  /** Tên nhóm cho trình đọc màn hình, ví dụ "Chế độ soạn bài". */
  label: string;
  className?: string;
};

/** Nút gạt phân đoạn chuẩn của admin (chọn đúng 1 trong vài lựa chọn). */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className = "",
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v as T); // Radix trả "" khi bấm lại mục đang chọn: bỏ qua để luôn có 1 mục được chọn
      }}
      aria-label={label}
      className={`inline-flex gap-0 rounded-lg border border-border bg-muted/50 p-1 ${className}`}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="h-auto min-w-0 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=on]:bg-background data-[state=on]:font-semibold data-[state=on]:text-foreground data-[state=on]:shadow-2xs"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
