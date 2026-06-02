import { Type, Mail, Phone, Hash, CheckSquare, List, Calendar, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";

interface FormElementsPanelProps {
  onAddField: (type: string) => void;
}

const FIELD_TYPES = [
  { type: 'text', label: 'Text Input', icon: Type },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'tel', label: 'Phone', icon: Phone },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'textarea', label: 'Long Text', icon: FileText },
  { type: 'select', label: 'Dropdown', icon: List },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'date', label: 'Date', icon: Calendar },
];

export function FormElementsPanel({ onAddField }: FormElementsPanelProps) {
  return (
    <div className="w-64 border-r bg-muted/5 p-4 overflow-y-auto">
      <h3 className="font-semibold mb-4">Form Elements</h3>
      <div className="space-y-2">
        {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
          <Card
            key={type}
            className="p-3 cursor-pointer hover:bg-accent hover:border-primary transition-colors"
            onClick={() => onAddField(type)}
          >
            <div className="flex items-center gap-3">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
