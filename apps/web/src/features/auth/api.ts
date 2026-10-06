import { apiFetch } from "@/lib/api/client";

import type { LoginRequest, Session, User } from "./types";

export const authApi = {
  login: (payload: LoginRequest) => apiFetch<Session>("/auth/login", { method: "POST", body: payload }),
  logout: () => apiFetch<void>("/auth/logout", { method: "POST" }),
  me: (signal?: AbortSignal) => apiFetch<User>("/auth/me", { signal }),
};
