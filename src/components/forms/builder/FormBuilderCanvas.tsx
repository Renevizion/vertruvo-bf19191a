import { GripVertical, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface FormField {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface FormBuilderCanvasProps {
  fields: FormField[];
  onUpdateField: (id: string, updates: Partial<FormField>) => void;
  onRemoveField: (id: string) => void;
  onMoveField: (fromIndex: number, toIndex: number) => void;
}

export function FormBuilderCanvas({
  fields,
  onUpdateField,
  onRemoveField,
  onMoveField,
}: FormBuilderCanvasProps) {
  if (fields.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/5">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Start Building Your Form</p>
          <p className="text-sm text-muted-foreground">
            Add fields from the left panel to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-muted/5">
      <div className="max-w-2xl mx-auto space-y-4">
        {fields.map((field, index) => (
          <Card key={field.id} className="p-6">
            <div className="flex items-start gap-4">
              <div className="cursor-move mt-2">
                <GripVertical className="w-5 h-5 text-muted-foreground" />
              </div>

              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`label-${field.id}`}>Field Label</Label>
                    <Input
                      id={`label-${field.id}`}
                      value={field.label}
                      onChange={(e) => onUpdateField(field.id, { label: e.target.value })}
                      placeholder="Enter field label"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`name-${field.id}`}>Field Name</Label>
                    <Input
                      id={`name-${field.id}`}
                      value={field.name}
                      onChange={(e) => onUpdateField(field.id, { name: e.target.value })}
                      placeholder="field_name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`placeholder-${field.id}`}>Placeholder</Label>
                  <Input
                    id={`placeholder-${field.id}`}
                    value={field.placeholder || ""}
                    onChange={(e) => onUpdateField(field.id, { placeholder: e.target.value })}
                    placeholder="Enter placeholder text"
                  />
                </div>

                {(field.type === 'select' || field.type === 'checkbox') && (
                  <div>
                    <Label htmlFor={`options-${field.id}`}>Options (one per line)</Label>
                    <Textarea
                      id={`options-${field.id}`}
                      value={(field.options || []).join('\n')}
                      onChange={(e) => onUpdateField(field.id, { options: e.target.value.split('\n').filter(Boolean) })}
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                      rows={4}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`required-${field.id}`}
                      checked={field.required}
                      onCheckedChange={(checked) => onUpdateField(field.id, { required: checked })}
                    />
                    <Label htmlFor={`required-${field.id}`}>Required field</Label>
                  </div>

                  <span className="text-sm text-muted-foreground capitalize">
                    {field.type}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveField(field.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
