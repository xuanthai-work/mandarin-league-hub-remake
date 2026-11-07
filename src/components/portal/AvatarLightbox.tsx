import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  src: string | null;
  name: string;
  initial: string;
  onChange: () => void;
  onClose: () => void;
};

/**
 * Shared avatar viewer used by the member pass and Settings › Hồ sơ.
 * Uses the project Button component and the blue `primary` theme instead of
 * one-off gold styling, so the frame and actions match the rest of the site.
 */
export function AvatarLightbox({ src, name, initial, onChange, onClose }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ảnh đại diện"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/80 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div className="relative max-h-[85vh] max-w-[90vw] overflow-hidden rounded-2xl border-2 border-primary/50 shadow-2xl shadow-primary/25 ring-1 ring-primary/20">
        {src ? (
          <img
            src={src}
            alt={name}
            className="max-h-[75vh] w-auto max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className="grid aspect-[3/4] h-[55vh] max-h-[75vh] place-items-center bg-secondary text-7xl font-bold text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {initial}
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-2.5 top-2.5 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
        >
          <X />
        </Button>
      </div>

      <p className="text-center text-sm text-white/70">{name} · Ảnh đại diện thành viên</p>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange();
          }}
          className="rounded-full"
        >
          <Camera />
          Đổi ảnh
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
        >
          Đóng
        </Button>
      </div>
    </div>
  );
}
