import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Trash2 } from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
}

interface VariantConfig {
  description?: string;
  fields: FormField[];
  submitButtonText?: string;
}

interface FormVariantConfiguratorProps {
  baseForm: {
    name: string;
    description: string | null;
    fields: FormField[];
  };
  onConfigChange: (config: VariantConfig) => void;
  initialConfig?: VariantConfig;
}

export function FormVariantConfigurator({
  baseForm,
  onConfigChange,
  initialConfig,
}: FormVariantConfiguratorProps) {
  const [description, setDescription] = useState(
    initialConfig?.description || baseForm.description || ""
  );
  const [fields, setFields] = useState<FormField[]>(
    initialConfig?.fields || baseForm.fields || []
  );
  const [submitButtonText, setSubmitButtonText] = useState(
    initialConfig?.submitButtonText || "Submit"
  );

  const handleFieldUpdate = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
    onConfigChange({ description, fields: newFields, submitButtonText });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newFields = Array.from(fields);
    const [reorderedField] = newFields.splice(result.source.index, 1);
    newFields.splice(result.destination.index, 0, reorderedField);

    setFields(newFields);
    onConfigChange({ description, fields: newFields, submitButtonText });
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    onConfigChange({ description: value, fields, submitButtonText });
  };

  const handleButtonTextChange = (value: string) => {
    setSubmitButtonText(value);
    onConfigChange({ description, fields, submitButtonText: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label>Form Description</Label>
        <Textarea
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Variant form description"
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Change the description to test different value propositions
        </p>
      </div>

      <div>
        <Label>Submit Button Text</Label>
        <Input
          value={submitButtonText}
          onChange={(e) => handleButtonTextChange(e.target.value)}
          placeholder="Submit"
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Test different CTAs: "Get Started", "Sign Up", "Contact Us"
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Form Fields</Label>
          <p className="text-xs text-muted-foreground">
            Drag to reorder, edit labels to test variations
          </p>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="fields">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {fields.map((field, index) => (
                  <Draggable
                    key={field.name}
                    draggableId={field.name}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`p-3 ${
                          snapshot.isDragging ? "shadow-lg" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            {...provided.dragHandleProps}
                            className="mt-2 cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                value={field.label}
                                onChange={(e) =>
                                  handleFieldUpdate(index, {
                                    label: e.target.value,
                                  })
                                }
                                placeholder="Field label"
                                className="flex-1"
                              />
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={field.required}
                                  onCheckedChange={(checked) =>
                                    handleFieldUpdate(index, {
                                      required: checked,
                                    })
                                  }
                                />
                                <span className="text-xs text-muted-foreground">
                                  Required
                                </span>
                              </div>
                            </div>
                            <Input
                              value={field.placeholder || ""}
                              onChange={(e) =>
                                handleFieldUpdate(index, {
                                  placeholder: e.target.value,
                                })
                              }
                              placeholder="Placeholder text"
                              className="text-sm"
                            />
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Type: {field.type}</span>
                              <span>•</span>
                              <span>Name: {field.name}</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}
