import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";

const BRAND_ORIGIN = "https://thermi.com";

const getBrandedUrl = (path: string) => {
  const host = window.location.hostname.toLowerCase();
  const isInternal =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host.endsWith(".lovable.app") ||
    host === "localhost";
  const origin = isInternal ? BRAND_ORIGIN : window.location.origin;
  return `${origin}${path}`;
};

interface BookingManagementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  currentSlug: string;
}

export function BookingManagementSheet({
  open,
  onOpenChange,
  workspaceId,
  currentSlug,
}: BookingManagementSheetProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [slugInput, setSlugInput] = useState(currentSlug);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  useEffect(() => {
    setSlugInput(currentSlug);
    setSlugStatus("idle");
  }, [currentSlug, open]);

  useEffect(() => {
    const normalized = slugInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/\s+/g, "-");
    if (!normalized || normalized === currentSlug) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("workspaces")
        .select("id")
        .eq("slug", normalized)
        .neq("id", workspaceId)
        .limit(1);
      setSlugStatus(data && data.length > 0 ? "taken" : "available");
    }, 500);
    return () => clearTimeout(timer);
  }, [slugInput, currentSlug, workspaceId]);

  const { data: items } = useQuery({
    queryKey: ["booking-items", workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("items")
        .select("id, title, price, is_active, item_type, duration_minutes, payment_timing")
        .eq("workspace_id", workspaceId)
        .in("item_type", ["service", "membership", "camp"])
        .order("title");
      return data ?? [];
    },
    enabled: open,
  });

  const { data: settings } = useQuery({
    queryKey: ["booking-settings", workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_settings")
        .select("portal_enabled, cancellation_policy_hours")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      return data;
    },
    enabled: open,
  });

  const saveSlug = useMutation({
    mutationFn: async (newSlug: string) => {
      const normalized = newSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/\s+/g, "-");
      const { error } = await supabase
        .from("workspaces")
        .update({ slug: normalized })
        .eq("id", workspaceId);
      if (error) throw error;
      return normalized;
    },
    onSuccess: (slug) => {
      toast.success(`Booking link updated to /book/${slug}`);
      queryClient.invalidateQueries({ queryKey: ["my-workspace-slug"] });
      setSlugStatus("idle");
    },
    onError: () => toast.error("Failed to update slug"),
  });

  const toggleItem = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("items").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["booking-items", workspaceId] }),
  });

  const togglePortal = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("business_settings")
        .update({ portal_enabled: enabled } as any)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-settings", workspaceId] });
      toast.success("Portal setting updated");
    },
  });

  const normalizedSlug = slugInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/\s+/g, "-");
  const canSaveSlug = slugStatus === "available" && normalizedSlug.length >= 2;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Manage Booking & Client Portal</SheetTitle>
          <SheetDescription>
            Configure your booking link, available services, and client portal.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Booking Link</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">/book/</span>
              <Input
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="your-custom-slug"
                className="h-8 text-sm"
              />
              {slugStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {slugStatus === "available" && <Check className="h-4 w-4 text-green-500" />}
              {slugStatus === "taken" && <X className="h-4 w-4 text-destructive" />}
            </div>
            {slugStatus === "taken" && (
              <p className="text-xs text-destructive">This slug is already taken. Try another.</p>
            )}
            {slugStatus === "available" && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-green-600">Available!</p>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!canSaveSlug || saveSlug.isPending}
                  onClick={() => saveSlug.mutate(normalizedSlug)}
                >
                  {saveSlug.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
            {slugStatus === "idle" && normalizedSlug === currentSlug && (
              <p className="text-xs text-muted-foreground">
                Current link: thermi.com/book/{currentSlug}
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Services on Booking Page</Label>
            <p className="text-xs text-muted-foreground">
              Toggle which offerings are visible on your public booking page.
            </p>
            {items && items.length > 0 ? (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 px-3 rounded-md border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          ${Number(item.price).toFixed(2)}
                        </span>
                        {item.duration_minutes && (
                          <span className="text-xs text-muted-foreground">
                            · {item.duration_minutes}min
                          </span>
                        )}
                        <Badge variant="outline" className="text-[10px] h-4">
                          {item.payment_timing === "upfront"
                            ? "Pay upfront"
                            : item.payment_timing === "at_close"
                            ? "Charge at close"
                            : "Free"}
                        </Badge>
                      </div>
                    </div>
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={(checked) =>
                        toggleItem.mutate({ id: item.id, active: checked })
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 border rounded-md bg-muted/30">
                <p className="text-sm text-muted-foreground">No services yet.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    onOpenChange(false);
                    navigate("/settings?tab=items");
                  }}
                >
                  Add your first item
                </Button>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Client Portal</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Let clients log in to view appointments and manage their account.
                </p>
              </div>
              <Switch
                checked={(settings as any)?.portal_enabled ?? true}
                onCheckedChange={(checked) => togglePortal.mutate(checked)}
              />
            </div>
            {(settings as any)?.portal_enabled !== false && (
              <p className="text-xs text-muted-foreground">
                Clients promoted from leads will receive login credentials and see their bookings, card on file, and available services here.
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Cancellation Policy</Label>
            <p className="text-xs text-muted-foreground">
              Appointments must be cancelled at least{" "}
              <span className="font-medium text-foreground">
                {settings?.cancellation_policy_hours ?? 24} hours
              </span>{" "}
              in advance.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => {
                onOpenChange(false);
                navigate("/settings?tab=business");
              }}
            >
              Edit policy
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}