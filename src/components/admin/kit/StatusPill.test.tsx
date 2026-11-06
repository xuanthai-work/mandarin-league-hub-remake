import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusPill, type StatusTone } from "./StatusPill";

describe("StatusPill", () => {
  const tones: Array<[StatusTone, string, string]> = [
    ["neutral", "bg-muted text-muted-foreground", "bg-muted-foreground"],
    ["info", "bg-primary/10 text-primary", "bg-primary"],
    ["success", "bg-success/15 text-success", "bg-success"],
    ["warning", "bg-warning-soft text-warning-foreground", "bg-warning-foreground"],
    ["danger", "bg-destructive/10 text-destructive", "bg-destructive"],
    ["gold", "bg-gold-soft text-warning-foreground", "bg-gold"],
  ];

  it.each(tones)(
    "renders correct pill classes and dot classes for tone '%s'",
    (tone, expectedPillCls, expectedDotCls) => {
      const { container } = render(<StatusPill tone={tone}>Label {tone}</StatusPill>);
      const pill = container.firstChild as HTMLElement;
      expect(pill).toBeInTheDocument();
      for (const cls of expectedPillCls.split(" ")) {
        expect(pill.className).toContain(cls);
      }

      const dot = pill.querySelector("span[aria-hidden='true']");
      expect(dot).toBeInTheDocument();
      for (const cls of expectedDotCls.split(" ")) {
        expect(dot?.className).toContain(cls);
      }
    },
  );

  it("omits the dot when dot=false", () => {
    const { container } = render(
      <StatusPill tone="info" dot={false}>
        No Dot
      </StatusPill>,
    );
    const pill = container.firstChild as HTMLElement;
    expect(pill.querySelector("span[aria-hidden='true']")).toBeNull();
    expect(screen.getByText("No Dot")).toBeInTheDocument();
  });

  it("renders children correctly", () => {
    render(<StatusPill tone="success">Đang hoạt động</StatusPill>);
    expect(screen.getByText("Đang hoạt động")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <StatusPill tone="neutral" className="extra-class">
        Custom
      </StatusPill>,
    );
    expect(container.firstChild).toHaveClass("extra-class");
  });
});
