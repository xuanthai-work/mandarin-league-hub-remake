import { describe, expect, it } from "vitest";
import { checkGoogleTokenInfo } from "./google-id-token";

const CLIENT_ID = "123.apps.googleusercontent.com";
const NOW = 1_700_000_000;

const token = (over: Record<string, unknown> = {}) => ({
  aud: CLIENT_ID,
  iss: "accounts.google.com",
  email_verified: "true",
  exp: String(NOW + 60),
  sub: "114047730945953440502",
  email: "  Long.Jin@Example.com ",
  ...over,
});

describe("checkGoogleTokenInfo", () => {
  it("accepts a valid Google token and lowercases the email", () => {
    expect(checkGoogleTokenInfo(token(), CLIENT_ID, NOW)).toEqual({
      sub: "114047730945953440502",
      email: "long.jin@example.com",
    });
  });

  it("accepts the https issuer and a boolean email_verified", () => {
    expect(
      checkGoogleTokenInfo(
        token({ iss: "https://accounts.google.com", email_verified: true }),
        CLIENT_ID,
        NOW,
      ),
    ).not.toBeNull();
  });

  it("rejects another audience, unknown issuer and unverified email", () => {
    expect(checkGoogleTokenInfo(token({ aud: "other" }), CLIENT_ID, NOW)).toBeNull();
    expect(checkGoogleTokenInfo(token({ iss: "evil.example" }), CLIENT_ID, NOW)).toBeNull();
    expect(checkGoogleTokenInfo(token({ email_verified: "false" }), CLIENT_ID, NOW)).toBeNull();
    expect(checkGoogleTokenInfo(token({ email_verified: undefined }), CLIENT_ID, NOW)).toBeNull();
  });

  it("rejects expired or unreadable expiry", () => {
    expect(checkGoogleTokenInfo(token({ exp: String(NOW) }), CLIENT_ID, NOW)).toBeNull();
    expect(checkGoogleTokenInfo(token({ exp: "soon" }), CLIENT_ID, NOW)).toBeNull();
  });

  it("rejects a sub that is not a numeric Google account id", () => {
    expect(checkGoogleTokenInfo(token({ sub: "abc123" }), CLIENT_ID, NOW)).toBeNull();
    expect(checkGoogleTokenInfo(token({ sub: 12345 }), CLIENT_ID, NOW)).toBeNull();
  });

  it("rejects a missing or malformed email", () => {
    expect(checkGoogleTokenInfo(token({ email: "no-at-sign" }), CLIENT_ID, NOW)).toBeNull();
    expect(checkGoogleTokenInfo(token({ email: undefined }), CLIENT_ID, NOW)).toBeNull();
  });

  it("rejects non-object payloads and an empty client id", () => {
    expect(checkGoogleTokenInfo(null, CLIENT_ID, NOW)).toBeNull();
    expect(checkGoogleTokenInfo("{}", CLIENT_ID, NOW)).toBeNull();
    expect(checkGoogleTokenInfo(token(), "", NOW)).toBeNull();
  });
});
