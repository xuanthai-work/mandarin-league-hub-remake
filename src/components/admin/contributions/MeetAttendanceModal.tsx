import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ClipboardCheck, Loader2, Video } from "lucide-react";
import { toast } from "sonner";

import { AdminModal } from "@/components/admin/kit/AdminModal";
import { AdminInput } from "@/components/admin/kit/AdminInput";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { FormField } from "@/components/admin/kit/FormField";
import { MemberAvatar } from "@/components/admin/kit/MemberAvatar";
import { SearchInput } from "@/components/admin/kit/SearchInput";
import { SegmentedControl } from "@/components/admin/kit/SegmentedControl";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAvatarUrls } from "@/lib/avatars";
import { loadGoogleIdentity } from "@/lib/google-identity";
import { getGoogleClientId } from "@/lib/google-link.functions";
import {
  MEET_KIND_LABEL,
  MEET_POINTS,
  MEET_SCOPE,
  type MeetKind,
  type MeetMember,
  type UnlinkedKind,
} from "@/lib/meet-attendance";
import {
  listMeetConferences,
  previewMeetAttendance,
  recordMeetAttendance,
  type MeetConference,
} from "@/lib/meet-attendance.functions";
import { deptName } from "@/lib/recruitment";
import { matchesSearch } from "@/lib/search";

const UNLINKED_LABEL: Record<UnlinkedKind, string> = {
  signed_in: "Chưa liên kết Google",
  anonymous: "Khách không đăng nhập",
  phone: "Gọi điện thoại",
  inactive: "Thành viên không hoạt động",
};

const two = (n: number) => String(n).padStart(2, "0");

/** `Thứ Hai, 09/11/2026 · 08:00–09:15` (local time); no end while the meeting is running. */
function meetingRange(start: string, end: string | null) {
  const d = new Date(start);
  const day = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
  const time = `${two(d.getHours())}:${two(d.getMinutes())}`;
  const tail = end ? `–${two(new Date(end).getHours())}:${two(new Date(end).getMinutes())}` : "";
  return `${day.charAt(0).toUpperCase() + day.slice(1)} · ${time}${tail}`;
}

interface Props {
  onClose: () => void;
  onDone: () => void;
}

