import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Row = {
  id: string;
  workspace_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
};

const normEmail = (s?: string | null) => (s || "").trim().toLowerCase();
const normPhone = (s?: string | null) => (s || "").replace(/\D/g, "");

const CONTACT_FK_TABLES = [
  "activities",
  "call_logs",
  "conversations",
  "email_list_subscribers",
  "inbound_emails",
  "sales",
  "tasks",
];

const LEAD_FK_TABLES = [
  "activities",
  "bookings",
  "call_logs",
  "conversations",
  "email_list_subscribers",
  "form_submissions",
  "inbound_emails",
  "lead_payment_methods",
  "outreach_campaign_leads",
  "outreach_step_logs",
  "renewal_contacts",
  "sales",
  "tasks",
  "voice_broadcast_recipients",
];

// Stable fingerprint for an unordered set of record IDs.
const fingerprintIds = (ids: string[]) =>
  [...ids].map((s) => s.toLowerCase()).sort().join("|");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { data: ws } = await supabase.rpc("get_user_workspaces", { _user_id: userId });
    const workspaceIds: string[] = (ws || []).map((r: any) => r.workspace_id);
    if (workspaceIds.length === 0) {
      return new Response(JSON.stringify({ duplicates: 0, groups: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }

    // action: 'scan' (default), 'merge', 'ignore', 'unignore'
    const action: string = body?.action || (body?.dryRun ? "scan" : "merge");
    const scopeWorkspaceId: string | null =
      typeof body?.workspaceId === "string" && workspaceIds.includes(body.workspaceId)
        ? body.workspaceId
        : null;
    const targetWorkspaces = scopeWorkspaceId ? [scopeWorkspaceId] : workspaceIds;

    // ============ ACTION: ignore ============
    if (action === "ignore") {
      const groupIds: string[] = Array.isArray(body?.recordIds) ? body.recordIds : [];
      const tableName: "contacts" | "leads" = body?.table === "leads" ? "leads" : "contacts";
      const wsId: string | undefined = body?.workspaceId;
      if (!wsId || !workspaceIds.includes(wsId) || groupIds.length < 2) {
        return new Response(JSON.stringify({ error: "Invalid payload" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const fp = fingerprintIds(groupIds);
      const { error } = await supabase.from("duplicate_ignores").upsert({
        workspace_id: wsId,
        table_name: tableName,
        fingerprint: fp,
        record_ids: groupIds,
        created_by: userId,
      }, { onConflict: "workspace_id,table_name,fingerprint" });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load existing ignores for the target workspaces
    const { data: ignoreRows } = await supabase
      .from("duplicate_ignores")
      .select("workspace_id, table_name, fingerprint")
      .in("workspace_id", targetWorkspaces);
    const ignoredFingerprints = new Set(
      (ignoreRows || []).map((r: any) => `${r.workspace_id}::${r.table_name}::${r.fingerprint}`)
    );

    type GroupOut = {
      id: string; // group fingerprint, used as identifier
      table: "contacts" | "leads";
      workspace_id: string;
      keepId: string;
      deleteIds: string[];
      records: Row[];
      matchedBy: string[];
    };
    type CrossLink = {
      id: string;
      workspace_id: string;
      matchedBy: string[];
      lead: Row | null;
      contact: Row | null;
    };

    // Smarter pairwise matcher.
    // Always merges on identical email.
    // Phone match alone is NOT enough — phones get shared (family, businesses, test data).
    // Phone match counts as a duplicate ONLY if there's a corroborating signal:
    //   - identical email local-part (before @), OR
    //   - similar names (shared surname / token overlap / one is prefix of other), OR
    //   - one side is missing both name and email (likely a stub record), OR
    //   - no email conflict (neither side has an email, or only one side does)
    const normName = (s?: string | null) =>
      (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim().split(/\s+/).filter(Boolean);
    const emailLocal = (s?: string | null) => {
      const e = normEmail(s);
      const at = e.indexOf("@");
      return at > 0 ? e.slice(0, at) : "";
    };
    const namesSimilar = (a: string[], b: string[]) => {
      if (!a.length || !b.length) return false;
      const setA = new Set(a), setB = new Set(b);
      // Shared token (e.g., surname)?
      for (const t of setA) if (setB.has(t) && t.length >= 3) return true;
      // Prefix match (Russ -> Russell)?
      for (const ta of a) for (const tb of b) {
        if (ta.length >= 3 && tb.length >= 3 && (ta.startsWith(tb) || tb.startsWith(ta))) return true;
      }
      return false;
    };

    const isLikelyDuplicate = (a: Row, b: Row): { dup: boolean; via: string[] } => {
      const via: string[] = [];
      const ea = normEmail(a.email), eb = normEmail(b.email);
      const pa = normPhone(a.phone), pb = normPhone(b.phone);
      const emailMatch = !!ea && ea === eb;
      const phoneMatch = !!pa && pa.length >= 7 && pa === pb;
      if (emailMatch) via.push("email");
      if (phoneMatch) via.push("phone");
      if (emailMatch) return { dup: true, via };
      if (!phoneMatch) return { dup: false, via };

      const localA = emailLocal(a.email), localB = emailLocal(b.email);
      const emailLocalMatch = !!localA && localA === localB;
      const emailConflict = !!ea && !!eb && ea !== eb;
      const nameA = normName(a.name), nameB = normName(b.name);
      const nameSim = namesSimilar(nameA, nameB);
      const stubSide = (!ea && !nameA.length) || (!eb && !nameB.length);

      if (emailLocalMatch) { via.push("email-local"); return { dup: true, via }; }
      if (nameSim) { via.push("name"); return { dup: true, via }; }
      if (stubSide) return { dup: true, via };
      if (!emailConflict && !nameA.length && !nameB.length) return { dup: true, via };
      // Phone collision but different names + different emails => NOT a duplicate
      return { dup: false, via };
    };

    const groupRows = (rows: Row[]): { groups: Row[][]; matchInfo: Map<string, Set<string>> } => {
      const parent = new Map<string, string>();
      const find = (x: string): string => {
        let p = parent.get(x) ?? x;
        if (p === x) return x;
        const r = find(p);
        parent.set(x, r);
        return r;
      };
      const union = (a: string, b: string) => {
        const ra = find(a), rb = find(b);
        if (ra !== rb) parent.set(ra, rb);
      };
      for (const r of rows) parent.set(r.id, r.id);

      const matchInfo = new Map<string, Set<string>>();
      const addMatch = (id: string, keys: string[]) => {
        if (!matchInfo.has(id)) matchInfo.set(id, new Set());
        for (const k of keys) matchInfo.get(id)!.add(k);
      };

      // Bucket by email and phone separately, then run pairwise checks within each bucket only.
      const buckets = new Map<string, Row[]>();
      for (const r of rows) {
        const e = normEmail(r.email);
        const p = normPhone(r.phone);
        if (e) {
          const k = `e:${e}`;
          if (!buckets.has(k)) buckets.set(k, []);
          buckets.get(k)!.push(r);
        }
        if (p && p.length >= 7) {
          const k = `p:${p}`;
          if (!buckets.has(k)) buckets.set(k, []);
          buckets.get(k)!.push(r);
        }
      }

      for (const candidates of buckets.values()) {
        if (candidates.length < 2) continue;
        for (let i = 0; i < candidates.length; i++) {
          for (let j = i + 1; j < candidates.length; j++) {
            const a = candidates[i], b = candidates[j];
            const { dup, via } = isLikelyDuplicate(a, b);
            if (dup) {
              union(a.id, b.id);
              addMatch(a.id, via);
              addMatch(b.id, via);
            }
          }
        }
      }

      const groups = new Map<string, Row[]>();
      for (const r of rows) {
        const root = find(r.id);
        if (!groups.has(root)) groups.set(root, []);
        groups.get(root)!.push(r);
      }
      return { groups: Array.from(groups.values()).filter((g) => g.length > 1), matchInfo };
    };


    const allGroups: GroupOut[] = [];
    const crossLinks: CrossLink[] = [];
    // Cache rows per workspace for cross-table pass.
    const rowCache: Record<string, { contacts: Row[]; leads: Row[] }> = {};

    for (const wsId of targetWorkspaces) {
      rowCache[wsId] = { contacts: [], leads: [] };
      for (const table of ["contacts", "leads"] as const) {
        const { data: rows, error } = await supabase
          .from(table)
          .select(table === "leads"
            ? "id, workspace_id, name, email, phone, company, notes, created_at, updated_at"
            : "id, workspace_id, name, email, phone, company, created_at, updated_at")
          .eq("workspace_id", wsId)
          .order("created_at", { ascending: true });
        if (error) {
          console.error(`fetch ${table} failed`, error);
          continue;
        }
        rowCache[wsId][table] = (rows || []) as Row[];
        const { groups, matchInfo } = groupRows((rows || []) as Row[]);
        for (const g of groups) {
          const sorted = g.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          const keep = sorted[0];
          const dupes = sorted.slice(1);
          const fp = fingerprintIds(g.map((r) => r.id));
          if (ignoredFingerprints.has(`${wsId}::${table}::${fp}`)) continue;

          const matched = new Set<string>();
          for (const r of g) (matchInfo.get(r.id) || new Set()).forEach((m) => matched.add(m));

          allGroups.push({
            id: fp,
            table,
            workspace_id: wsId,
            keepId: keep.id,
            deleteIds: dupes.map((d) => d.id),
            records: sorted,
            matchedBy: Array.from(matched),
          });
        }
      }

      // Cross-table pass: lead <-> contact split records (same workspace).
      const { contacts, leads } = rowCache[wsId];
      for (const lead of leads) {
        for (const contact of contacts) {
          const { dup, via } = isLikelyDuplicate(lead, contact);
          if (!dup) continue;
          const fp = fingerprintIds([`lead:${lead.id}`, `contact:${contact.id}`]);
          if (ignoredFingerprints.has(`${wsId}::cross::${fp}`)) continue;
          crossLinks.push({
            id: fp,
            workspace_id: wsId,
            matchedBy: via,
            lead,
            contact,
          });
        }
      }
    }

    const duplicateCount = allGroups.reduce((n, g) => n + g.deleteIds.length, 0);

    // ============ ACTION: scan ============
    if (action === "scan") {
      return new Response(
        JSON.stringify({
          duplicates: duplicateCount,
          groupCount: allGroups.length,
          groups: allGroups,
          crossLinks,
          crossLinkCount: crossLinks.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ ACTION: merge ============
    // Optional `groupIds` filter (array of fingerprints) - merge only those.
    // Optional `keepOverrides`: { [groupFingerprint]: recordId } to choose primary.
    const groupIdFilter: Set<string> | null = Array.isArray(body?.groupIds)
      ? new Set<string>(body.groupIds)
      : null;
    const keepOverrides: Record<string, string> =
      body?.keepOverrides && typeof body.keepOverrides === "object" ? body.keepOverrides : {};

    const groupsToMerge = groupIdFilter
      ? allGroups.filter((g) => groupIdFilter.has(g.id))
      : allGroups;

    let deletedCount = 0;
    const deletedIds: string[] = [];

    for (const g of groupsToMerge) {
      // Resolve keep ID (allow override)
      let keepId = g.keepId;
      const override = keepOverrides[g.id];
      if (override && g.records.find((r) => r.id === override)) {
        keepId = override;
      }
      const deleteIds = g.records.map((r) => r.id).filter((id) => id !== keepId);

      const fkTables = g.table === "contacts" ? CONTACT_FK_TABLES : LEAD_FK_TABLES;
      const fkCol = g.table === "contacts" ? "contact_id" : "lead_id";

      const { data: keepRow } = await supabase
        .from(g.table)
        .select("*")
        .eq("id", keepId)
        .maybeSingle();
      const { data: dupRows } = await supabase
        .from(g.table)
        .select("*")
        .in("id", deleteIds);

      const fields = (g.table === "leads"
        ? ["name", "email", "phone", "company", "notes"]
        : ["name", "email", "phone", "company"]) as const;
      const patch: Record<string, any> = {};
      if (keepRow) {
        for (const f of fields) {
          if (!(keepRow as any)[f] && dupRows) {
            const better = dupRows.find((d: any) => d[f]);
            if (better) patch[f] = (better as any)[f];
          }
        }
        if (Object.keys(patch).length) {
          await supabase.from(g.table).update(patch).eq("id", keepId);
        }
      }

      for (const dupId of deleteIds) {
        for (const t of fkTables) {
          const { error: upErr } = await supabase
            .from(t)
            .update({ [fkCol]: keepId })
            .eq(fkCol, dupId);
          if (upErr) console.error(`reassign ${t}.${fkCol}`, upErr);
        }

        const dup = (dupRows || []).find((d: any) => d.id === dupId);
        if (dup) {
          await supabase.from("deleted_leads").insert({
            original_lead_id: dupId,
            name: (dup as any).name,
            email: (dup as any).email,
            phone: (dup as any).phone,
            company: (dup as any).company,
            source: (dup as any).source ?? null,
            value: (dup as any).value ?? null,
            notes: (dup as any).notes ?? null,
            stage_id: (dup as any).stage_id ?? null,
            workspace_id: g.workspace_id,
            created_at: (dup as any).created_at,
            deleted_by: userId,
          });
        }

        const { error: delErr } = await supabase.from(g.table).delete().eq("id", dupId);
        if (delErr) {
          console.error(`delete ${g.table} ${dupId}`, delErr);
        } else {
          deletedCount++;
          deletedIds.push(dupId);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Cleanup completed",
        deleted: deletedCount,
        duplicates: duplicateCount,
        groupCount: groupsToMerge.length,
        deletedIds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("cleanup-duplicates error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
