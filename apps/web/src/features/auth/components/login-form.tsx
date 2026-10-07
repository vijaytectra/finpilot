"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { isApiError } from "@/lib/api/client";
import { safeNextPath } from "@/lib/safe-redirect";

import { useLogin } from "../hooks";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your work email").email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

type LoginValues = z.infer<typeof loginSchema>;

/**
 * One-click demo sign-in for reviewers. These are the seeded demo accounts already published
 * in the README; the API never creates them in production. Hide with NEXT_PUBLIC_DEMO_LOGINS=false.
 */
const DEMO_ACCOUNTS = [
  { role: "Admin", detail: "Full access + imports", email: "admin@finpilot.local", password: "Admin@12345" },
  { role: "Viewer", detail: "Read-only access", email: "viewer@finpilot.local", password: "Viewer@12345" },
] as const;
const SHOW_DEMO_LOGINS = process.env.NEXT_PUBLIC_DEMO_LOGINS !== "false";

function describeLoginError(error: unknown): string {
  if (!isApiError(error)) return "Something went wrong. Please try again.";
  switch (error.status) {
    case 401:
      return "The email or password is incorrect.";
    case 429:
      return "Too many sign-in attempts. Please wait a minute before trying again.";
    case 0:
      return error.message;
    default:
      return error.status >= 500 ? "The service is temporarily unavailable. Please try again shortly." : error.message;
  }
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();
  const sessionExpired = searchParams.get("reason") === "expired";

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => router.replace(safeNextPath(searchParams.get("next"))),
      onError: (error) => {
        if (isApiError(error) && error.status === 422) {
          for (const detail of error.details) {
            if (detail.field === "email" || detail.field === "password") {
              form.setError(detail.field, { type: "server", message: detail.message });
            }
          }
        }
      },
    });
  });

  const formError = login.isError && !(isApiError(login.error) && login.error.status === 422) ? login.error : null;

  return (
    <form onSubmit={onSubmit} noValidate aria-describedby={formError ? "login-error" : undefined}>
      <FieldGroup className="gap-5">
        {sessionExpired && !formError ? (
          <Alert>
            <AlertCircle aria-hidden />
            <AlertTitle>Your session has ended</AlertTitle>
            <AlertDescription>Please sign in again to continue.</AlertDescription>
          </Alert>
        ) : null}

        {formError ? (
          <Alert variant="destructive" id="login-error" aria-live="assertive">
            <AlertCircle aria-hidden />
            <AlertTitle>Sign-in failed</AlertTitle>
            <AlertDescription>{describeLoginError(formError)}</AlertDescription>
          </Alert>
        ) : null}

        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="email">Work email</FieldLabel>
              <Input
                {...field}
                id="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                autoFocus
                placeholder="name@finpilot.local"
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.error ? "email-error" : undefined}
              />
              <FieldError id="email-error" errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  {...field}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.error ? "password-error" : undefined}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldError id="password-error" errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
          {login.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <LogIn aria-hidden />}
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>

        {SHOW_DEMO_LOGINS ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" aria-hidden />
              Demo accounts
              <span className="h-px flex-1 bg-border" aria-hidden />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  disabled={login.isPending}
                  onClick={() => {
                    form.setValue("email", account.email);
                    form.setValue("password", account.password);
                    void onSubmit();
                  }}
                  className="group flex items-center justify-between gap-3 rounded-lg border bg-card px-3.5 py-3 text-left transition-colors outline-none hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">Sign in as {account.role}</span>
                    <span className="block truncate text-xs text-muted-foreground">{account.detail}</span>
                  </span>
                  <ArrowRight
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden
                  />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </FieldGroup>
    </form>
  );
}
