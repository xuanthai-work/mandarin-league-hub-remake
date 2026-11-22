import { describe, expect, it } from "vitest";
import { resolveRunRoom, type MeetAutoRunRow } from "./RunDrawer";

describe("resolveRunRoom", () => {
  const baseRun: MeetAutoRunRow = {
    conference_record: "conferenceRecords/conf-1",
    created_at: "2026-11-23T00:00:00Z",
    updated_at: "2026-11-23T00:00:00Z",
    meeting_start: "2026-11-23T00:00:00Z",
    meeting_end: "2026-11-23T00:30:00Z",
    status: "scored",
    detail: "Đã chấm",
    present_count: 5,
    attendance_session_id: "session-1",
    room_id: "room-1",
    space_name: "spaces/space-1",
    room_label: null,
    room_kind: null,
    room_department: null,
  };

  it("handles null or undefined run", () => {
    expect(resolveRunRoom(null)).toEqual({
      title: "",
      isDeleted: false,
      isUnknown: false,
      meetingKindLabel: null,
    });
    expect(resolveRunRoom(undefined)).toEqual({
      title: "",
      isDeleted: false,
      isUnknown: false,
      meetingKindLabel: null,
    });
  });

  it("prioritizes current room label over snapshot label", () => {
    const run: MeetAutoRunRow = {
      ...baseRun,
      room_label: "Tên cũ đã chụp",
      meeting_rooms: {
        label: "Phòng Họp Ban Công Nghệ Mới",
        kind: "work",
        department: "tech",
      },
    };
    const res = resolveRunRoom(run);
    expect(res.title).toBe("Phòng Họp Ban Công Nghệ Mới");
    expect(res.isDeleted).toBe(false);
    expect(res.isUnknown).toBe(false);
    expect(res.meetingKindLabel).toBe("Họp ban · Ban Công nghệ & Hệ thống");
  });

  it("formats club meeting kind correctly for current room", () => {
    const run: MeetAutoRunRow = {
      ...baseRun,
      meeting_rooms: {
        label: "Phòng Toàn Thể",
        kind: "club",
        department: null,
      },
    };
    const res = resolveRunRoom(run);
    expect(res.title).toBe("Phòng Toàn Thể");
    expect(res.meetingKindLabel).toBe("Họp toàn thể");
  });

  it("uses snapshot label and marks as deleted when room_id is null", () => {
    const run: MeetAutoRunRow = {
      ...baseRun,
      room_id: null,
      room_label: "Phòng Ban Cũ",
      room_kind: "work",
      room_department: "tech",
      meeting_rooms: null,
    };
    const res = resolveRunRoom(run);
    expect(res.title).toBe("Phòng Ban Cũ");
    expect(res.isDeleted).toBe(true);
    expect(res.isUnknown).toBe(false);
    expect(res.meetingKindLabel).toBe("Họp ban · Ban Công nghệ & Hệ thống");
  });

  it("uses snapshot label with isDeleted=false when room_id is still present", () => {
    const run: MeetAutoRunRow = {
      ...baseRun,
      room_id: "room-1",
      room_label: "Phòng Toàn Thể Chụp",
      room_kind: "club",
      room_department: null,
      meeting_rooms: null,
    };
    const res = resolveRunRoom(run);
    expect(res.title).toBe("Phòng Toàn Thể Chụp");
    expect(res.isDeleted).toBe(false);
    expect(res.isUnknown).toBe(false);
    expect(res.meetingKindLabel).toBe("Họp toàn thể");
  });

  it("returns fallback for unknown room when neither current nor snapshot exists", () => {
    const run: MeetAutoRunRow = {
      ...baseRun,
      room_id: null,
      room_label: null,
      meeting_rooms: null,
      space_name: "spaces/unknown-space-123",
    };
    const res = resolveRunRoom(run);
    expect(res.title).toBe("Phòng không có trong danh sách");
    expect(res.isDeleted).toBe(false);
    expect(res.isUnknown).toBe(true);
    expect(res.meetingKindLabel).toBeNull();
  });
});
