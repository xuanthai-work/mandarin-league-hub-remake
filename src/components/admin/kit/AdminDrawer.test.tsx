import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminDrawer } from "./AdminDrawer";

describe("AdminDrawer", () => {
  it("renders dialog with accessible name and aria-modal='true'", () => {
    render(
      <AdminDrawer title="Thêm đối tác" onClose={() => {}}>
        <p>Nội dung</p>
      </AdminDrawer>,
    );

    const dialog = screen.getByRole("dialog", { name: "Thêm đối tác" });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Nội dung")).toBeInTheDocument();
  });

  it("renders subtitle, leading, and footer when provided, and omits footer when not provided", () => {
    const { rerender, container } = render(
      <AdminDrawer
        title="Đối tác A"
        subtitle="Chi tiết thông tin"
        leading={<span data-testid="leading-icon">Icon</span>}
        footer={<button type="button">Lưu thay đổi</button>}
        onClose={() => {}}
      >
        <p>Body</p>
      </AdminDrawer>,
    );

    expect(screen.getByText("Chi tiết thông tin")).toBeInTheDocument();
    expect(screen.getByTestId("leading-icon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lưu thay đổi" })).toBeInTheDocument();

    rerender(
      <AdminDrawer title="Đối tác A" onClose={() => {}}>
        <p>Body</p>
      </AdminDrawer>,
    );
    expect(screen.queryByText("Chi tiết thông tin")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lưu thay đổi" })).not.toBeInTheDocument();
    expect(container.querySelector(".border-t")).not.toBeInTheDocument();
  });

  it("calls onClose when clicking close button or clicking overlay", () => {
    const onClose = vi.fn();
    const { container } = render(
      <AdminDrawer title="Tiêu đề" onClose={onClose}>
        Body
      </AdminDrawer>,
    );

    const closeBtn = screen.getByRole("button", { name: "Đóng" });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    const overlay = container.querySelector('[data-slot="drawer-overlay"]')!;
    expect(overlay).toBeInTheDocument();
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("calls onClose when pressing Escape key on window", () => {
    const onClose = vi.fn();
    render(
      <AdminDrawer title="Tiêu đề" onClose={onClose}>
        Body
      </AdminDrawer>,
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when Escape event was defaultPrevented by child layer", () => {
    const onClose = vi.fn();
    render(
      <AdminDrawer title="Tiêu đề" onClose={onClose}>
        Body
      </AdminDrawer>,
    );

    const preventHandler = (e: KeyboardEvent) => e.preventDefault();
    document.addEventListener("keydown", preventHandler, { capture: true });
    try {
      fireEvent.keyDown(document, { key: "Escape", cancelable: true });
      expect(onClose).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener("keydown", preventHandler, {
        capture: true,
      });
    }
  });

  it("does not call onClose on Escape key after unmount", () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <AdminDrawer title="Tiêu đề" onClose={onClose}>
        Body
      </AdminDrawer>,
    );

    unmount();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("applies width='lg' with max-w-[640px], and defaults to max-w-[560px]", () => {
    const { rerender } = render(
      <AdminDrawer title="Drawer default" onClose={() => {}}>
        Body
      </AdminDrawer>,
    );
    const defaultDialog = screen.getByRole("dialog", {
      name: "Drawer default",
    });
    expect(defaultDialog.className).toContain("max-w-[560px]");

    rerender(
      <AdminDrawer title="Drawer lg" width="lg" onClose={() => {}}>
        Body
      </AdminDrawer>,
    );
    const lgDialog = screen.getByRole("dialog", { name: "Drawer lg" });
    expect(lgDialog.className).toContain("max-w-[640px]");
  });

  it("wraps body and footer in <form> when onSubmit is provided", () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    const { container, rerender } = render(
      <AdminDrawer
        title="Form Drawer"
        onClose={() => {}}
        onSubmit={onSubmit}
        footer={<button type="submit">Submit</button>}
      >
        <input name="test" defaultValue="value" />
      </AdminDrawer>,
    );

    const form = container.querySelector("form");
    expect(form).toBeInTheDocument();
    const submitBtn = screen.getByRole("button", { name: "Submit" });
    expect(form).toContainElement(submitBtn);

    fireEvent.submit(form!);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    rerender(
      <AdminDrawer
        title="No Form Drawer"
        onClose={() => {}}
        footer={<button type="button">Action</button>}
      >
        Body
      </AdminDrawer>,
    );
    expect(container.querySelector("form")).toBeNull();
  });

  it("manages focus on mount and unmount", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Mở";
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { unmount } = render(
      <AdminDrawer title="Focus Drawer" onClose={() => {}}>
        Body
      </AdminDrawer>,
    );

    const dialog = screen.getByRole("dialog", { name: "Focus Drawer" });
    expect(document.activeElement).toBe(dialog);

    unmount();
    expect(document.activeElement).toBe(trigger);

    document.body.removeChild(trigger);
  });
});
