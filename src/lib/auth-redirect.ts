const SAFE_BASE = "http://rivr.local";
const AUTH_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]);

/**
 * Accept only same-origin paths. Reject protocol-relative, backslash, and
 * authentication-loop destinations so a crafted query string cannot turn the
 * post-login redirect into an open redirect.
 */
export function safeReturnTo(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(trimmed, SAFE_BASE);
  } catch {
    return undefined;
  }
  if (url.origin !== SAFE_BASE) return undefined;

  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return undefined;
  }
  if (
    !pathname.startsWith("/") ||
    pathname.startsWith("//") ||
    pathname.includes("\\") ||
    AUTH_PATHS.has(pathname)
  ) {
    return undefined;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
