import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateCustomFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCustomFieldDialog({ open, onOpenChange, onSuccess }: CreateCustomFieldDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    object_type: "lead",
    field_name: "",
    field_label: "",
    field_type: "text",
    is_required: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!workspace) throw new Error("No workspace found");

      const { error } = await supabase.from("custom_fields").insert({
        workspace_id: workspace.id,
        object_type: formData.object_type,
        field_name: formData.field_name.toLowerCase().replace(/\s+/g, '_'),
        field_label: formData.field_label,
        field_type: formData.field_type,
        is_required: formData.is_required,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Custom field created successfully",
      });
      
      onSuccess();
      onOpenChange(false);
      setFormData({
        object_type: "lead",
        field_name: "",
        field_label: "",
        field_type: "text",
        is_required: false,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Custom Field</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="object_type">Object Type *</Label>
            <Select
              value={formData.object_type}
              onValueChange={(value) => setFormData({ ...formData, object_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="contact">Contact</SelectItem>
                <SelectItem value="opportunity">Opportunity</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="field_label">Field Label *</Label>
            <Input
              id="field_label"
              required
              value={formData.field_label}
              onChange={(e) => setFormData({ ...formData, field_label: e.target.value, field_name: e.target.value })}
              placeholder="e.g. Industry"
            />
          </div>
          <div>
            <Label htmlFor="field_type">Field Type *</Label>
            <Select
              value={formData.field_type}
              onValueChange={(value) => setFormData({ ...formData, field_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="checkbox">Checkbox</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_required"
              checked={formData.is_required}
              onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked as boolean })}
            />
            <Label htmlFor="is_required">Required field</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Field"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}