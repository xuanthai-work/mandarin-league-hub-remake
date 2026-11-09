/** Maps the 3 TML hostnames to the paths each portal serves. Other hosts (preview, localhost) never redirect. */
const ROOT_DOMAIN = "themandarinleague.bond";
const MAIN_ORIGIN = `https://${ROOT_DOMAIN}`;
const JOIN_ORIGIN = `https://join.${ROOT_DOMAIN}`;
const MEMBER_ORIGIN = `https://member.${ROOT_DOMAIN}`;

export type Portal = "main" | "join" | "member" | "other";

/** Home controls leave satellite portals; preview and main hosts keep local navigation. */
export function mainHomeUrl(host: string): string | null {
  const portal = portalOf(host);
  return portal === "join" || portal === "member" ? `${MAIN_ORIGIN}/` : null;
}

export function portalOf(host: string): Portal {
  const h = host.toLowerCase().split(":")[0];
  if (h === ROOT_DOMAIN || h === `www.${ROOT_DOMAIN}`) return "main";
  if (h === `join.${ROOT_DOMAIN}`) return "join";
  if (h === `member.${ROOT_DOMAIN}`) return "member";
  return "other";
}

const has = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(p + "/"));
const JOIN_PATHS = ["/join"];
const MEMBER_PATHS = [
  "/login",
  "/member",
  "/library-access",
  "/admin",
  "/change-password",
  "/reset-password",
  "/auth",
];

/** Returns the absolute URL to redirect to, or null when the path belongs on this host. */
export function domainRedirect(host: string, path: string, search = ""): string | null {
  const portal = portalOf(host);
  if (portal === "other") return null;
  if (portal === "join") {
    if (path === "/") return `${JOIN_ORIGIN}/join${search}`;
    if (has(path, JOIN_PATHS)) return null;
    if (has(path, MEMBER_PATHS)) return `${MEMBER_ORIGIN}${path}${search}`;
    return `${MAIN_ORIGIN}${path}${search}`;
  }
  if (portal === "member") {
    if (path === "/") return `${MEMBER_ORIGIN}/login${search}`;
    if (has(path, MEMBER_PATHS)) return null;
    if (has(path, JOIN_PATHS)) return `${JOIN_ORIGIN}${path}${search}`;
    return `${MAIN_ORIGIN}${path}${search}`;
  }
  if (has(path, JOIN_PATHS)) return `${JOIN_ORIGIN}${path}${search}`;
  if (has(path, MEMBER_PATHS)) return `${MEMBER_ORIGIN}${path}${search}`;
  return null;
}
