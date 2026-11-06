import type { KeyboardEvent, MouseEvent, ReactNode, Ref } from "react";

export type AdminColumn = {
  /** Khóa React; mặc định là label nếu label là chuỗi, ngược lại là chỉ số cột. */
  key?: string;
  /** Chuỗi, hoặc phần tử như Checkbox "chọn tất cả". */
  label: ReactNode;
  /** Độ rộng / căn lề của cột, ví dụ "w-[15%]", "w-10", "text-right". */
  className?: string;
  /** Ẩn chữ tiêu đề với mắt thường nhưng vẫn đọc được (cột thao tác, cột chọn). */
  srOnly?: boolean;
};

export type AdminTableProps = {
  columns: AdminColumn[];
  /** Class độ rộng tối thiểu, viết nguyên chuỗi để Tailwind quét được, ví dụ "min-w-[860px]". Mặc định "min-w-[720px]". */
  minWidth?: string;
  /** true thì thay phần thân bằng một dòng thông báo trống trải hết các cột. */
  isEmpty?: boolean;
  emptyMessage?: ReactNode; // mặc định "Không có dữ liệu."
  /** Ref cho <tbody>, ví dụ để dùng useAutoAnimate như trang Thành viên. */
  bodyRef?: Ref<HTMLTableSectionElement>;
  /** Class thêm cho khung ngoài, ví dụ "mt-4" hoặc "hidden md:block". */
  className?: string;
  children?: ReactNode; // các <AdminTableRow>
};

export type AdminTableRowProps = {
  /** Có thì cả dòng bấm được (chuột, Enter, Space) để mở chi tiết. */
  onOpen?: () => void;
  className?: string;
  children: ReactNode; // các <td className="p-3 …">
};

const INTERACTIVE =
  "a,button,input,select,textarea,label,[role='checkbox'],[role='switch'],[role='combobox']";

/**
 * Khung bảng chuẩn của admin: bo góc xl, viền border, thead nền secondary/30, cuộn ngang mượt.
 * Ô trong thân bảng dùng `<td className="p-3">`, chữ phụ `text-xs text-muted-foreground`.
 * Trang không cần `stopPropagation` trên checkbox hay nút trong dòng nữa (AdminTableRow tự lọc).
 *
 * @example
 * const columns: AdminColumn[] = [
 *   { key: "select", label: <input type="checkbox" aria-label="Chọn tất cả" />, className: "w-10" },
 *   { key: "title", label: "Tiêu đề" },
 *   { key: "actions", label: "Thao tác", srOnly: true, className: "w-20 text-right" },
 * ];
 *
 * <AdminTable columns={columns} minWidth="min-w-[800px]" isEmpty={items.length === 0}>
 *   {items.map((item) => (
 *     <AdminTableRow key={item.id} onOpen={() => setEdit(item)}>
 *       <td className="p-3"><input type="checkbox" /></td>
 *       <td className="p-3 font-medium">{item.title}</td>
 *       <td className="p-3 text-right"><button type="button">Sửa</button></td>
 *     </AdminTableRow>
 *   ))}
 * </AdminTable>
 */
export function AdminTable({
  columns,
  minWidth = "min-w-[720px]",
  isEmpty = false,
  emptyMessage = "Không có dữ liệu.",
  bodyRef,
  className = "",
  children,
}: AdminTableProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-border bg-card shadow-xs ${className}`.trim()}
    >
      <div className="custom-scrollbar overflow-x-auto">
        <table className={`w-full ${minWidth} table-fixed text-sm`}>
          <thead className="border-b border-border/60 bg-secondary/30 text-left text-xs text-muted-foreground">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={col.key ?? (typeof col.label === "string" ? col.label : String(i))}
                  scope="col"
                  className={`p-3 font-semibold ${col.className ?? ""}`.trim()}
                >
                  {col.srOnly ? <span className="sr-only">{col.label}</span> : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody ref={bodyRef}>
            {isEmpty ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="p-6 text-center text-xs text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Dòng bảng admin: hỗ trợ mở drawer khi bấm chuột hoặc phím (Enter/Space), tự động bỏ qua phần tử tương tác. */
export function AdminTableRow({ onOpen, className = "", children }: AdminTableRowProps) {
  const handleClick = (e: MouseEvent<HTMLTableRowElement>) => {
    if (!onOpen) return;
    const hit = (e.target as HTMLElement).closest(INTERACTIVE);
    if (hit && e.currentTarget.contains(hit)) return;
    onOpen();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (!onOpen) return;
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  const interactiveClass = onOpen
    ? "cursor-pointer transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
    : "";

  return (
    <tr
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen ? handleClick : undefined}
      onKeyDown={onOpen ? handleKeyDown : undefined}
      className={`border-t border-border/60 ${interactiveClass} ${className}`.trim()}
    >
      {children}
    </tr>
  );
}
