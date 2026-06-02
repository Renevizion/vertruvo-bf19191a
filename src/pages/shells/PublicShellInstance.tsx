import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShellRenderer, type ShellInstanceConfig } from "@/shells/ShellRenderer";
import { useShellHeartbeat } from "@/lib/shell-health";

export default function PublicShellInstance() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const isPreview = location.pathname.endsWith("/preview");
  const [instance, setInstance] = useState<ShellInstanceConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useShellHeartbeat(instance?.kind ?? "kiosk", null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: shell, error: shellErr } = await supabase.rpc(
        isPreview ? "get_preview_shell_instance" : "get_public_shell_instance",
        { _slug: slug },
      );
      if (cancelled) return;
      if (shellErr || !shell) {
        setError(isPreview ? "Shell not found (or you're not a member of its workspace)." : "Shell not found or not published.");
        setLoading(false);
        return;
      }
      const row = shell as Record<string, any>;
      setInstance({
        id: row.id,
        workspaceId: row.workspace_id,
        workspaceSlug: row.workspace_slug ?? null,
        kind: row.kind as ShellInstanceConfig["kind"],
        name: row.name,
        heroTitle: row.hero_title,
        heroSubtitle: row.hero_subtitle,
        accentColor: row.accent_color,
        capabilityKeys: row.capability_keys ?? [],
        brandName: row.brand_name ?? null,
        logoUrl: row.logo_url ?? null,
        supportEmail: row.support_email ?? null,
        footerNote: row.footer_note ?? null,
        layout: row.layout ?? {},
        isPreview,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug, isPreview]);

  if (loading) return <div className="min-h-[100dvh] flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (error || !instance) return <div className="min-h-[100dvh] flex items-center justify-center text-muted-foreground">{error || "Not found"}</div>;
  return <ShellRenderer instance={instance} />;
}
