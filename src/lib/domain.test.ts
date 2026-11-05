import { describe, expect, it } from "vitest";
import { domainRedirect, mainHomeUrl } from "./domain";

describe("home navigation", () => {
  it("recruitment Home leaves join instead of reopening recruitment", () => {
    expect(mainHomeUrl("join.themandarinleague.bond")).toBe("https://themandarinleague.bond/");
  });
  it("member Home leaves member instead of reopening login", () => {
    expect(mainHomeUrl("member.themandarinleague.bond")).toBe("https://themandarinleague.bond/");
  });
  it.each([
    "themandarinleague.bond",
    "www.themandarinleague.bond",
    "localhost:8080",
    "preview-deploy.test",
  ])("keeps local Home on %s", (host) => {
    expect(mainHomeUrl(host)).toBeNull();
  });
});

describe("domainRedirect", () => {
  it("join root opens the recruitment page", () =>
    expect(domainRedirect("join.themandarinleague.bond", "/")).toBe(
      "https://join.themandarinleague.bond/join",
    ));
  it("member root opens login", () =>
    expect(domainRedirect("member.themandarinleague.bond", "/")).toBe(
      "https://member.themandarinleague.bond/login",
    ));
  it("main /join moves to join portal", () =>
    expect(domainRedirect("themandarinleague.bond", "/join", "?ban=x")).toBe(
      "https://join.themandarinleague.bond/join?ban=x",
    ));
  it("main /login moves to member portal", () =>
    expect(domainRedirect("www.themandarinleague.bond", "/login")).toBe(
      "https://member.themandarinleague.bond/login",
    ));
  it("join host sends other pages to main site", () =>
    expect(domainRedirect("join.themandarinleague.bond", "/courses")).toBe(
      "https://themandarinleague.bond/courses",
    ));
  it("member host keeps dashboard", () =>
    expect(domainRedirect("member.themandarinleague.bond", "/member/dashboard")).toBeNull());
  it("preview host never redirects", () =>
    expect(domainRedirect("preview-deploy.test", "/join")).toBeNull());
});
