import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FormPreviewProps {
  form: {
    name: string;
    description: string | null;
    fields: any[];
  };
}

export function FormPreview({ form }: FormPreviewProps) {
  const renderField = (field: any) => {
    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            id={`preview-${field.name}`}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            required={field.required}
          />
        );

      case "select":
        return (
          <Select>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((option: string) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "checkbox":
        if (field.options && field.options.length > 0) {
          return (
            <div className="space-y-2 mt-1">
              {field.options.map((option: string) => (
                <div key={option} className="flex items-center gap-2">
                  <Checkbox id={`preview-${field.name}-${option}`} />
                  <Label htmlFor={`preview-${field.name}-${option}`} className="font-normal text-sm cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2 mt-1">
            <Checkbox id={`preview-${field.name}`} />
            <Label htmlFor={`preview-${field.name}`} className="font-normal text-sm cursor-pointer">
              {field.label}
            </Label>
          </div>
        );

      case "date":
        return (
          <Input id={`preview-${field.name}`} type="date" required={field.required} />
        );

      default:
        return (
          <Input
            id={`preview-${field.name}`}
            type={field.type}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            required={field.required}
          />
        );
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-background border rounded-lg">
      <h3 className="text-xl font-semibold mb-2">{form.name}</h3>
      {form.description && (
        <p className="text-sm text-muted-foreground mb-4">{form.description}</p>
      )}
      
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        {form.fields.map((field: any) => (
          <div key={field.name}>
            {!(field.type === "checkbox" && (!field.options || field.options.length === 0)) && (
              <Label htmlFor={`preview-${field.name}`}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
            )}
            {renderField(field)}
          </div>
        ))}
        <Button type="submit" className="w-full">Submit</Button>
      </form>
    </div>
  );
}
