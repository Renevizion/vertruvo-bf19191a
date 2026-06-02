import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface FormField {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface FormPreviewPanelProps {
  formName: string;
  formDescription: string;
  fields: FormField[];
}

export function FormPreviewPanel({ formName, formDescription, fields }: FormPreviewPanelProps) {
  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-background border rounded-lg p-8 shadow-sm">
        <h2 className="text-2xl font-bold mb-2">{formName || "Untitled Form"}</h2>
        {formDescription && (
          <p className="text-muted-foreground mb-6">{formDescription}</p>
        )}

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {fields.map((field) => (
            <div key={field.id}>
              <Label htmlFor={`preview-${field.id}`}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>

              {field.type === 'textarea' ? (
                <Textarea
                  id={`preview-${field.id}`}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              ) : field.type === 'select' ? (
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder={field.placeholder || "Select an option"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options || []).map((option, i) => (
                      <SelectItem key={i} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === 'checkbox' ? (
                <div className="space-y-2">
                  {(field.options || []).map((option, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <Checkbox id={`${field.id}-${i}`} />
                      <label htmlFor={`${field.id}-${i}`} className="text-sm">
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <Input
                  id={`preview-${field.id}`}
                  type={field.type}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              )}
            </div>
          ))}

          <Button type="submit" className="w-full">Submit</Button>
        </form>
      </div>
    </div>
  );
}
