import { useRef } from "react";
import { Search, X } from "lucide-react";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Nhãn cho trình đọc màn hình, ví dụ "Tìm kiếm đối tác". */
  label: string;
  /** Class của khung ngoài; mặc định là độ rộng chuẩn của thanh công cụ admin. */
  className?: string;
};

/** Ô tìm kiếm chuẩn của admin: icon kính lúp, nút xóa khi có chữ. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className = "min-w-[240px] flex-1 sm:max-w-xs",
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={`relative ${className}`}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref={inputRef}
        type="text"
        className="h-9 w-full rounded-xl border border-input bg-card pl-9 pr-8 text-xs text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        placeholder={placeholder}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          aria-label="Xóa nội dung tìm kiếm"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
