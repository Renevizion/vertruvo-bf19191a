import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link2, Check, ExternalLink, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { BookingManagementSheet } from "./BookingManagementSheet";

const BRAND_BOOKING_ORIGIN = "https://thermi.com";

type ShareWorkspace = {
  id: string;
  slug: string;
  name: string | null;
  website: string | null;
  role: string | null;
};

const getPublicAppOrigin = () => {
  const host = window.location.hostname.toLowerCase();
  const isInternalHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host.endsWith(".lovable.app");

  return isInternalHost ? BRAND_BOOKING_ORIGIN : window.location.origin;
};

const toPublicOrigin = (website?: string | null) => {
  const raw = website?.trim();
  if (raw) {
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return normalized.replace(/\/+$/, "");
  }

  return getPublicAppOrigin();
};

export function BookingShareWidget() {
  const [copied, setCopied] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  const { data: shareOptions, isLoading } = useQuery({
    queryKey: ["my-workspace-slug"],
    queryFn: async (): Promise<ShareWorkspace[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return [];

      const [{ data: ownedWorkspaces }, { data: memberships }] = await Promise.all([
        supabase.from("workspaces").select("id, slug, name").eq("owner_id", user.id),
        supabase
          .from("workspace_members")
          .select("workspace_id, role")
          .eq("user_id", user.id),
      ]);

      const roleByWorkspaceId = new Map<string, string | null>(
        (memberships ?? []).map((m) => [m.workspace_id, m.role])
      );

      for (const workspace of ownedWorkspaces ?? []) {
        roleByWorkspaceId.set(workspace.id, "owner");
      }

      const workspaceIds = Array.from(
        new Set([
          ...(ownedWorkspaces ?? []).map((w) => w.id),
          ...(memberships ?? []).map((m) => m.workspace_id),
        ])
      );

      if (!workspaceIds.length) return [];

      const [{ data: workspaces }, { data: settings }] = await Promise.all([
        supabase.from("workspaces").select("id, slug, name").in("id", workspaceIds),
        supabase
          .from("business_settings")
          .select("workspace_id, website")
          .in("workspace_id", workspaceIds),
      ]);

      const websiteByWorkspaceId = new Map(
        (settings ?? []).map((setting) => [setting.workspace_id, setting.website])
      );

      const rankRole = (role: string | null) => {
        if (role === "owner") return 0;
        if (role === "admin") return 1;
        return 2;
      };

      return (workspaces ?? [])
        .filter((workspace) => Boolean(workspace.slug))
        .map((workspace) => ({
          id: workspace.id,
          slug: workspace.slug,
          name: workspace.name ?? null,
          website: websiteByWorkspaceId.get(workspace.id) ?? null,
          role: roleByWorkspaceId.get(workspace.id) ?? null,
        }))
        .sort((a, b) => {
          const websiteScore = Number(Boolean(b.website?.trim())) - Number(Boolean(a.website?.trim()));
          if (websiteScore !== 0) return websiteScore;

          const roleScore = rankRole(a.role) - rankRole(b.role);
          if (roleScore !== 0) return roleScore;

          return (a.name ?? a.slug).localeCompare(b.name ?? b.slug);
        });
    },
  });

  useEffect(() => {
    if (!shareOptions?.length) return;

    const persistedWorkspaceId = localStorage.getItem("booking-share-workspace-id");

    const nextWorkspaceId =
      shareOptions.find((workspace) => workspace.id === selectedWorkspaceId)?.id ||
      shareOptions.find((workspace) => workspace.id === persistedWorkspaceId)?.id ||
      shareOptions[0].id;

    if (nextWorkspaceId !== selectedWorkspaceId) {
      setSelectedWorkspaceId(nextWorkspaceId);
    }
  }, [shareOptions, selectedWorkspaceId]);

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    localStorage.setItem("booking-share-workspace-id", selectedWorkspaceId);
  }, [selectedWorkspaceId]);

  const selectedWorkspace = useMemo(() => {
    if (!shareOptions?.length) return null;
    return shareOptions.find((workspace) => workspace.id === selectedWorkspaceId) ?? shareOptions[0];
  }, [shareOptions, selectedWorkspaceId]);

  if (isLoading || !selectedWorkspace?.slug) return null;

  const bookingUrl = `${toPublicOrigin(selectedWorkspace.website)}/book/${selectedWorkspace.slug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      toast.success("Booking link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy booking link");
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card text-sm">
      <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />

      {shareOptions.length > 1 ? (
        <Select value={selectedWorkspace.id} onValueChange={setSelectedWorkspaceId}>
          <SelectTrigger className="h-7 w-[165px] text-xs">
            <SelectValue placeholder="Select business" />
          </SelectTrigger>
          <SelectContent>
            {shareOptions.map((workspace) => (
              <SelectItem key={workspace.id} value={workspace.id} className="text-xs">
                {workspace.name || workspace.slug}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="text-muted-foreground truncate hidden sm:inline text-xs">
          {bookingUrl.replace(/^https?:\/\//, "")}
        </span>
      )}

      <span className="text-muted-foreground sm:hidden text-xs">Booking Link</span>

      <Button size="sm" variant="ghost" className="h-7 px-2 ml-auto shrink-0" onClick={handleCopy}>
        {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : "Copy"}
      </Button>

      <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
        <Button size="sm" variant="ghost" className="h-7 px-2 shrink-0" aria-label="Open booking page">
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </a>

      <Button size="sm" variant="ghost" className="h-7 px-2 shrink-0" onClick={() => setManageOpen(true)} aria-label="Manage drop-ins and booking">
        <Settings2 className="h-3.5 w-3.5" />
      </Button>

      <BookingManagementSheet
        open={manageOpen}
        onOpenChange={setManageOpen}
        workspaceId={selectedWorkspace.id}
        currentSlug={selectedWorkspace.slug}
      />
    </div>
  );
}
