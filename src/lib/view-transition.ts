/**
 * Which navigations get a view transition (TASK-GE-211).
 * Pure so the rule can be unit-tested without a browser.
 */

/**
 * Paths that belong to the internal portals. Keep in sync with PORTAL_PREFIXES in
 * src/routes/__root.tsx; those pages never get a cross-fade.
 */
const PORTAL_PREFIXES = [
  "/login",
  "/admin",
  "/member",
  "/library-access",
  "/change-password",
  "/reset-password",
  "/auth",
] as const;

export function isPortalPath(pathname: string | undefined): boolean {
  if (!pathname) return false;
  return PORTAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

type LocationLike = { pathname: string } | undefined;

export type ViewTransitionInfo = {
  fromLocation?: LocationLike;
  toLocation: { pathname: string };
  pathChanged: boolean;
};

/**
 * Types for `document.startViewTransition`, or `false` to skip the transition.
 * Only a change of page between two public pages transitions; hash-only or
 * search-only changes and anything touching a portal do not.
 */
export function pickViewTransitionTypes(info: ViewTransitionInfo): string[] | false {
  if (!info.pathChanged) return false;
  if (isPortalPath(info.fromLocation?.pathname) || isPortalPath(info.toLocation.pathname)) {
    return false;
  }
  return ["site-nav"];
}
