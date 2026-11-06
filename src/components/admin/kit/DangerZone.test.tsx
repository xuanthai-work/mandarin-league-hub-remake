import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DangerZone } from "./DangerZone";

describe("DangerZone", () => {
  it("renders default heading, description, and action button initially without confirm button", () => {
    render(
      <DangerZone
        title="Xóa đối tác"
        description="Hành động này sẽ ẩn đối tác"
        actionLabel="Thực hiện xóa"
        onConfirm={() => {}}
      />,
    );

    expect(screen.getByText("Vùng nguy hiểm")).toBeInTheDocument();
    expect(screen.getByText("Xóa đối tác")).toBeInTheDocument();
    expect(screen.getByText("Hành động này sẽ ẩn đối tác")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thực hiện xóa" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Xác nhận xóa" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thôi" })).not.toBeInTheDocument();
  });

  it("transitions to armed state on click: onConfirm is not called, shows confirmDescription, 'Thôi' and confirm button with focus", () => {
    const onConfirm = vi.fn();
    render(
      <DangerZone
        title="Xóa đối tác"
        description="Mô tả ban đầu"
        actionLabel="Thực hiện xóa"
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Thực hiện xóa" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(
      screen.getByText("Bấm “Xác nhận xóa” để hoàn tất. Không hoàn tác được."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thôi" })).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "Xác nhận xóa" });
    expect(confirmBtn).toBeInTheDocument();
    expect(document.activeElement).toBe(confirmBtn);
  });

  it("reverts to unconfirmed state when clicking 'Thôi' without calling onConfirm", () => {
    const onConfirm = vi.fn();
    render(
      <DangerZone
        title="Xóa đối tác"
        description="Mô tả ban đầu"
        actionLabel="Thực hiện xóa"
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Thực hiện xóa" }));
    expect(screen.getByRole("button", { name: "Thôi" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Thôi" }));
    expect(onConfirm).not.toHaveBeenCalled();

    expect(screen.getByText("Mô tả ban đầu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thực hiện xóa" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Xác nhận xóa" })).not.toBeInTheDocument();
  });

  it("calls onConfirm exactly once on confirmation and resets back to initial state", () => {
    const onConfirm = vi.fn();
    render(
      <DangerZone
        title="Xóa đối tác"
        description="Mô tả ban đầu"
        actionLabel="Thực hiện xóa"
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Thực hiện xóa" }));
    const confirmBtn = screen.getByRole("button", { name: "Xác nhận xóa" });

    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);

    expect(screen.getByText("Mô tả ban đầu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thực hiện xóa" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Xác nhận xóa" })).not.toBeInTheDocument();
  });

  it("disables action button when disabled=true", () => {
    render(
      <DangerZone
        title="Xóa đối tác"
        description="Mô tả ban đầu"
        actionLabel="Thực hiện xóa"
        onConfirm={() => {}}
        disabled
      />,
    );

    const btn = screen.getByRole("button", { name: "Thực hiện xóa" });
    expect(btn).toBeDisabled();
  });

  it("returns focus to action button after clicking 'Thôi'", () => {
    render(
      <DangerZone
        title="Xóa đối tác"
        description="Mô tả ban đầu"
        actionLabel="Thực hiện xóa"
        onConfirm={() => {}}
      />,
    );

    const actionBtn = screen.getByRole("button", { name: "Thực hiện xóa" });
    fireEvent.click(actionBtn);

    const cancelBtn = screen.getByRole("button", { name: "Thôi" });
    fireEvent.click(cancelBtn);

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Thực hiện xóa" }));
  });
});
