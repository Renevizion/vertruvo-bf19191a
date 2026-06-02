import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFormABTesting } from "@/hooks/useFormABTesting";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface EmbeddedFormProps {
  formId: string;
}

export function EmbeddedForm({ formId }: EmbeddedFormProps) {
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [startTime] = useState(Date.now());
  
  const { selectedVariant, sessionId } = useFormABTesting(formId);

  useEffect(() => {
    loadForm();
    trackFormView();
  }, [formId]);

  const trackFormView = async () => {
    try {
      await supabase.functions.invoke('trigger-form-view', {
        body: {
          formId,
          variantId: selectedVariant?.id || null,
          sessionId,
          referrer: document.referrer || null,
        }
      });
    } catch (error) {
      console.error("Error tracking form view:", error);
    }
  };

  const loadForm = async () => {
    try {
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("id", formId)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      setForm(data);
    } catch (error) {
      console.error("Error loading form:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const timeToSubmit = Math.round((Date.now() - startTime) / 1000);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/form-submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            formId,
            data: formData,
            variantId: selectedVariant?.id || null,
            sessionId,
            timeToSubmit,
            referrer: document.referrer || null,
          }),
        }
      );

      if (!response.ok) throw new Error("Submission failed");
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Failed to submit form. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckboxChange = (fieldName: string, option: string, checked: boolean) => {
    const current = (formData[fieldName] as string[]) || [];
    const updated = checked
      ? [...current, option]
      : current.filter((v: string) => v !== option);
    setFormData({ ...formData, [fieldName]: updated });
  };

  const renderField = (field: FormField) => {
    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            id={field.name}
            name={field.name}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            required={field.required}
            value={formData[field.name] || ""}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          />
        );

      case "select":
        return (
          <Select
            value={formData[field.name] || ""}
            onValueChange={(val) => setFormData({ ...formData, [field.name]: val })}
            required={field.required}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "checkbox":
        if (field.options && field.options.length > 0) {
          // Multi-checkbox group
          const selectedValues = (formData[field.name] as string[]) || [];
          return (
            <div className="space-y-2 mt-1">
              {field.options.map((option) => (
                <div key={option} className="flex items-center gap-2">
                  <Checkbox
                    id={`${field.name}-${option}`}
                    checked={selectedValues.includes(option)}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange(field.name, option, !!checked)
                    }
                  />
                  <Label htmlFor={`${field.name}-${option}`} className="font-normal text-sm cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          );
        }
        // Single checkbox
        return (
          <div className="flex items-center gap-2 mt-1">
            <Checkbox
              id={field.name}
              checked={!!formData[field.name]}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, [field.name]: !!checked })
              }
            />
            <Label htmlFor={field.name} className="font-normal text-sm cursor-pointer">
              {field.label}
            </Label>
          </div>
        );

      case "date":
        return (
          <Input
            id={field.name}
            name={field.name}
            type="date"
            required={field.required}
            value={formData[field.name] || ""}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          />
        );

      default:
        return (
          <Input
            id={field.name}
            name={field.name}
            type={field.type}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            required={field.required}
            value={formData[field.name] || ""}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Form not found or inactive
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto p-6 bg-background border rounded-lg text-center">
        <h3 className="text-xl font-semibold mb-2">Thank you!</h3>
        <p className="text-muted-foreground">
          Your submission has been received. We'll get back to you soon.
        </p>
      </div>
    );
  }

  const activeConfig = selectedVariant?.variant_config || {};
  const displayDescription = activeConfig.description || form.description;
  const displayFields = activeConfig.fields || form.fields;
  const submitButtonText = activeConfig.submitButtonText || "Submit";

  return (
    <div className="max-w-md mx-auto p-6 bg-background border rounded-lg">
      <h3 className="text-xl font-semibold mb-2">{form.name}</h3>
      {displayDescription && (
        <p className="text-sm text-muted-foreground mb-4">{displayDescription}</p>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        {displayFields.map((field: FormField) => (
          <div key={field.name}>
            {/* For checkbox groups, label is rendered above. For single checkbox, label is inline */}
            {!(field.type === "checkbox" && (!field.options || field.options.length === 0)) && (
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
            )}
            {renderField(field)}
          </div>
        ))}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            submitButtonText
          )}
        </Button>
      </form>
    </div>
  );
}
