import { useState, useRef, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * AAA Standard primitives — Apple/Manus/Perplexity-tier UX building blocks.
 * 1) Response Fidelity  2) Spatial Consistency  3) Progressive Disclosure  4) Error Recovery
 * Drop into any screen. No assumptions about what the screen does.
 */

/* ---------- 1) Response Fidelity ---------- */
export type SyncStatus = "synced" | "saving" | "error";

export function useOptimisticState<T>(initial: T, save: (val: T) => Promise<void>) {
  const [state, setState] = useState<T>(initial);
  const [status, setStatus] = useState<SyncStatus>("synced");
  const prev = useRef<T>(initial);

  const update = useCallback((next: T) => {
    prev.current = state;
    setState(next);
    setStatus("saving");
    save(next)
      .then(() => setStatus("synced"))
      .catch(() => { setState(prev.current); setStatus("error"); });
  }, [state, save]);

  return { state, update, status, setStatus };
}

export function SyncDot({ status, className }: { status: SyncStatus; className?: string }) {
  const map: Record<SyncStatus, string> = {
    synced: "bg-emerald-500",
    saving: "bg-amber-500 animate-pulse",
    error: "bg-destructive",
  };
  return <span aria-label={`Sync ${status}`} className={cn("inline-block h-2 w-2 rounded-full", map[status], className)} />;
}

/* ---------- 2) Spatial Consistency ---------- */
export function StableImage({ src, alt, aspect = "aspect-video", className }: { src: string; alt: string; aspect?: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={cn("relative bg-muted rounded-md overflow-hidden", aspect, className)}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn("size-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
      />
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div role="status" aria-label="Loading" className={cn("animate-pulse bg-muted rounded-md", className)} />;
}

/* ---------- 3) Progressive Disclosure ---------- */
export function ActionGroup({ primary, secondary, className }: { primary: ReactNode; secondary?: ReactNode; className?: string }) {
  return (
    <div className={cn("group flex items-center gap-2", className)}>
      <div className="flex-1 min-w-0">{primary}</div>
      {secondary && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
          {secondary}
        </div>
      )}
    </div>
  );
}

/* ---------- 4) Error Recovery ---------- */
export function InlineError({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("flex items-center gap-3 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm", className)}>
      <span aria-hidden className="h-2 w-2 rounded-full bg-destructive animate-pulse shrink-0" />
      <span className="flex-1 min-w-0 text-foreground">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-medium underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action, icon, className }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center p-8 rounded-lg border border-dashed bg-muted/30", className)}>
      {icon && <div className="mb-3 text-muted-foreground" aria-hidden>{icon}</div>}
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="mt-1 text-xs text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
