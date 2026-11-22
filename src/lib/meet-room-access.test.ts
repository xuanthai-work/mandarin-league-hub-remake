import { describe, expect, it } from "vitest";
import { canManageRoom } from "./meet-room-access";

describe("canManageRoom", () => {
  const actor = { userId: "user-1", department: "tech" };

  it("grants access to all rooms for scope 'all'", () => {
    expect(canManageRoom("all", actor, { kind: "club", department: null, createdBy: null })).toBe(
      true,
    );
    expect(
      canManageRoom("all", actor, { kind: "work", department: "hr", createdBy: "user-2" }),
    ).toBe(true);
    expect(
      canManageRoom("all", actor, { kind: "shared", department: null, createdBy: "user-2" }),
    ).toBe(true);
  });

  it("grants access to work rooms of own department for scope 'own'", () => {
    expect(
      canManageRoom("own", actor, { kind: "work", department: "tech", createdBy: "user-2" }),
    ).toBe(true);
  });

  it("grants access to shared rooms created by actor for scope 'own'", () => {
    expect(
      canManageRoom("own", actor, { kind: "shared", department: null, createdBy: "user-1" }),
    ).toBe(true);
  });

  it("denies access to shared rooms created by someone else for scope 'own'", () => {
    expect(
      canManageRoom("own", actor, { kind: "shared", department: null, createdBy: "user-2" }),
    ).toBe(false);
  });

  it("denies access to shared rooms with null createdBy for scope 'own'", () => {
    expect(canManageRoom("own", actor, { kind: "shared", department: null, createdBy: null })).toBe(
      false,
    );
  });

  it("denies access to club rooms for scope 'own'", () => {
    expect(
      canManageRoom("own", actor, { kind: "club", department: null, createdBy: "user-1" }),
    ).toBe(false);
  });

  it("denies access to work rooms of other departments for scope 'own'", () => {
    expect(
      canManageRoom("own", actor, { kind: "work", department: "hr", createdBy: "user-1" }),
    ).toBe(false);
  });

  it("denies access to work rooms if actor has no department for scope 'own'", () => {
    const actorNoDept = { userId: "user-1", department: null };
    expect(
      canManageRoom("own", actorNoDept, { kind: "work", department: "tech", createdBy: "user-1" }),
    ).toBe(false);
  });

  it("denies access if scope is null or undefined", () => {
    expect(
      canManageRoom(null, actor, { kind: "work", department: "tech", createdBy: "user-1" }),
    ).toBe(false);
    expect(
      canManageRoom(undefined, actor, { kind: "work", department: "tech", createdBy: "user-1" }),
    ).toBe(false);
  });
});
