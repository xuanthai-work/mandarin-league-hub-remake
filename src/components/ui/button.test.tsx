import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button variants and sizes", () => {
  it("renders with default props (variant=default, size=default)", () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole("button", { name: "Click me" });
    const cls = btn.className.split(/\s+/);
    expect(cls).toContain("rounded-md");
    expect(cls).toContain("h-9");
    expect(cls).toContain("bg-primary");
  });

  it("applies size='admin' overriding rounded-md with rounded-xl and text-sm with text-xs via twMerge", () => {
    render(<Button size="admin">Admin Action</Button>);
    const btn = screen.getByRole("button", { name: "Admin Action" });
    const cls = btn.className.split(/\s+/);
    expect(cls).toContain("rounded-xl");
    expect(cls).toContain("h-9");
    expect(cls).toContain("text-xs");
    expect(cls).not.toContain("rounded-md");
    expect(cls).not.toContain("text-sm");
  });

  it("applies size='admin-sm' with h-8, rounded-lg, text-xs and without rounded-md", () => {
    render(<Button size="admin-sm">Edit</Button>);
    const btn = screen.getByRole("button", { name: "Edit" });
    const cls = btn.className.split(/\s+/);
    expect(cls).toContain("h-8");
    expect(cls).toContain("rounded-lg");
    expect(cls).toContain("text-xs");
    expect(cls).not.toContain("rounded-md");
  });

  it("applies size='admin-icon' with h-8, w-8, rounded-lg and without rounded-md", () => {
    render(<Button size="admin-icon" aria-label="Close" />);
    const btn = screen.getByRole("button", { name: "Close" });
    const cls = btn.className.split(/\s+/);
    expect(cls).toContain("h-8");
    expect(cls).toContain("w-8");
    expect(cls).toContain("rounded-lg");
    expect(cls).not.toContain("rounded-md");
  });

  it("applies variant='destructive-outline' with text-destructive and border-destructive/30", () => {
    render(<Button variant="destructive-outline">Delete item</Button>);
    const btn = screen.getByRole("button", { name: "Delete item" });
    const cls = btn.className.split(/\s+/);
    expect(cls).toContain("text-destructive");
    expect(cls).toContain("border-destructive/30");
  });
});
