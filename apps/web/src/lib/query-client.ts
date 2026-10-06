import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { isApiError } from "@/lib/api/client";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: { skipAuthRedirect?: boolean };
  }
}

let redirecting = false;

/** Session expired or missing: drop every cached query and send the user to login. */
export function redirectToLogin(queryClient: QueryClient): void {
  if (typeof window === "undefined" || redirecting) return;
  if (window.location.pathname === "/login") return;
  redirecting = true;
  queryClient.clear();
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login?next=${encodeURIComponent(next)}&reason=expired`);
}

export function makeQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (isApiError(error) && error.isUnauthorized) redirectToLogin(client);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.meta?.skipAuthRedirect) return;
        if (isApiError(error) && error.isUnauthorized) redirectToLogin(client);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        // Client errors (4xx) are deterministic: retrying only delays the error state.
        retry: (failureCount, error) => {
          if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
  return client;
}
