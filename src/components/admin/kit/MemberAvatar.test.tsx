import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MemberAvatar } from "./MemberAvatar";

describe("MemberAvatar", () => {
  it("renders the avatar image when a signed URL exists", () => {
    render(<MemberAvatar src="https://example.test/a.png" name="Nguyễn Hà" className="h-7 w-7" />);
    const img = screen.getByRole("img", { name: "Nguyễn Hà" });
    expect(img).toHaveAttribute("src", "https://example.test/a.png");
    expect(img.className).toContain("rounded-full");
    expect(img.className).toContain("h-7");
  });

  it("shows the first and last initials when there is no avatar", () => {
    render(<MemberAvatar src={null} name="Nguyễn Thị Thu Hà" className="h-8 w-8" />);
    expect(screen.getByText("NH")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("falls back to one letter or TML for degenerate names", () => {
    const { rerender } = render(<MemberAvatar name="Hà" className="h-8 w-8" />);
    expect(screen.getByText("H")).toBeInTheDocument();
    rerender(<MemberAvatar name="   " className="h-8 w-8" />);
    expect(screen.getByText("TML")).toBeInTheDocument();
  });

  it("falls back to initials when the image fails to load", () => {
    render(<MemberAvatar src="https://example.test/broken.png" name="Lê An" className="h-8 w-8" />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("LA")).toBeInTheDocument();
  });

  it("accepts a dedicated fallback class", () => {
    const { container } = render(
      <MemberAvatar name="Võ Bình" className="h-8 w-8" fallbackClassName="text-[10px]" />,
    );
    expect(container.firstChild).toHaveClass("text-[10px]");
  });
});
