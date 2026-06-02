import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateCustomFieldDialog } from "./CreateCustomFieldDialog";

interface CustomField {
  id: string;
  object_type: string;
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
}

export function CustomFieldsManager() {
  const { toast } = useToast();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadFields = async () => {
    try {
      const { data, error } = await supabase
        .from("custom_fields")
        .select("*")
        .order("object_type", { ascending: true })
        .order("position", { ascending: true });

      if (error) throw error;
      setFields(data || []);
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

  useEffect(() => {
    loadFields();
  }, []);

  const groupedFields = fields.reduce((acc, field) => {
    if (!acc[field.object_type]) {
      acc[field.object_type] = [];
    }
    acc[field.object_type].push(field);
    return acc;
  }, {} as Record<string, CustomField[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Custom Fields</h3>
          <p className="text-sm text-muted-foreground">Add custom fields to your objects</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Field
        </Button>
      </div>

      {loading ? (
        <p>Loading fields...</p>
      ) : Object.keys(groupedFields).length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No custom fields created yet</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create First Field
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFields).map(([objectType, fields]) => (
            <Card key={objectType} className="p-6">
              <h4 className="font-semibold mb-4 capitalize">{objectType} Fields</h4>
              <div className="space-y-2">
                {fields.map((field) => (
                  <div key={field.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <span className="font-medium">{field.field_label}</span>
                      <span className="text-sm text-muted-foreground ml-2">({field.field_type})</span>
                      {field.is_required && (
                        <span className="text-xs text-destructive ml-2">Required</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateCustomFieldDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadFields}
      />
    </div>
  );
}