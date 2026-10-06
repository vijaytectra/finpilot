"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authApi } from "./api";
import type { LoginRequest } from "./types";

export const authKeys = {
  me: ["auth", "me"] as const,
};

/** The signed-in user. A 401 here triggers the global redirect to /login. */
export function useMe() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: ({ signal }) => authApi.me(signal),
    staleTime: 5 * 60_000,
  });
}

export function useIsAdmin(): boolean {
  const { data } = useMe();
  return data?.role === "ADMIN";
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoginRequest) => authApi.login(payload),
    // A 401 here means "wrong credentials", not "session expired".
    meta: { skipAuthRedirect: true },
    onSuccess: (session) => {
      queryClient.clear();
      queryClient.setQueryData(authKeys.me, session.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    meta: { skipAuthRedirect: true },
    onSettled: () => {
      queryClient.clear();
      // Full navigation so no client state from the old session survives.
      window.location.assign("/login");
    },
  });
}
