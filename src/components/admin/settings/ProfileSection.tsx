import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { accessLabel } from "@/lib/admin-nav";
import { getDepartment } from "@/lib/data/departments";
import { SettingsRow, SettingsSection, type MyAccount } from "./shared";

export function ProfileSection({ me }: { me: MyAccount }) {
  const qc = useQueryClient();
  const member = me.member;
  const [name, setName] = useState(member?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const avatar = useQuery({
    queryKey: ["my-avatar", member?.avatar_path],
    enabled: !!member?.avatar_path,
    queryFn: async () =>
      (await supabase.storage.from("avatars").createSignedUrl(member!.avatar_path!, 3600)).data
        ?.signedUrl ?? null,
  });

  const roleLabel = accessLabel(me.roles.includes("admin"), member?.position);
  const department = member?.department ? getDepartment(member.department) : undefined;
  const trimmed = name.trim();
  const unchanged = !member || trimmed === member.full_name;
  const invalid = trimmed.length < 2 || trimmed.length > 120;

  const copyCode = async () => {
    if (!member) return;
    try {
      await navigator.clipboard.writeText(member.member_code);
      toast.success("Đã sao chép mã thành viên");
    } catch {
      toast.error("Không sao chép được mã thành viên");
    }
  };

  const saveName = async () => {
    setSaving(true);
    const { error } = await supabase.rpc("update_my_profile", {
      _full_name: trimmed,
      _avatar_path: null as unknown as string,
    });
    setSaving(false);
    if (error) return void toast.error(error.message);
    setName(trimmed);
    toast.success("Đã cập nhật họ tên");
    qc.invalidateQueries({ queryKey: ["my-account"] });
  };

  const uploadAvatar = async (file: File) => {
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 3 * 1024 * 1024
    )
      return void toast.error("Ảnh phải là PNG/JPG/WEBP và ≤ 3MB.");
    if (!member) return;
    setUploading(true);
    const { data: u } = await supabase.auth.getUser();
    const path = `${u.user!.id}/${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      setUploading(false);
      return void toast.error("Không tải được ảnh: " + error.message);
    }
    const { error: e2 } = await supabase.rpc("update_my_profile", {
      _full_name: member.full_name,
      _avatar_path: path,
    });
    setUploading(false);
    if (e2) return void toast.error(e2.message);
    toast.success("Đã cập nhật ảnh đại diện");
    qc.invalidateQueries({ queryKey: ["my-account"] });
  };

  const displayName = member?.full_name ?? me.email;
  const initial = (member?.full_name ?? me.email).trim().charAt(0).toUpperCase();

  return (
    <SettingsSection
      id="profile"
      icon={UserRound}
      title="Hồ sơ"
      description="Thông tin hiển thị của bạn trong hệ thống TML."
    >
      <div className="flex items-center gap-4 py-4">
        {member ? (
          avatar.data ? (
            <img
              src={avatar.data}
              alt=""
              className="h-16 w-16 shrink-0 rounded-xl object-cover ring-2 ring-border/80"
            />
          ) : (
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-primary/10 text-lg font-semibold text-primary ring-2 ring-border/80">
              {initial || <UserRound className="h-6 w-6" />}
            </div>
          )
        ) : (
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-2 ring-border/80">
            <UserRound className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-foreground">{displayName}</p>
          <p className="truncate text-sm text-muted-foreground">{me.email}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {member && (
              <button
                type="button"
                onClick={copyCode}
                aria-label="Sao chép mã thành viên"
                className="inline-flex items-center gap-1 rounded-md border border-border/80 px-2 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
              >
                {member.member_code}
                <Copy className="h-3 w-3" />
              </button>
            )}
            {roleLabel && (
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {roleLabel}
              </span>
            )}
            {department && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {department.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {member ? (
        <>
          <SettingsRow label="Họ tên" hint="Tên hiển thị trên hồ sơ và sơ đồ tổ chức.">
            <div className="flex items-center gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="sm:w-72"
                aria-label="Họ tên"
              />
              <Button type="button" onClick={saveName} disabled={saving || unchanged || invalid}>
                Lưu
              </Button>
            </div>
          </SettingsRow>

          <SettingsRow label="Ảnh đại diện" hint="PNG, JPG hoặc WebP, tối đa 3 MB">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadAvatar(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? <Spinner className="h-4 w-4" /> : null}
              Đổi ảnh
            </Button>
          </SettingsRow>
        </>
      ) : (
        <p className="py-4 text-sm text-muted-foreground">
          Tài khoản này chưa gắn hồ sơ thành viên nên không có tên và ảnh để chỉnh.
        </p>
      )}
    </SettingsSection>
  );
}
