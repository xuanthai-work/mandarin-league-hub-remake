import { describe, expect, it } from "vitest";
import { STATUS_MESSAGE_TEMPLATES, nextCandidateMessage } from "./recruitment";

const T = STATUS_MESSAGE_TEMPLATES as { approved: string; rejected: string };

describe("nextCandidateMessage", () => {
  it("fills approved template when empty", () =>
    expect(nextCandidateMessage("", "approved")).toBe(T.approved));
  it("swaps template when switching approved → rejected", () =>
    expect(nextCandidateMessage(T.approved, "rejected")).toBe(T.rejected));
  it("never overwrites a hand-written message", () =>
    expect(nextCandidateMessage("Lời riêng", "approved")).toBe("Lời riêng"));
  it("clears a template when moving to a status without one", () =>
    expect(nextCandidateMessage(T.rejected, "interview")).toBe(""));
});
