import { Link } from "@tanstack/react-router";
import { useEffect, useState, type MouseEventHandler, type ReactNode } from "react";
import { mainHomeUrl } from "@/lib/domain";

/** Use a full document navigation when Home crosses a portal boundary. */
export function HomeLink({ children, className, onClick }: {
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  const [externalHome, setExternalHome] = useState<string | null>(null);
  useEffect(() => { setExternalHome(mainHomeUrl(window.location.host)); }, []);

  if (externalHome) {
    return <a href={externalHome} className={className} onClick={onClick}>{children}</a>;
  }
  return <Link to="/" activeOptions={{ exact: true }} className={className} onClick={onClick}>{children}</Link>;
}