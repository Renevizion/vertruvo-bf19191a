/**
 * Auth call deduplication.
 *
 * Wraps `supabase.auth.getUser` with a short-lived in-flight + result cache so
 * dozens of concurrent React Query callers don't each hit /auth/v1/user.
 * The cache is invalidated on auth state changes (sign-in/out/token refresh).
 */
import { supabase } from "@/integrations/supabase/client";

type GetUserResult = Awaited<ReturnType<typeof supabase.auth.getUser>>;

const originalGetUser = supabase.auth.getUser.bind(supabase.auth);

let cached: { value: GetUserResult; expiresAt: number } | null = null;
let inflight: Promise<GetUserResult> | null = null;
const TTL_MS = 30_000;

async function cachedGetUser(): Promise<GetUserResult> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;
  if (inflight) return inflight;
  inflight = originalGetUser()
    .then((res) => {
      cached = { value: res, expiresAt: Date.now() + TTL_MS };
      return res;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

// Override on the auth instance — call sites continue to use supabase.auth.getUser().
(supabase.auth as unknown as { getUser: typeof cachedGetUser }).getUser = cachedGetUser;

supabase.auth.onAuthStateChange(() => {
  cached = null;
  inflight = null;
});
