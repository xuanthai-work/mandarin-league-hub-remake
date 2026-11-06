import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminTable, AdminTableRow, type AdminColumn } from "./AdminTable";

describe("AdminTable", () => {
  const baseColumns: AdminColumn[] = [
    { key: "name", label: "Tên đối tác", className: "w-[40%]" },
    { key: "category", label: "Phân loại", className: "w-[30%]" },
    { key: "actions", label: "Thao tác", srOnly: true, className: "w-20 text-right" },
  ];

  it("renders column headers with scope='col', proper classes, and srOnly labels", () => {
    const columnsWithElement: AdminColumn[] = [
      {
        key: "select",
        label: <input type="checkbox" aria-label="Chọn tất cả" />,
        className: "w-10",
      },
      ...baseColumns,
    ];

    const { container } = render(<AdminTable columns={columnsWithElement} />);

    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(4);
    headers.forEach((th) => {
      expect(th).toHaveAttribute("scope", "col");
    });

    expect(screen.getByRole("checkbox", { name: "Chọn tất cả" })).toBeInTheDocument();
    expect(screen.getByText("Tên đối tác")).toBeInTheDocument();
    expect(screen.getByText("Phân loại")).toBeInTheDocument();

    const actionsTh = headers[3];
    expect(actionsTh).toHaveClass("w-20", "text-right");
    const srOnlySpan = actionsTh?.querySelector(".sr-only");
    expect(srOnlySpan).toBeInTheDocument();
    expect(srOnlySpan?.textContent).toBe("Thao tác");

    expect(container.querySelector("th.w-\\[40\\%\\]")).toBeInTheDocument();
  });

  it("applies min-w-[720px] by default and custom minWidth when provided", () => {
    const { container, rerender } = render(<AdminTable columns={baseColumns} />);
    const table = container.querySelector("table");
    expect(table).toHaveClass("min-w-[720px]");

    rerender(<AdminTable columns={baseColumns} minWidth="min-w-[1050px]" />);
    const updatedTable = container.querySelector("table");
    expect(updatedTable).toHaveClass("min-w-[1050px]");
    expect(updatedTable).not.toHaveClass("min-w-[720px]");
  });

  it("renders empty state with default and custom emptyMessage when isEmpty is true", () => {
    const { rerender } = render(
      <AdminTable columns={baseColumns} isEmpty>
        <AdminTableRow>
          <td>Dữ liệu không nên hiển thị</td>
        </AdminTableRow>
      </AdminTable>,
    );

    const emptyCell = screen.getByRole("cell");
    expect(emptyCell).toHaveAttribute("colSpan", "3");
    expect(emptyCell).toHaveTextContent("Không có dữ liệu.");
    expect(screen.queryByText("Dữ liệu không nên hiển thị")).not.toBeInTheDocument();

    rerender(
      <AdminTable columns={baseColumns} isEmpty emptyMessage="Danh sách trống.">
        <AdminTableRow>
          <td>Dữ liệu không nên hiển thị</td>
        </AdminTableRow>
      </AdminTable>,
    );
    expect(screen.getByText("Danh sách trống.")).toBeInTheDocument();
  });

  it("binds bodyRef to TBODY element", () => {
    const ref = createRef<HTMLTableSectionElement>();
    render(<AdminTable columns={baseColumns} bodyRef={ref} />);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe("TBODY");
  });
});

describe("AdminTableRow", () => {
  it("handles onOpen with click, Enter, Space and ignores interactive children", () => {
    const onOpen = vi.fn();
    const { container } = render(
      <table>
        <tbody>
          <AdminTableRow onOpen={onOpen}>
            <td className="p-3">
              <span>Hàng 1</span>
            </td>
            <td className="p-3">
              <input type="checkbox" aria-label="Chọn hàng" />
            </td>
            <td className="p-3">
              <button type="button">Sửa</button>
            </td>
            <td className="p-3">
              <a href="#test">Chi tiết</a>
            </td>
          </AdminTableRow>
        </tbody>
      </table>,
    );

    const row = container.querySelector("tr")!;
    expect(row).toHaveAttribute("tabindex", "0");
    expect(row).toHaveClass("cursor-pointer");

    // Click on normal cell content
    fireEvent.click(screen.getByText("Hàng 1"));
    expect(onOpen).toHaveBeenCalledTimes(1);

    // KeyDown on the row itself
    fireEvent.keyDown(row, { key: "Enter" });
    expect(onOpen).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(row, { key: " " });
    expect(onOpen).toHaveBeenCalledTimes(3);

    // KeyDown on button inside the row should NOT trigger onOpen
    const button = screen.getByRole("button", { name: "Sửa" });
    fireEvent.keyDown(button, { key: "Enter" });
    expect(onOpen).toHaveBeenCalledTimes(3);

    // Click on button inside the row should NOT trigger onOpen
    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalledTimes(3);

    // Click on checkbox inside the row should NOT trigger onOpen
    const checkbox = screen.getByRole("checkbox", { name: "Chọn hàng" });
    fireEvent.click(checkbox);
    expect(onOpen).toHaveBeenCalledTimes(3);

    // Click on anchor link inside the row should NOT trigger onOpen
    const link = screen.getByRole("link", { name: "Chi tiết" });
    fireEvent.click(link);
    expect(onOpen).toHaveBeenCalledTimes(3);
  });

  it("renders static row without tabIndex or cursor-pointer when onOpen is omitted", () => {
    const { container } = render(
      <table>
        <tbody>
          <AdminTableRow>
            <td className="p-3">Hàng tĩnh</td>
          </AdminTableRow>
        </tbody>
      </table>,
    );

    const row = container.querySelector("tr")!;
    expect(row).not.toHaveAttribute("tabindex");
    expect(row).not.toHaveClass("cursor-pointer");
  });
});
