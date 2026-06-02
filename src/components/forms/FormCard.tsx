import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code, Power, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Form {
  id: string;
  name: string;
  description: string | null;
  fields: any[];
  is_active: boolean;
  created_at: string;
}

interface FormCardProps {
  form: Form;
  onViewEmbed: (form: Form) => void;
  onToggleActive: (formId: string, isActive: boolean) => void;
  onDelete: (formId: string) => void;
}

export function FormCard({ form, onViewEmbed, onToggleActive, onDelete }: FormCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold">{form.name}</h3>
            <Badge variant={form.is_active ? "default" : "secondary"}>
              {form.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          {form.description && (
            <p className="text-sm text-muted-foreground mb-2">{form.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Created {format(new Date(form.created_at), 'MMM d, yyyy')}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-2">
          {form.fields.length} field{form.fields.length !== 1 ? 's' : ''}
        </p>
        <div className="flex flex-wrap gap-1">
          {form.fields.slice(0, 3).map((field: any) => (
            <Badge key={field.name} variant="outline" className="text-xs">
              {field.label}
            </Badge>
          ))}
          {form.fields.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{form.fields.length - 3} more
            </Badge>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          className="flex-1"
          onClick={() => navigate(`/forms/${form.id}/edit`)}
        >
          <Edit className="w-4 h-4 mr-1" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewEmbed(form)}
        >
          <Code className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onToggleActive(form.id, form.is_active)}
        >
          <Power className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (confirm('Are you sure you want to delete this form?')) {
              onDelete(form.id);
            }
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
