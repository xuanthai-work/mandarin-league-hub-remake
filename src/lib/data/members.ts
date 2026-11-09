import type { Member } from "./types";

// Intentionally empty — no real members are invented. Profiles appear once TML adds data.
const MEMBERS: Member[] = [];

export const getMember = (id: string) => MEMBERS.find((m) => m.id === id || m.memberId === id);
