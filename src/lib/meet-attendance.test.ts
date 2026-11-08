import { describe, expect, it } from "vitest";
import {
  isScorableMeeting,
  meetingMinutes,
  parseParticipant,
  splitParticipants,
  type LinkedMember,
  type ParsedParticipant,
} from "./meet-attendance";

const SUB = "114047730945953440502";

const link = (over: Partial<LinkedMember> = {}): LinkedMember => ({
  google_sub: SUB,
  id: "m1",
  full_name: "Nguyễn Văn A",
  member_code: "TML-MBR-2611-0001",
  department: "comms",
  position: "Thành viên",
  status: "active",
  is_leader: false,
  ...over,
});

const signed = (displayName = "Long Jin", sub = SUB): ParsedParticipant => ({
  sub,
  displayName,
  kind: "signed_in",
});

describe("parseParticipant", () => {
  it("reads the numeric Google id and the Meet display name", () => {
    const p = parseParticipant({
      signedinUser: { user: `users/${SUB}`, displayName: "  Long Jin " },
    });
    expect(p).toEqual({ sub: SUB, displayName: "Long Jin", kind: "signed_in" });
  });

  it("keeps signed-in participants without a readable id, and names them when blank", () => {
    expect(parseParticipant({ signedinUser: { user: "users/abc", displayName: "" } })).toEqual({
      sub: null,
      displayName: "Không rõ tên",
      kind: "signed_in",
    });
  });

  it("handles guests, phones and unknown payloads", () => {
    expect(parseParticipant({ anonymousUser: { displayName: "Khách 1" } })).toEqual({
      sub: null,
      displayName: "Khách 1",
      kind: "anonymous",
    });
    expect(parseParticipant({ phoneUser: {} })).toEqual({
      sub: null,
      displayName: "Số điện thoại",
      kind: "phone",
    });
    expect(parseParticipant({})).toBeNull();
  });
});

describe("meetingMinutes", () => {
  it("counts whole minutes", () => {
    expect(meetingMinutes("2026-11-08T01:00:00Z", "2026-11-08T02:35:00Z")).toBe(95);
  });

  it("returns null while running or with invalid times", () => {
    expect(meetingMinutes("2026-11-08T01:00:00Z")).toBeNull();
    expect(meetingMinutes("2026-11-08T02:00:00Z", "2026-11-08T01:00:00Z")).toBeNull();
    expect(meetingMinutes("nope", "also-nope")).toBeNull();
  });
});

describe("isScorableMeeting", () => {
  it("requires at least 30 finished minutes", () => {
    expect(isScorableMeeting("2026-11-08T01:00:00Z", "2026-11-08T01:29:00Z")).toBe(false);
    expect(isScorableMeeting("2026-11-08T01:00:00Z", "2026-11-08T01:30:00Z")).toBe(true);
    expect(isScorableMeeting("2026-11-08T01:00:00Z")).toBe(false);
  });
});

describe("splitParticipants", () => {
  it("splits matched, leaders, inactive and unrecognised people", () => {
    const split = splitParticipants(
      [signed("Long Jin"), signed("Thi Le", "12345"), signed("Boss", "22222"), signed("Anon", "55555")],
      [
        link(),
        link({ google_sub: "12345", id: "m2", full_name: "Lê Thị", status: "inactive" }),
        link({ google_sub: "22222", id: "m3", full_name: "Trần B", is_leader: true }),
      ],
    );
    expect(split.matched.map((m) => m.id)).toEqual(["m1"]);
    expect(split.leaders.map((m) => m.id)).toEqual(["m3"]);
    expect(split.unlinked).toEqual([
      { display_name: "Thi Le", kind: "inactive" },
      { display_name: "Anon", kind: "signed_in" },
    ]);
  });

  it("keeps guests and phones in the unlinked list", () => {
    const split = splitParticipants(
      [
        { sub: null, displayName: "Khách", kind: "anonymous" },
        { sub: null, displayName: "09xx", kind: "phone" },
      ],
      [],
    );
    expect(split.matched).toEqual([]);
    expect(split.unlinked).toEqual([
      { display_name: "Khách", kind: "anonymous" },
      { display_name: "09xx", kind: "phone" },
    ]);
  });

  it("counts one person once and sorts members by name", () => {
    const split = splitParticipants(
      [signed("Zed", "99999"), signed("Zed again", "99999"), signed("Long Jin")],
      [link(), link({ google_sub: "99999", id: "m2", full_name: "An Bình" })],
    );
    expect(split.matched.map((m) => m.full_name)).toEqual(["An Bình", "Nguyễn Văn A"]);
    expect(split.unlinked).toEqual([]);
  });
});
