/**
 * Capability-as-URL deep linking.
 *
 * Any shell can be entered with `#cap=<key>` (and optional `&arg=value` pairs).
 * Example: `/shell/widget#cap=crm.capture&source=newsletter`
 *
 * This makes every capability addressable from any surface — emails, agent
 * suggestions, QR codes, partner widgets, billing receipts.
 *
 * See EMERGENCE.md §I.2 (Capability-as-URL).
 */
import { useEffect, useState } from "react";

export type DeepLink = {
  capabilityKey: string;
  args: Record<string, string>;
};

export function parseDeepLink(hash: string): DeepLink | null {
  if (!hash) return null;
  const clean = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(clean);
  const key = params.get("cap");
  if (!key) return null;
  const args: Record<string, string> = {};
  params.forEach((value, name) => {
    if (name !== "cap") args[name] = value;
  });
  return { capabilityKey: key, args };
}

/**
 * Subscribe to capability deep-links on the current window. Returns the
 * current link (or null) and updates when the hash changes.
 */
export function useCapabilityDeepLink(): DeepLink | null {
  const [link, setLink] = useState<DeepLink | null>(() =>
    typeof window === "undefined" ? null : parseDeepLink(window.location.hash),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => setLink(parseDeepLink(window.location.hash));
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  return link;
}

/** Build a capability deep link for a given shell route. */
export function buildCapabilityLink(shellPath: string, capabilityKey: string, args: Record<string, string> = {}): string {
  const params = new URLSearchParams({ cap: capabilityKey, ...args });
  return `${shellPath}#${params.toString()}`;
}
