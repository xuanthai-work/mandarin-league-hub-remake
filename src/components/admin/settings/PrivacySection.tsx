import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { SettingsRow, SettingsSection, type MyAccount } from "./shared";

export function PrivacySection({ member }: { member: NonNullable<MyAccount["member"]> }) {
  const qc = useQueryClient();
  const saved = member.is_public !== false;
  const [checked, setChecked] = useState(saved);
  const [busy, setBusy] = useState(false);

  const toggle = async (next: boolean) => {
    setChecked(next);
    setBusy(true);
    const { error } = await supabase.rpc("set_my_visibility", { _public: next });
    setBusy(false);
    if (error) {
      setChecked(saved);
      return void toast.error(error.message);
    }
    toast.success(
      next ? "Tên bạn đã hiện trên sơ đồ tổ chức" : "Tên bạn đã được ẩn khỏi sơ đồ tổ chức",
    );
    qc.invalidateQueries({ queryKey: ["my-account"] });
  };

  return (
    <SettingsSection
      id="privacy"
      icon={Eye}
      title="Riêng tư"
      description="Kiểm soát thông tin công khai về bạn."
    >
      <SettingsRow
        label="Hiện trên sơ đồ tổ chức"
        hint="Khi tắt, tên bạn được ẩn khỏi trang Tổ chức công khai. Thông tin nội bộ không đổi."
      >
        <Switch
          checked={checked}
          disabled={busy}
          onCheckedChange={(next) => void toggle(next)}
          aria-label="Hiện trên sơ đồ tổ chức"
        />
      </SettingsRow>
    </SettingsSection>
  );
}
