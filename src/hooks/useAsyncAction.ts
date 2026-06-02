import { useState, useCallback } from "react";
import { toast } from "sonner";

interface UseAsyncActionOptions {
  pendingMessage?: string;
  successMessage?: string | ((result: unknown) => string);
  errorMessage?: string;
  silent?: boolean; // skip toast on success
}

interface UseAsyncActionReturn<T> {
  run: (...args: any[]) => Promise<T | undefined>;
  pending: boolean;
  pendingMessage: string;
}

/**
 * Wrap async actions so the UI flips to a pending state immediately, shows a
 * contextual progress label, and resolves to a success/error toast. Eliminates
 * the "click → 4 seconds of nothing" trust gap.
 */
export function useAsyncAction<T = unknown>(
  fn: (...args: any[]) => Promise<T>,
  opts: UseAsyncActionOptions = {},
): UseAsyncActionReturn<T> {
  const [pending, setPending] = useState(false);
  const pendingMessage = opts.pendingMessage ?? "Working…";

  const run = useCallback(
    async (...args: any[]) => {
      if (pending) return;
      setPending(true);
      try {
        const result = await fn(...args);
        if (!opts.silent) {
          const msg =
            typeof opts.successMessage === "function"
              ? opts.successMessage(result)
              : opts.successMessage;
          if (msg) toast.success(msg);
        }
        return result;
      } catch (err: any) {
        toast.error(opts.errorMessage ?? err?.message ?? "Something went wrong");
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [fn, pending, opts.silent, opts.successMessage, opts.errorMessage],
  );

  return { run, pending, pendingMessage };
}