/** Scores one Google Meet session: connect, pick a finished meeting, review the roster, confirm. */
export function MeetAttendanceModal({ onClose, onDone }: Props) {
  const fetchClientId = useServerFn(getGoogleClientId);
  const listFn = useServerFn(listMeetConferences);
  const previewFn = useServerFn(previewMeetAttendance);
  const recordFn = useServerFn(recordMeetAttendance);

  const [token, setToken] = useState("");
  const [record, setRecord] = useState("");
  const [kind, setKind] = useState<MeetKind>("work");
  const [manual, setManual] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [submitErr, setSubmitErr] = useState("");
  const [ready, setReady] = useState(false);

  const tokenClientRef = useRef<{ requestAccessToken: (o?: { prompt?: string }) => void } | null>(
    null,
  );

  const clientIdQ = useQuery({
    queryKey: ["google-client-id"],
    queryFn: () => fetchClientId(),
    staleTime: Infinity,
  });
  const clientId = clientIdQ.data?.clientId ?? null;

  // Build the token client once so the click can open the Google popup directly.
  useEffect(() => {
    if (!clientId) return;
    let alive = true;
    loadGoogleIdentity()
      .then((g) => {
        if (!alive) return;
        tokenClientRef.current = g.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: MEET_SCOPE,
          callback: (r) => {
            if (r.access_token) {
              setErr("");
              setToken(r.access_token);
            } else setErr(r.error_description || "Google không cấp quyền đọc buổi họp.");
          },
          error_callback: (e) =>
            setErr(
              e.type === "popup_closed"
                ? "Bạn đã đóng cửa sổ Google."
                : "Không mở được cửa sổ Google.",
            ),
        });
        setReady(true);
      })
      .catch((e: Error) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, [clientId]);

  const connect = () => tokenClientRef.current?.requestAccessToken({ prompt: "" });

  const list = useQuery({
    queryKey: ["meet-conferences", token],
    enabled: Boolean(token),
    queryFn: () => listFn({ data: { accessToken: token } }),
    staleTime: 60_000,
    retry: false,
  });

  const preview = useQuery({
    queryKey: ["meet-preview", token, record],
    enabled: Boolean(token && record),
    queryFn: () => previewFn({ data: { accessToken: token, conferenceRecord: record } }),
    retry: false,
  });

  const p = preview.data;

  // One signed-URL batch for every face shown in the modal.
  const { data: avatarMap } = useAvatarUrls(
    useMemo(
      () =>
        [...(p?.matched ?? []), ...(p?.leaders ?? []), ...(p?.candidates ?? [])].map(
          (m) => m.avatar_path,
        ),
      [p],
    ),
  );

  // Default reason follows the chosen kind until the user edits it.
  useEffect(() => {
    if (!p || reasonTouched) return;
    const d = new Date(p.start);
    setReason(
      `Điểm danh ${MEET_KIND_LABEL[kind]} - ${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()} (Google Meet)`,
    );
  }, [p, kind, reasonTouched]);

  const filtered = useMemo(
    () => (p?.candidates ?? []).filter((c) => matchesSearch(`${c.full_name} ${c.member_code}`, q)),
    [p?.candidates, q],
  );

  const pick = (c: MeetConference) => {
    setRecord(c.name);
    setManual([]);
    setKind("work");
    setReasonTouched(false);
    setSubmitErr("");
  };

  const back = () => {
    setRecord("");
    setManual([]);
    setQ("");
    setSubmitErr("");
  };

  const toggleManual = (id: string) =>
    setManual((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const n = (p?.matched.length ?? 0) + manual.length;
  const total = n * MEET_POINTS[kind];
  const reasonOk = reason.trim().length >= 3 && reason.trim().length <= 300;
  const canSubmit =
    Boolean(p) && !p?.recorded && Boolean(p?.scorable) && n > 0 && reasonOk && !busy;

  const submit = async () => {
    if (!p || !token || !record) return;
    setBusy(true);
    setSubmitErr("");
    try {
      const res = await recordFn({
        data: {
          accessToken: token,
          conferenceRecord: record,
          kind,
          manual,
          reason: reason.trim(),
        },
      });
      toast.success(`Đã điểm danh ${res.scored} thành viên, mỗi người ${res.points} điểm.`);
      onDone();
      onClose();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Không ghi được điểm danh, vui lòng thử lại.";
      setSubmitErr(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const reconnect = () => {
    setToken("");
    setRecord("");
    connect();
  };

  const footer =
    p && record ? (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {n} người × {MEET_POINTS[kind]} điểm ={" "}
          <span className="font-semibold text-foreground">{total} điểm</span>
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="admin" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          {!p.recorded && p.scorable && (
            <Button
              type="button"
              size="admin-lg"
              onClick={() => void submit()}
              disabled={!canSubmit}
            >
              {busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
              {busy ? "Đang ghi nhận…" : "Xác nhận điểm danh"}
            </Button>
          )}
        </div>
      </div>
    ) : undefined;

  const memberRow = (m: MeetMember) => (
    <li key={m.id} className="flex items-center gap-2 px-3 py-2 text-xs">
      <MemberAvatar
        src={m.avatar_path ? avatarMap?.get(m.avatar_path) : null}
        name={m.full_name}
        className="h-8 w-8 text-[10px]"
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium text-foreground">
          {m.full_name}{" "}
          <span className="font-mono text-[10px] text-muted-foreground">{m.member_code}</span>
        </span>
        <span className="text-muted-foreground">{deptName(m.department)}</span>
        {m.display_name && (
          <span className="text-[11px] text-muted-foreground">Trên Meet: {m.display_name}</span>
        )}
      </span>
    </li>
  );

  return (
    <AdminModal
      size="lg"
      icon={ClipboardCheck}
      title="Điểm danh từ Google Meet"
      description="Hệ thống đọc người có mặt từ Google Meet rồi cộng điểm một lần cho cả buổi."
      onClose={onClose}
      dismissible={!busy}
      footer={footer}
    >
      {!clientId && !clientIdQ.isLoading ? (
        <EmptyState
          icon={Video}
          title="Tính năng chưa được bật"
          description="Quản trị viên cần đặt GOOGLE_OAUTH_CLIENT_ID."
        />
      ) : !token ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Hệ thống chỉ đọc danh sách người dự các buổi họp của bạn trên Google Meet, không đọc nội
            dung, ghi âm hay lịch. Google có thể cảnh báo ứng dụng chưa xác minh, bấm Nâng cao rồi
            Tiếp tục.
          </p>
          {err && <p className="text-xs font-medium text-destructive">{err}</p>}
          <Button type="button" size="admin-lg" onClick={connect} disabled={!ready || !clientId}>
            {!ready && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            Kết nối Google Meet
          </Button>
        </div>
      ) : !record ? (
        <div className="space-y-2">
          {list.isLoading ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Đang tải buổi họp gần đây…
            </p>
          ) : list.isError ? (
            <EmptyState
              tone="error"
              title="Không tải được buổi họp"
              description={list.error.message}
              action={
                <Button type="button" size="admin" variant="outline" onClick={reconnect}>
                  Kết nối lại
                </Button>
              }
            />
          ) : (list.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Video}
              title="Không có buổi họp nào trong 30 ngày qua với tài khoản Google này"
            />
          ) : (
            list.data!.map((c) => {
              return (
                <Button
                  key={c.name}
                  type="button"
                  variant="outline"
                  size="admin"
                  disabled={Boolean(c.recorded) || !c.scorable}
                  onClick={() => pick(c)}
                  className="h-auto w-full flex-col items-start justify-start gap-1 rounded-xl px-3 py-2 text-left font-normal"
                >
                  <span className="flex w-full flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {meetingRange(c.start, c.end)}
                    </span>
                    {c.recorded ? (
                      <StatusPill tone="success">
                        Đã chấm · {c.recorded.created_by_label}
                      </StatusPill>
                    ) : c.end === null ? (
                      <StatusPill tone="info">Đang diễn ra</StatusPill>
                    ) : !c.scorable ? (
                      <StatusPill tone="neutral">Dưới 30 phút</StatusPill>
                    ) : (
                      <StatusPill tone="warning">Chưa chấm</StatusPill>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {c.minutes === null ? "Đang diễn ra" : `${c.minutes} phút`}
                  </span>
                </Button>
              );
            })
          )}
        </div>
      ) : preview.isLoading ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Đang đọc danh sách có mặt…</p>
      ) : preview.isError || !p ? (
        <EmptyState
          tone="error"
          title="Không đọc được buổi họp"
          description={preview.error?.message}
          action={
            <Button type="button" size="admin" variant="outline" onClick={() => preview.refetch()}>
              Thử lại
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="admin" variant="ghost" onClick={back}>
              <ArrowLeft aria-hidden />
              Chọn buổi khác
            </Button>
            <span className="text-xs text-muted-foreground">
              {meetingRange(p.start, p.end)} ·{" "}
              {p.minutes === null ? "đang diễn ra" : `${p.minutes} phút`}
            </span>
          </div>

          {p.recorded ? (
            <p className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs text-foreground">
              Buổi họp này đã được {p.recorded.created_by_label} chấm ({p.recorded.present_count}{" "}
              người).
            </p>
          ) : !p.scorable ? (
            <p className="rounded-xl border border-warning-foreground/30 bg-warning-soft px-3 py-2 text-xs text-foreground">
              Chỉ chấm được buổi họp đã kết thúc và kéo dài từ 30 phút.
            </p>
          ) : null}

          <SegmentedControl
            value={kind}
            onChange={setKind}
            label="Loại buổi họp"
            options={[
              { value: "work", label: "Họp làm việc · 2 điểm" },
              ...(p.canClub ? [{ value: "club" as const, label: "Họp toàn thể · 10 điểm" }] : []),
            ]}
          />

          <section className="space-y-1">
            <p className="text-xs font-semibold text-foreground">Được điểm ({p.matched.length})</p>
            {p.matched.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Chưa nhận diện được ai. Thêm tay ở dưới nếu chắc chắn họ có mặt.
              </p>
            ) : (
              <ul className="custom-scrollbar max-h-48 divide-y divide-border overflow-y-auto rounded-xl border border-border">
                {p.matched.map(memberRow)}
              </ul>
            )}
          </section>

          {p.leaders.length > 0 && (
            <section className="space-y-1">
              <p className="text-xs font-semibold text-foreground">
                Lãnh đạo, không tính điểm ({p.leaders.length})
              </p>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {p.leaders.map(memberRow)}
              </ul>
            </section>
          )}

          {p.unlinked.length > 0 && (
            <section className="space-y-1">
              <p className="text-xs font-semibold text-foreground">
                Chưa nhận diện ({p.unlinked.length})
              </p>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {p.unlinked.map((u, i) => (
                  <li
                    key={`${u.display_name}-${i}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-foreground">{u.display_name}</span>
                    <StatusPill tone="neutral">{UNLINKED_LABEL[u.kind]}</StatusPill>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-muted-foreground">
                Nhắc thành viên vào Cài đặt → Google Meet để liên kết. Nếu chắc chắn họ có mặt, thêm
                tay ở dưới.
              </p>
            </section>
          )}

          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-foreground">
                Thêm tay
                {manual.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    Đã chọn {manual.length}
                  </span>
                )}
              </p>
              <SearchInput
                className="w-full sm:max-w-xs"
                value={q}
                onChange={setQ}
                placeholder="Tìm tên hoặc mã thành viên…"
                label="Tìm thành viên để thêm tay"
              />
            </div>
            <div className="custom-scrollbar max-h-64 overflow-y-auto rounded-xl border border-border">
              {filtered.length === 0 ? (
                <p className="p-4 text-center text-xs text-muted-foreground">
                  Không có thành viên phù hợp trong phạm vi bạn phụ trách.
                </p>
              ) : (
                filtered.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2 text-xs last:border-0 hover:bg-accent/60"
                  >
                    <Checkbox
                      checked={manual.includes(c.id)}
                      onCheckedChange={() => toggleManual(c.id)}
                      aria-label={`Thêm tay ${c.full_name}`}
                    />
                    <MemberAvatar
                      src={c.avatar_path ? avatarMap?.get(c.avatar_path) : null}
                      name={c.full_name}
                      className="h-8 w-8 text-[10px]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">{c.full_name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {c.member_code} · {deptName(c.department)}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </section>

          <FormField
            label="Lý do"
            required
            hint="Ghi vào sổ cái điểm của từng thành viên (3–300 ký tự)."
            error={reason.trim().length > 0 && !reasonOk ? "Lý do cần 3–300 ký tự." : undefined}
          >
            {(field) => (
              <AdminInput
                {...field}
                value={reason}
                maxLength={300}
                onChange={(e) => {
                  setReason(e.target.value);
                  setReasonTouched(true);
                }}
              />
            )}
          </FormField>

          {submitErr && <p className="text-xs font-medium text-destructive">{submitErr}</p>}
        </div>
      )}
    </AdminModal>
  );
}
