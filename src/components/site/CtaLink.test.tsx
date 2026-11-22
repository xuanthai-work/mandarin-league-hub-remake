import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CtaLink } from "./CtaLink";

const navigateMock = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({
    navigate: navigateMock,
  }),
}));

describe("CtaLink", () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it("sanitizes dangerous URLs to fallback '/'", () => {
    render(<CtaLink href="javascript:alert(1)">Dangerous Link</CtaLink>);
    const link = screen.getByRole("link", { name: "Dangerous Link" });
    expect(link.getAttribute("href")).toBe("/");
  });

  it("navigates via router for internal links when left-clicked", () => {
    render(<CtaLink href="/about">About Us</CtaLink>);
    const link = screen.getByRole("link", { name: "About Us" });
    expect(link.getAttribute("href")).toBe("/about");

    fireEvent.click(link);
    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith({ href: "/about" });
  });

  it("adds target='_blank' and rel='noopener noreferrer' for external links and does not route via router", () => {
    render(<CtaLink href="https://example.com">External Site</CtaLink>);
    const link = screen.getByRole("link", { name: "External Site" });
    expect(link.getAttribute("href")).toBe("https://example.com");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");

    fireEvent.click(link);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("does not intercept anchor links with router navigation", () => {
    render(<CtaLink href="#courses">Courses</CtaLink>);
    const link = screen.getByRole("link", { name: "Courses" });
    expect(link.getAttribute("href")).toBe("#courses");

    fireEvent.click(link);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("does not call router.navigate on modified clicks (meta, ctrl, shift, alt)", () => {
    render(<CtaLink href="/courses">Courses</CtaLink>);
    const link = screen.getByRole("link", { name: "Courses" });

    fireEvent.click(link, { ctrlKey: true });
    fireEvent.click(link, { metaKey: true });
    fireEvent.click(link, { shiftKey: true });
    fireEvent.click(link, { altKey: true });
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
