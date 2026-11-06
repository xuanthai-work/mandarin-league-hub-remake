import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PartnerDrawer, type PartnerForm } from "./PartnerDrawer";

const baseValue: PartnerForm = {
  name: "Đối tác Test",
  category: "Doanh nghiệp",
  field: "Công nghệ",
  description: "Mô tả",
  logo_path: "",
  website_url: "https://example.com",
  sort_order: 1,
  is_active: true,
};

describe("PartnerDrawer", () => {
  it("renders new partner form without danger zone", () => {
    render(
      <PartnerDrawer
        value={baseValue}
        logoPreview={null}
        positions={[{ value: 1, occupant: null }]}
        uploading={false}
        saving={false}
        onChange={() => {}}
        onUpload={() => {}}
        onClearLogo={() => {}}
        onSave={() => {}}
        onDelete={undefined}
        onClose={() => {}}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Thêm đối tác mới" })).toBeInTheDocument();
    expect(screen.getByText("Đang hiển thị")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tạo đối tác" })).toBeInTheDocument();
    expect(screen.queryByText("Vùng nguy hiểm")).not.toBeInTheDocument();
  });

  it("renders edit partner with DangerZone and handles delete confirm", () => {
    const onDelete = vi.fn();
    render(
      <PartnerDrawer
        value={{ ...baseValue, id: "p-1", is_active: false }}
        logoPreview="https://example.com/logo.png"
        positions={[{ value: 1, occupant: null }]}
        uploading={false}
        saving={false}
        onChange={() => {}}
        onUpload={() => {}}
        onClearLogo={() => {}}
        onSave={() => {}}
        onDelete={onDelete}
        onClose={() => {}}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Sửa đối tác" })).toBeInTheDocument();
    expect(screen.getByText("Đang ẩn")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lưu thay đổi" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gỡ logo" })).toBeInTheDocument();

    // Danger zone flow
    expect(screen.getByText("Vùng nguy hiểm")).toBeInTheDocument();
    const deleteBtn = screen.getByRole("button", { name: "Xóa đối tác" });
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole("button", { name: "Xác nhận xóa" });
    fireEvent.click(confirmBtn);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
