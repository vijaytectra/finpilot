import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { jsonResponse, renderWithClient } from "@/test/render";

import { LoginForm } from "./login-form";

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("next=/customers"),
  useRouter: () => ({ push: vi.fn(), replace: navigation.replace, prefetch: vi.fn() }),
}));

describe("LoginForm demo accounts", () => {
  beforeEach(() => navigation.replace.mockReset());

  it("signs in with the admin demo account in one click and follows ?next", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ user: { email: "admin@finpilot.local", full_name: "Demo Admin", role: "ADMIN" } }),
    );

    renderWithClient(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: /Sign in as Admin/ }));

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/customers"));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/auth/login");
    expect(JSON.parse(String(init.body))).toEqual({ email: "admin@finpilot.local", password: "Admin@12345" });
  });
});
