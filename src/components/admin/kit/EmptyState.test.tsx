import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AlertCircle } from "lucide-react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders title, and omits description and action when not provided", () => {
    const { container } = render(<EmptyState title="Không có dữ liệu" />);
    expect(screen.getByText("Không có dữ liệu")).toBeInTheDocument();
    expect(container.querySelectorAll("p")).toHaveLength(1);
    expect(container.querySelector(".mt-4")).not.toBeInTheDocument();
  });

  it("renders description and action when provided", () => {
    render(
      <EmptyState
        title="Chưa có đối tác"
        description="Bấm nút bên dưới để tạo mới"
        action={<button type="button">Thêm đối tác</button>}
      />,
    );
    expect(screen.getByText("Chưa có đối tác")).toBeInTheDocument();
    expect(screen.getByText("Bấm nút bên dưới để tạo mới")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thêm đối tác" })).toBeInTheDocument();
  });

  it("renders icon with aria-hidden when provided", () => {
    const { container } = render(<EmptyState title="Trống" icon={AlertCircle} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("applies role='alert' and text-destructive when tone='error'", () => {
    render(<EmptyState title="Lỗi tải dữ liệu" tone="error" />);
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    const title = screen.getByText("Lỗi tải dữ liệu");
    expect(title.className).toContain("text-destructive");
  });

  it("does not have role='alert' and has text-foreground by default", () => {
    render(<EmptyState title="Danh sách trống" />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const title = screen.getByText("Danh sách trống");
    expect(title.className).toContain("text-foreground");
  });

  it("applies custom className", () => {
    const { container } = render(<EmptyState title="Trống" className="my-custom-class" />);
    expect(container.firstChild).toHaveClass("my-custom-class");
  });
});
