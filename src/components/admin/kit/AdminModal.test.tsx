import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlusCircle } from "lucide-react";
import { AdminModal } from "./AdminModal";
import { AdminDrawer } from "./AdminDrawer";

describe("AdminModal", () => {
  it("renders accessible name, aria-modal='true', and accessible description when provided", () => {
    const { rerender } = render(
      <AdminModal title="Tiêu đề modal" description="Mô tả chi tiết" onClose={() => {}}>
        Nội dung
      </AdminModal>,
    );

    const dialog = screen.getByRole("dialog", { name: "Tiêu đề modal" });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("Mô tả chi tiết");

    rerender(
      <AdminModal title="Tiêu đề modal" onClose={() => {}}>
        Nội dung
      </AdminModal>,
    );
    expect(dialog).not.toHaveAttribute("aria-describedby");
  });

  it("renders icon with aria-hidden svg inside header", () => {
    const { container } = render(
      <AdminModal title="Có icon" icon={PlusCircle} onClose={() => {}}>
        Nội dung
      </AdminModal>,
    );

    const iconSpan = container.querySelector("header span.bg-primary\\/10");
    expect(iconSpan).toBeInTheDocument();
    const svg = iconSpan?.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("applies size classes: defaults to max-w-2xl and sm to max-w-md", () => {
    const { rerender } = render(
      <AdminModal title="Size test" onClose={() => {}}>
        Nội dung
      </AdminModal>,
    );
    let dialog = screen.getByRole("dialog", { name: "Size test" });
    expect(dialog).toHaveClass("max-w-2xl");

    rerender(
      <AdminModal title="Size test" size="sm" onClose={() => {}}>
        Nội dung
      </AdminModal>,
    );
    dialog = screen.getByRole("dialog", { name: "Size test" });
    expect(dialog).toHaveClass("max-w-md");
    expect(dialog).not.toHaveClass("max-w-2xl");
  });

  it("calls onClose when clicking close button, overlay, or pressing Escape", () => {
    const onClose = vi.fn();
    const { container } = render(
      <AdminModal title="Close test" onClose={onClose}>
        Nội dung
      </AdminModal>,
    );

    const closeBtn = screen.getByRole("button", { name: "Đóng" });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    const overlay = container.querySelector('[data-slot="modal-overlay"]')!;
    expect(overlay).toBeInTheDocument();
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("prevents close when dismissible={false}", () => {
    const onClose = vi.fn();
    const { container } = render(
      <AdminModal title="Busy modal" dismissible={false} onClose={onClose}>
        Nội dung
      </AdminModal>,
    );

    const closeBtn = screen.getByRole("button", { name: "Đóng" });
    expect(closeBtn).toBeDisabled();

    const overlay = container.querySelector('[data-slot="modal-overlay"]')!;
    fireEvent.click(overlay);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("manages dialog stack: Escape closes only topmost modal, then drawer after unmount", () => {
    const closeDrawer = vi.fn();
    const closeModal = vi.fn();

    function StackFixture({ showModal }: { showModal: boolean }) {
      return (
        <>
          <AdminDrawer title="Drawer Layer" onClose={closeDrawer}>
            Drawer Content
          </AdminDrawer>
          {showModal && (
            <AdminModal title="Modal Layer" onClose={closeModal}>
              Modal Content
            </AdminModal>
          )}
        </>
      );
    }

    const { rerender } = render(<StackFixture showModal={true} />);

    // Press Escape: only modal receives it
    fireEvent.keyDown(window, { key: "Escape" });
    expect(closeModal).toHaveBeenCalledTimes(1);
    expect(closeDrawer).not.toHaveBeenCalled();

    // Modal unmounts
    rerender(<StackFixture showModal={false} />);

    // Press Escape again: drawer receives it
    fireEvent.keyDown(window, { key: "Escape" });
    expect(closeDrawer).toHaveBeenCalledTimes(1);
  });

  it("blocks Escape from falling through to drawer when modal is busy (dismissible={false})", () => {
    const closeDrawer = vi.fn();
    const closeModal = vi.fn();

    render(
      <>
        <AdminDrawer title="Drawer Layer" onClose={closeDrawer}>
          Drawer Content
        </AdminDrawer>
        <AdminModal title="Busy Modal" dismissible={false} onClose={closeModal}>
          Modal Content
        </AdminModal>
      </>,
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(closeModal).not.toHaveBeenCalled();
    expect(closeDrawer).not.toHaveBeenCalled();
  });

  it("wraps content and footer in form when onSubmit is provided", () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    const { container } = render(
      <AdminModal
        title="Form Modal"
        onClose={() => {}}
        onSubmit={onSubmit}
        footer={<button type="submit">Lưu</button>}
      >
        <input name="test" defaultValue="val" />
      </AdminModal>,
    );

    const form = container.querySelector("form");
    expect(form).toBeInTheDocument();
    const submitBtn = screen.getByRole("button", { name: "Lưu" });
    expect(form).toContainElement(submitBtn);

    fireEvent.submit(form!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("manages focus on mount and unmount", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Mở Modal";
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { unmount } = render(
      <AdminModal title="Focus Modal" onClose={() => {}}>
        Nội dung
      </AdminModal>,
    );

    const dialog = screen.getByRole("dialog", { name: "Focus Modal" });
    expect(document.activeElement).toBe(dialog);

    unmount();
    expect(document.activeElement).toBe(trigger);

    document.body.removeChild(trigger);
  });

  it("preserves child autoFocus on mount and restores focus on unmount", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Trigger";
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { unmount } = render(
      <AdminModal title="AF" onClose={() => {}}>
        <input autoFocus aria-label="Tiêu đề" />
      </AdminModal>,
    );

    const input = screen.getByRole("textbox", { name: "Tiêu đề" });
    expect(document.activeElement).toBe(input);

    unmount();
    expect(document.activeElement).toBe(trigger);

    document.body.removeChild(trigger);
  });

  it("locks body scroll on mount and restores previous overflow on unmount", () => {
    document.body.style.overflow = "auto";

    const { unmount } = render(
      <AdminModal title="Scroll Lock" onClose={() => {}}>
        Nội dung
      </AdminModal>,
    );

    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("auto");

    document.body.style.overflow = "";
  });
});
