import { describe, expect, it } from "vitest";

import { isPortalPath, pickViewTransitionTypes } from "./view-transition";

describe("isPortalPath", () => {
  it("returns true for portal root paths and subpaths", () => {
    expect(isPortalPath("/admin")).toBe(true);
    expect(isPortalPath("/admin/members")).toBe(true);
    expect(isPortalPath("/member/dashboard")).toBe(true);
    expect(isPortalPath("/login")).toBe(true);
    expect(isPortalPath("/auth/callback")).toBe(true);
  });

  it("returns false for public paths, prefix lookalikes, or undefined", () => {
    expect(isPortalPath("/")).toBe(false);
    expect(isPortalPath("/courses")).toBe(false);
    expect(isPortalPath("/teachers/abc")).toBe(false);
    expect(isPortalPath("/administrator")).toBe(false);
    expect(isPortalPath(undefined)).toBe(false);
  });
});

describe("pickViewTransitionTypes", () => {
  it("returns false when pathChanged is false (hash or search only)", () => {
    expect(
      pickViewTransitionTypes({
        pathChanged: false,
        toLocation: { pathname: "/" },
        fromLocation: { pathname: "/" },
      }),
    ).toBe(false);
  });

  it("returns ['site-nav'] when navigating between public pages", () => {
    expect(
      pickViewTransitionTypes({
        pathChanged: true,
        fromLocation: { pathname: "/" },
        toLocation: { pathname: "/courses" },
      }),
    ).toEqual(["site-nav"]);
  });

  it("returns false when navigating to or from an internal portal", () => {
    expect(
      pickViewTransitionTypes({
        pathChanged: true,
        fromLocation: { pathname: "/courses" },
        toLocation: { pathname: "/admin" },
      }),
    ).toBe(false);

    expect(
      pickViewTransitionTypes({
        pathChanged: true,
        fromLocation: { pathname: "/admin/members" },
        toLocation: { pathname: "/" },
      }),
    ).toBe(false);
  });

  it("returns ['site-nav'] when fromLocation is undefined but toLocation is public and pathChanged is true", () => {
    expect(
      pickViewTransitionTypes({
        pathChanged: true,
        fromLocation: undefined,
        toLocation: { pathname: "/courses" },
      }),
    ).toEqual(["site-nav"]);
  });
});
