// Strict CORS for PUBLIC unauthenticated edge functions.
// Authenticated functions can keep the permissive `_shared/cors.ts` wildcard
// since they require a Bearer token. Public endpoints (form-submit,
// public-booking-setup-card, trigger-form-view) are reachable without auth and
// must be locked to known Kiruvo origins to prevent cross-origin abuse.

const ALLOWED_ORIGINS = new Set<string>([
  "https://kiruvo.com",
  "https://www.kiruvo.com",
  "https://lovably-reach-hub.lovable.app",
  // Lovable preview origins follow the pattern `https://*.lovable.app`
]);

const LOVABLE_PREVIEW_RE = /^https:\/\/[a-z0-9-]+\.lovable\.app$/i;

export function publicCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowed =
    ALLOWED_ORIGINS.has(origin) || LOVABLE_PREVIEW_RE.test(origin);

  return {
    // Echo the origin only when it's explicitly allowed. Browsers reject a
    // mismatched value, which is the desired behavior for disallowed origins.
    "Access-Control-Allow-Origin": allowed ? origin : "https://kiruvo.com",
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}
