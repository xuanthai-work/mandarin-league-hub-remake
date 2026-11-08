import { useState } from "react";

import { cn } from "@/lib/utils";

interface MemberAvatarProps {
  /** Signed URL of the member avatar; empty while it loads or when no avatar exists. */
  src?: string | null | undefined;
  name: string;
  className?: string;
  fallbackClassName?: string;
}

/** Two-letter monogram from the first and last word of a Vietnamese name. */
function memberInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "TML";
}

/**
 * Ảnh đại diện thành viên trong admin: ảnh tròn khi đã có avatar, chữ cái viết tắt
 * khi chưa có ảnh hoặc ảnh lỗi — cùng kích thước nên layout không nhảy.
 */
export function MemberAvatar({ src, name, className, fallbackClassName }: MemberAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = !!src && src !== failedSrc;

  if (showImage) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setFailedSrc(src)}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary",
        fallbackClassName ?? className,
      )}
    >
      {memberInitials(name)}
    </span>
  );
}
