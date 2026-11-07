import { Check, Moon, Palette, Sun } from "lucide-react";
import { setTheme, useTheme, type Theme } from "@/lib/theme";
import { SettingsSection } from "./shared";

const THEMES: { value: Theme; label: string; desc: string; icon: typeof Sun }[] = [
  {
    value: "light",
    label: "Chế độ sáng",
    desc: "Nền trắng, chữ xanh đậm — giao diện mặc định.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Chế độ tối",
    desc: "Nền navy đậm, chữ sáng, giữ tông xanh thương hiệu TML.",
    icon: Moon,
  },
];

export function AppearanceSection() {
  const theme = useTheme();
  return (
    <SettingsSection
      id="appearance"
      icon={Palette}
      title="Giao diện"
      description="Lựa chọn được lưu trên thiết bị này."
    >
      <div className="grid gap-3 py-4 sm:grid-cols-2">
        {THEMES.map(({ value, label, desc, icon: Icon }) => {
          const active = theme === value;
          const light = value === "light";
          return (
            // eslint-disable-next-line no-restricted-syntax -- thẻ chọn giao diện có ô xem trước phủ toàn thẻ, Button của kit không hợp
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setTheme(value)}
              className={`overflow-hidden rounded-xl border text-left transition-all duration-200 ${
                active
                  ? "border-primary ring-1 ring-primary/30"
                  : "border-border hover:border-primary/50 hover:bg-accent/40"
              }`}
            >
              <div
                className={`h-[72px] space-y-2 border-b p-3 ${
                  light ? "border-slate-200 bg-white" : "border-white/10 bg-[#0b1220]"
                }`}
              >
                <div className={`h-2 w-2/3 rounded ${light ? "bg-slate-200" : "bg-white/10"}`} />
                <div className={`h-2 w-full rounded ${light ? "bg-slate-300" : "bg-white/10"}`} />
                <div className={`h-2 w-1/2 rounded ${light ? "bg-slate-300" : "bg-white/10"}`} />
              </div>
              <div className="flex items-start gap-3 p-4">
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? "bg-primary text-primary-foreground" : "bg-muted text-primary"}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    {label}
                    {active && <Check className="h-4 w-4 text-primary" />}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </SettingsSection>
  );
}
