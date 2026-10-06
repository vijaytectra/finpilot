"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type ParamPatch = Record<string, string | readonly string[] | number | null | undefined>;

/** Apply a patch to URLSearchParams: null/undefined/"" removes the key, arrays repeat it. */
export function applyParamPatch(current: URLSearchParams, patch: ParamPatch): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(patch)) {
    next.delete(key);
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value as readonly string[]) next.append(key, item);
    } else {
      next.set(key, String(value));
    }
  }
  return next;
}

/**
 * URL is the source of truth for filters/sort/pagination, so views are shareable and the
 * back button works. `replace` is used for keystroke-level changes (search box).
 */
export function useSearchParamsUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (patch: ParamPatch, options: { replace?: boolean; resetPage?: boolean } = {}) => {
      const next = applyParamPatch(new URLSearchParams(searchParams.toString()), {
        ...patch,
        ...(options.resetPage ? { page: null } : {}),
      });
      const qs = next.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (options.replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [router, pathname, searchParams],
  );
}
