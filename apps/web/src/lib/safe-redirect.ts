const FALLBACK = "/";

/**
 * Validate a post-login `next` target so it can only ever point inside this app.
 *
 * String prefix checks are not enough: WHATWG URL parsing treats `\` as `/` for http(s),
 * so `/\evil.com` becomes `//evil.com`. Instead we reject backslashes and control/whitespace
 * characters outright, resolve against the app origin and accept only same-origin results.
 */
export function safeNextPath(next: string | null | undefined, origin: string = currentOrigin()): string {
  if (!next || !next.startsWith("/")) return FALLBACK;
  // Backslashes, ASCII control characters (incl. tab/CR/LF, which URL parsing strips) and spaces.
  if (/[\\\u0000-\u001f\u007f\s]/.test(next)) return FALLBACK;

  let url: URL;
  try {
    url = new URL(next, origin);
  } catch {
    return FALLBACK;
  }
  if (url.origin !== new URL(origin).origin) return FALLBACK;
  if (url.pathname === "/login" || url.pathname.startsWith("/login/")) return FALLBACK;
  return `${url.pathname}${url.search}${url.hash}`;
}

function currentOrigin(): string {
  return typeof window === "undefined" ? "http://localhost" : window.location.origin;
}
