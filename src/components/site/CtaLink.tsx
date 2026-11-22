import { useRouter } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { safeHref } from "@/lib/site-content";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string };

export function CtaLink({ href, onClick, ...rest }: Props) {
  const router = useRouter();
  const safe = safeHref(href);
  const internal = safe.startsWith("/") && !safe.startsWith("//");
  const external = /^https?:\/\//i.test(safe);

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented || !internal) return;
    // Để trình duyệt xử lý khi mở tab mới / cửa sổ mới / tải xuống.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (rest.target && rest.target !== "_self") return;
    e.preventDefault();
    void router.navigate({ href: safe });
  }

  return (
    <a
      {...rest}
      href={safe}
      onClick={handleClick}
      {...(external
        ? { target: rest.target ?? "_blank", rel: rest.rel ?? "noopener noreferrer" }
        : {})}
    />
  );
}
