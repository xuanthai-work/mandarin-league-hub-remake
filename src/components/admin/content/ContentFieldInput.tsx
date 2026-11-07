import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ContentField } from "@/lib/site-content-fields";

export interface ContentFieldInputProps {
  field: ContentField<string>;
  value: string;
  onChange: (v: string) => void;
  changed: boolean;
  error: string | null;
}

export function ContentFieldInput({
  field,
  value,
  onChange,
  changed,
  error,
}: ContentFieldInputProps) {
  const id = `field-${field.key}`;
  const isArea = field.kind === "area";
  const hasValue = value.trim().length > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="flex items-center gap-1.5 text-xs font-medium text-foreground"
        >
          <span>{field.label}</span>
          {changed && (
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-gold"
              aria-label="Có thay đổi chưa lưu"
            />
          )}
        </label>

        <div className="flex items-center gap-2">
          {!hasValue ? (
            field.fallback !== "" ? (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Mặc định
              </span>
            ) : (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Để trống = ẩn
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              <span>Đã sửa</span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onChange("")}
                aria-label="Dùng chữ mặc định"
                className="h-auto rounded p-0.5 text-primary/70 hover:bg-transparent hover:text-primary [&_svg]:size-3"
              >
                <RotateCcw aria-hidden />
              </Button>
            </span>
          )}

          <span className="text-[11px] text-muted-foreground tabular-nums">
            {value.length}/{field.max}
          </span>
        </div>
      </div>

      {isArea ? (
        <Textarea
          id={id}
          rows={3}
          maxLength={field.max}
          value={value}
          placeholder={!hasValue && field.fallback !== "" ? field.fallback : undefined}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          className={cn(error && "border-destructive focus-visible:ring-destructive")}
        />
      ) : (
        <Input
          id={id}
          type={field.kind === "email" ? "email" : "text"}
          maxLength={field.max}
          value={value}
          placeholder={!hasValue && field.fallback !== "" ? field.fallback : undefined}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          className={cn(error && "border-destructive focus-visible:ring-destructive")}
        />
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
