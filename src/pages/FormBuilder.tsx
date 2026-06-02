import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, Code, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FormBuilderCanvas } from "@/components/forms/builder/FormBuilderCanvas";
import { FormElementsPanel } from "@/components/forms/builder/FormElementsPanel";
import { FormPreviewPanel } from "@/components/forms/builder/FormPreviewPanel";
import { FormEmbedDialog } from "@/components/forms/FormEmbedDialog";
import { FormAutoResponseConfig } from "@/components/forms/FormAutoResponseConfig";

interface FormField {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface Form {
  id: string;
  name: string;
  description: string | null;
  fields: FormField[];
  pipeline_id: string | null;
  stage_id: string | null;
  is_active: boolean;
}

export default function FormBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [pipelineId, setPipelineId] = useState<string>("");
  const [stageId, setStageId] = useState<string>("");
  const [pipelines, setPipelines] = useState<Array<{id: string, name: string}>>([]);
  const [stages, setStages] = useState<Array<{id: string, name: string}>>([]);
  const [saving, setSaving] = useState(false);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (id) {
      fetchForm();
      fetchPipelines();
    }
  }, [id]);

  useEffect(() => {
    if (pipelineId) {
      fetchStages();
    }
  }, [pipelineId]);

  const fetchForm = async () => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      const formData = {
        ...data,
        fields: (data.fields as any) as FormField[]
      };
      
      setForm(formData as Form);
      setFields((data.fields as any) as FormField[]);
      setFormName(data.name);
      setFormDescription(data.description || "");
      setPipelineId(data.pipeline_id || "");
      setStageId(data.stage_id || "");
    } catch (error) {
      console.error('Error fetching form:', error);
      toast({
        title: "Error",
        description: "Failed to load form",
        variant: "destructive",
      });
    }
  };

  const fetchPipelines = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id);

      if (!workspaces || workspaces.length === 0) return;

      const workspaceIds = workspaces.map(w => w.id);

      const { data } = await supabase
        .from('pipelines')
        .select('id, name')
        .in('workspace_id', workspaceIds)
        .order('name');
      
      if (data) {
        setPipelines(data);
      }
    } catch (error) {
      console.error('Error fetching pipelines:', error);
    }
  };

  const fetchStages = async () => {
    if (!pipelineId) {
      setStages([]);
      return;
    }

    try {
      const { data } = await supabase
        .from('pipeline_stages')
        .select('id, name')
        .eq('pipeline_id', pipelineId)
        .order('position');
      
      if (data) {
        setStages(data);
        // Auto-select first stage if current stage is not in the list
        if (data.length > 0 && !data.find(s => s.id === stageId)) {
          setStageId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching stages:', error);
    }
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('forms')
        .update({
          name: formName,
          description: formDescription,
          fields: fields as any,
          pipeline_id: pipelineId || null,
          stage_id: stageId || null,
        })
        .eq('id', form.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Form saved successfully",
      });
    } catch (error) {
      console.error('Error saving form:', error);
      toast({
        title: "Error",
        description: "Failed to save form",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addField = (fieldType: string) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      name: `field_${fields.length + 1}`,
      label: `New ${fieldType} Field`,
      type: fieldType,
      required: false,
      placeholder: "",
    };
    setFields([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const moveField = (fromIndex: number, toIndex: number) => {
    const newFields = [...fields];
    const [removed] = newFields.splice(fromIndex, 1);
    newFields.splice(toIndex, 0, removed);
    setFields(newFields);
  };

  if (!form) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-muted-foreground">Loading form builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Toolbar */}
      <div className="h-16 border-b flex items-center justify-between px-6">
        <div className="flex items-center gap-4 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/forms')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex flex-col flex-1 max-w-md">
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="font-semibold text-lg border-none p-0 h-auto focus-visible:ring-0"
              placeholder="Form Name"
            />
            <Input
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="text-sm text-muted-foreground border-none p-0 h-auto focus-visible:ring-0"
              placeholder="Add description..."
            />
          </div>
          
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">Pipeline:</Label>
              <Select value={pipelineId} onValueChange={setPipelineId}>
                <SelectTrigger className="w-[180px] h-8">
                  <SelectValue placeholder="Select pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {stages.length > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">Stage:</Label>
                <Select value={stageId} onValueChange={setStageId}>
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="outline"
            data-preview-btn
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {previewMode ? "Edit" : "Preview"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setEmbedDialogOpen(true)}
          >
            <Code className="w-4 h-4 mr-2" />
            Deploy
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {!previewMode ? (
          <>
            {/* Left Panel - Elements */}
            <FormElementsPanel onAddField={addField} />

            {/* Center - Canvas */}
            <div className="flex-1 overflow-auto">
              <FormBuilderCanvas
                fields={fields}
                onUpdateField={updateField}
                onRemoveField={removeField}
                onMoveField={moveField}
              />
              {/* Auto-Response Config below canvas */}
              <div className="p-4 max-w-2xl mx-auto">
                <FormAutoResponseConfig
                  formId={form.id}
                  initialConfig={(form as any).auto_response_config}
                />
              </div>
            </div>
          </>
        ) : (
          /* Preview Mode - Full Width */
          <div className="flex-1 overflow-auto bg-muted/20">
            <FormPreviewPanel
              formName={formName}
              formDescription={formDescription}
              fields={fields}
            />
          </div>
        )}
      </div>

      {form && (
        <FormEmbedDialog
          open={embedDialogOpen}
          onOpenChange={setEmbedDialogOpen}
          form={form}
        />
      )}
    </div>
  );
}
