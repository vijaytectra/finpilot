"use client";

import { AlertTriangle, RotateCw, ShieldAlert, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  error: unknown;
  /** Re-run the failed request. */
  onRetry?: () => void;
  isRetrying?: boolean;
  title?: string;
  className?: string;
  /** Smaller variant for use inside a card section. */
  compact?: boolean;
}

function describe(error: unknown): { title: string; message: string; icon: typeof AlertTriangle } {
  if (isApiError(error)) {
    if (error.status === 0) return { title: "You appear to be offline", message: error.message, icon: WifiOff };
    if (error.status === 403)
      return {
        title: "You don't have access",
        message: "Your role does not permit this action. Ask an administrator if you need access.",
        icon: ShieldAlert,
      };
    if (error.status >= 500)
      return {
        title: "Something went wrong on our side",
        message: "The service could not complete the request. Please try again.",
        icon: AlertTriangle,
      };
    return { title: "We couldn't load this", message: error.message, icon: AlertTriangle };
  }
  return { title: "We couldn't load this", message: "An unexpected error occurred.", icon: AlertTriangle };
}

/** Error panel with a retry action and the API request id (for support tickets). */
export function ErrorState({ error, onRetry, isRetrying, title, className, compact }: ErrorStateProps) {
  const info = describe(error);
  const Icon = info.icon;
  const requestId = isApiError(error) ? error.requestId : null;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-destructive/30 bg-negative-muted/40 text-center",
        compact ? "px-4 py-6" : "px-6 py-12",
        className,
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-negative-muted text-negative">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold">{title ?? info.title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{info.message}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} disabled={isRetrying}>
          <RotateCw className={cn(isRetrying && "animate-spin")} aria-hidden />
          Try again
        </Button>
      ) : null}
      {requestId ? (
        <p className="font-mono text-[11px] text-muted-foreground">
          Request ID: <span className="select-all">{requestId}</span>
        </p>
      ) : null}
    </div>
  );
}
