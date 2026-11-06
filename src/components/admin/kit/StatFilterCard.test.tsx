import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Clock } from "lucide-react";
import { StatFilterCard } from "./StatFilterCard";

describe("StatFilterCard", () => {
  it("renders as button when onToggle is provided, handles aria-pressed, and responds to click", () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <StatFilterCard label="Chờ duyệt" value={12} active={false} onToggle={onToggle} />,
    );

    const button = screen.getByRole("button", { name: /Chờ duyệt/ });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveClass("cursor-pointer", "border-border/70");

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(<StatFilterCard label="Chờ duyệt" value={12} active={true} onToggle={onToggle} />);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveClass("border-primary", "ring-2", "ring-primary/15");
  });

  it("renders as div without button when onToggle is omitted", () => {
    render(<StatFilterCard label="Tổng bài viết" value={45} />);

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Tổng bài viết")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
  });

  it("renders attention state with border-gold/60 and aria-hidden gold dot", () => {
    const { container } = render(<StatFilterCard label="Cần xử lý" value={3} attention={true} />);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("border-gold/60");

    const dot = container.querySelector("span.bg-gold");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });

  it("renders hint and icon when provided", () => {
    const { container } = render(
      <StatFilterCard label="Bản nháp" value={5} hint="Cần hoàn thiện" icon={Clock} />,
    );

    expect(screen.getByText("Cần hoàn thiện")).toBeInTheDocument();
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
