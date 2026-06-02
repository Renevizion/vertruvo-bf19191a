import { useEffect } from "react";
import { toast } from "sonner";
import { ErrorToast } from "@/components/ui/error-toast";
import { supabase } from "@/integrations/supabase/client";

const recentErrorToasts = new Map<string, number>();
const ERROR_TOAST_COOLDOWN_MS = 15000;

function shouldShowErrorToast(message: string) {
  const now = Date.now();
  const lastShownAt = recentErrorToasts.get(message) ?? 0;
  if (now - lastShownAt < ERROR_TOAST_COOLDOWN_MS) return false;
  recentErrorToasts.set(message, now);
  return true;
}

async function persistErrorEvent(payload: {
  message: string;
  stack?: string;
  source?: string;
  context: Record<string, unknown>;
}) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    let workspaceId: string | null = null;
    if (auth?.user) {
      const { data } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      workspaceId = data?.workspace_id ?? null;
    }
    await supabase.from("error_events").insert({
      workspace_id: workspaceId,
      user_id: auth?.user?.id ?? null,
      message: payload.message.slice(0, 2000),
      stack: payload.stack?.slice(0, 8000) ?? null,
      source: payload.source ?? null,
      url: window.location.href,
      user_agent: navigator.userAgent,
      context: payload.context as any,
    });
  } catch (err) {
    console.warn("[Error Reporter] Failed to persist:", err);
  }
}

// External errors to suppress (Twitter in-app browser, extensions, analytics, etc.)
const EXTERNAL_ERROR_PATTERNS = [
  "CONFIG",
  "Can't find variable",
  "__NEXT",
  "analytics",
  "gtag",
  "fbq",
  "Script error",
  "ResizeObserver",
  "Loading chunk",
  "ChunkLoadError",
];

function isExternalError(message: string): boolean {
  return EXTERNAL_ERROR_PATTERNS.some((pattern) => 
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}

export function useErrorReporting() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.message || event.error?.message || "";
      
      // Suppress external script errors (Twitter browser, extensions, etc.)
      if (isExternalError(errorMessage)) {
        console.warn('[Error Reporter] Suppressed external error:', errorMessage);
        event.preventDefault();
        return;
      }

      event.preventDefault();
      
      const error = event.error || new Error(event.message);
      const errorContext = {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      console.error('[Error Reporter] Caught error:', error);
      void persistErrorEvent({
        message: error.message || event.message || "Unknown error",
        stack: error.stack,
        source: "window.onerror",
        context: errorContext,
      });

      if (!shouldShowErrorToast(errorMessage || error.message || "Unknown error")) return;

      // Show custom error toast
      toast.custom(
        (t) => (
          <ErrorToast
            error={error}
            errorContext={errorContext}
            onDismiss={() => toast.dismiss(t)}
          />
        ),
        {
          id: `runtime-error-${errorMessage || error.message || "unknown"}`,
          duration: Infinity,
          position: 'top-right',
        }
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || String(event.reason) || "";
      
      // Suppress external script errors
      if (isExternalError(errorMessage)) {
        console.warn('[Error Reporter] Suppressed external rejection:', errorMessage);
        event.preventDefault();
        return;
      }

      event.preventDefault();
      
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      const errorContext = {
        type: 'unhandled_rejection',
        promise: String(event.promise),
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      console.error('[Error Reporter] Unhandled rejection:', error);
      void persistErrorEvent({
        message: error.message || "Unhandled promise rejection",
        stack: error.stack,
        source: "unhandledrejection",
        context: errorContext,
      });

      if (!shouldShowErrorToast(errorMessage || error.message || "Unhandled promise rejection")) return;

      toast.custom(
        (t) => (
          <ErrorToast
            error={error}
            errorContext={errorContext}
            onDismiss={() => toast.dismiss(t)}
          />
        ),
        {
          id: `runtime-rejection-${errorMessage || error.message || "unknown"}`,
          duration: Infinity,
          position: 'top-right',
        }
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
}
