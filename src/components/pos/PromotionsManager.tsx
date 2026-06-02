import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Tag, Percent, DollarSign, Gift, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, isPast } from "date-fns";

const DISCOUNT_TYPES = [
  { value: "percentage", label: "Percentage Off", icon: Percent },
  { value: "fixed_amount", label: "Fixed Amount Off", icon: DollarSign },
  { value: "bogo", label: "Buy One Get One", icon: Gift },
  { value: "custom", label: "Custom Offer", icon: Tag },
];

interface PromotionForm {
  name: string;
  description: string;
  discount_type: string;
  discount_value: number;
  promo_code: string;
  item_ids: string[];
  applies_to_all_items: boolean;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
  max_uses: number | null;
  terms: string;
}

const defaultForm: PromotionForm = {
  name: "",
  description: "",
  discount_type: "percentage",
  discount_value: 0,
  promo_code: "",
  item_ids: [],
  applies_to_all_items: false,
  starts_at: new Date().toISOString().slice(0, 16),
  expires_at: "",
  is_active: true,
  max_uses: null,
  terms: "",
};

export function PromotionsManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PromotionForm>(defaultForm);

  const { data: promotions, isLoading } = useQuery({
    queryKey: ["promotions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: items } = useQuery({
    queryKey: ["items-for-promos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("id, title, price, item_type")
        .eq("is_active", true)
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  const getWorkspaceId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    return data?.workspace_id;
  };

  const saveMutation = useMutation({
    mutationFn: async (formData: PromotionForm) => {
      const workspaceId = await getWorkspaceId();
      if (!workspaceId) throw new Error("No workspace");

      const payload = {
        workspace_id: workspaceId,
        name: formData.name,
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        promo_code: formData.promo_code || null,
        item_ids: formData.applies_to_all_items ? [] : formData.item_ids,
        applies_to_all_items: formData.applies_to_all_items,
        starts_at: formData.starts_at || new Date().toISOString(),
        expires_at: formData.expires_at || null,
        is_active: formData.is_active,
        max_uses: formData.max_uses,
        terms: formData.terms || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("promotions")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("promotions")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(defaultForm);
      toast.success(editingId ? "Promotion updated" : "Promotion created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promotions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      toast.success("Promotion deleted");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("promotions")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["promotions"] }),
  });

  const openEdit = (promo: any) => {
    setEditingId(promo.id);
    setForm({
      name: promo.name,
      description: promo.description || "",
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      promo_code: promo.promo_code || "",
      item_ids: promo.item_ids || [],
      applies_to_all_items: promo.applies_to_all_items || false,
      starts_at: promo.starts_at ? new Date(promo.starts_at).toISOString().slice(0, 16) : "",
      expires_at: promo.expires_at ? new Date(promo.expires_at).toISOString().slice(0, 16) : "",
      is_active: promo.is_active,
      max_uses: promo.max_uses,
      terms: promo.terms || "",
    });
    setDialogOpen(true);
  };

  const getStatusBadge = (promo: any) => {
    if (!promo.is_active) return <Badge variant="secondary">Inactive</Badge>;
    if (promo.expires_at && isPast(new Date(promo.expires_at)))
      return <Badge variant="destructive">Expired</Badge>;
    if (promo.max_uses && promo.current_uses >= promo.max_uses)
      return <Badge variant="outline">Maxed Out</Badge>;
    return <Badge className="bg-primary/15 text-primary border-0">Active</Badge>;
  };

  const getDiscountDisplay = (promo: any) => {
    switch (promo.discount_type) {
      case "percentage":
        return `${promo.discount_value}% off`;
      case "fixed_amount":
        return `$${promo.discount_value} off`;
      case "bogo":
        return "Buy 1 Get 1";
      case "custom":
        return promo.description || "Custom";
      default:
        return `${promo.discount_value}`;
    }
  };

  const getItemNames = (itemIds: string[]) => {
    if (!items || !itemIds?.length) return null;
    return items
      .filter((i) => itemIds.includes(i.id))
      .map((i) => i.title)
      .join(", ");
  };

  const handleItemToggle = (itemId: string) => {
    setForm((prev) => ({
      ...prev,
      item_ids: prev.item_ids.includes(itemId)
        ? prev.item_ids.filter((id) => id !== itemId)
        : [...prev.item_ids, itemId],
    }));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Promotions
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) { setEditingId(null); setForm(defaultForm); }
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Promotion
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "Create"} Promotion</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Promotion Name *</Label>
                <Input
                  placeholder="e.g., Summer Special 20% Off"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="What's the offer? e.g., 20% off all lessons for new clients"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Discount Type</Label>
                  <Select
                    value={form.discount_type}
                    onValueChange={(v) => setForm({ ...form, discount_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DISCOUNT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>
                    {form.discount_type === "percentage" ? "Discount %" : form.discount_type === "fixed_amount" ? "Amount ($)" : "Value"}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={form.discount_type === "percentage" ? 100 : undefined}
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label>Promo Code (optional)</Label>
                <Input
                  placeholder="e.g., SUMMER20"
                  value={form.promo_code}
                  onChange={(e) => setForm({ ...form, promo_code: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={form.applies_to_all_items}
                  onCheckedChange={(v) => setForm({ ...form, applies_to_all_items: v, item_ids: [] })}
                />
                <Label>Applies to all products/services</Label>
              </div>

              {!form.applies_to_all_items && (
                <div>
                  <Label>Select Items This Applies To</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1 mt-1">
                    {items?.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={form.item_ids.includes(item.id)}
                          onChange={() => handleItemToggle(item.id)}
                          className="rounded"
                        />
                        <span className="flex-1">{item.title}</span>
                        <span className="text-muted-foreground text-xs">${item.price}</span>
                        <Badge variant="outline" className="text-[10px]">{item.item_type}</Badge>
                      </label>
                    ))}
                    {(!items || items.length === 0) && (
                      <p className="text-muted-foreground text-xs text-center py-2">
                        No items found. Add products/services first.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Starts At</Label>
                  <Input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Expires At (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Max Uses (leave empty for unlimited)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Unlimited"
                  value={form.max_uses ?? ""}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value ? Number(e.target.value) : null })}
                />
              </div>

              <div>
                <Label>Terms & Conditions (optional)</Label>
                <Textarea
                  placeholder="e.g., Cannot be combined with other offers. New clients only."
                  value={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <Label>Active</Label>
              </div>

              <Button
                onClick={() => saveMutation.mutate(form)}
                disabled={!form.name || saveMutation.isPending}
                className="w-full"
              >
                {saveMutation.isPending ? "Saving..." : editingId ? "Update Promotion" : "Create Promotion"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Create promotions here. Your AI voice assistant (Thermi) will <strong>only</strong> offer these active promotions to leads — nothing else.
        </p>

        {isLoading ? (
          <p className="text-muted-foreground text-sm text-center py-6">Loading...</p>
        ) : !promotions?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Tag className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No promotions yet</p>
            <p className="text-xs mt-1">Create your first promotion so Thermi knows what to offer</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Promotion</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.map((promo) => (
                <TableRow key={promo.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{promo.name}</p>
                      {promo.promo_code && (
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{promo.promo_code}</code>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{getDiscountDisplay(promo)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                    {promo.applies_to_all_items
                      ? "All items"
                      : getItemNames(promo.item_ids) || "No items selected"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {promo.expires_at ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(promo.expires_at), "MMM d, yyyy")}
                      </span>
                    ) : (
                      "No expiry"
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(promo)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Switch
                        checked={promo.is_active}
                        onCheckedChange={(v) => toggleMutation.mutate({ id: promo.id, active: v })}
                      />
                      <Button size="icon" variant="ghost" onClick={() => openEdit(promo)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(promo.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
