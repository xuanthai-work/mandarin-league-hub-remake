import { useId, type ReactNode } from "react";

export type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
};

export type FormFieldProps = {
  label: ReactNode;
  /** Hiện dấu * đỏ và truyền aria-required. Ô nhập vẫn tự đặt `required` nếu cần chặn submit. */
  required?: boolean;
  /** Gợi ý nhỏ dưới ô nhập. */
  hint?: ReactNode;
  /** Thông báo lỗi; có thì ô nhập nhận aria-invalid. */
  error?: ReactNode;
  /** Class cho khung ngoài, ví dụ "sm:col-span-2". */
  className?: string;
  children: (field: FieldControlProps) => ReactNode;
};

/**
 * Khung trường nhập chuẩn của admin: nhãn, ô nhập, gợi ý và lỗi, tự nối id và các thuộc tính a11y.
 *
 * @example
 * <FormField label="Tên đối tác" required error={errors.name}>
 *   {(field) => <AdminInput {...field} value={name} onChange={(e) => setName(e.target.value)} />}
 * </FormField>
 *
 * <FormField label="Phân loại">
 *   {(field) => (
 *     <Select value={cat} onValueChange={setCat}>
 *       <SelectTrigger {...field} className="h-9 w-full rounded-lg text-sm">…</SelectTrigger>
 *       …
 *     </Select>
 *   )}
 * </FormField>
 */
export function FormField({
  label,
  required = false,
  hint,
  error,
  className = "",
  children,
}: FormFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs font-medium text-muted-foreground">
        {label}
        {required && (
          <span aria-hidden className="text-destructive">
            {" "}
            *
          </span>
        )}
      </label>
      <div className="mt-1">
        {children({
          id,
          ...(describedBy ? { "aria-describedby": describedBy } : {}),
          ...(error ? { "aria-invalid": true as const } : {}),
          ...(required ? { "aria-required": true as const } : {}),
        })}
      </div>
      {hint && (
        <p id={hintId} className="mt-1 text-[11px] text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-[11px] font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
