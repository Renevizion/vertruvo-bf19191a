import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Beaker, TrendingUp, Edit } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import { FormVariantConfigurator } from "./FormVariantConfigurator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FormABTestManagerProps {
  formId: string;
}

export function FormABTestManager({ formId }: FormABTestManagerProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [variantName, setVariantName] = useState("");
  const [trafficPercentage, setTrafficPercentage] = useState([50]);
  const [variantConfig, setVariantConfig] = useState<any>(null);
  const [editingVariant, setEditingVariant] = useState<any>(null);

  const { data: form } = useQuery({
    queryKey: ["form", formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("id", formId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: tests, isLoading } = useQuery({
    queryKey: ["form-ab-tests", formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("form_ab_tests")
        .select("*")
        .eq("form_id", formId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: analytics } = useQuery({
    queryKey: ["form-analytics-variants", formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("form_analytics_summary")
        .select("*")
        .eq("form_id", formId)
        .order("period_start", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const createTest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("form_ab_tests").insert({
        form_id: formId,
        variant_name: variantName,
        variant_config: variantConfig || form?.fields || {},
        traffic_percentage: trafficPercentage[0],
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-ab-tests", formId] });
      toast.success("A/B test variant created");
      setIsCreating(false);
      setVariantName("");
      setTrafficPercentage([50]);
      setVariantConfig(null);
    },
  });

  const updateTest = useMutation({
    mutationFn: async ({ id, config }: { id: string; config: any }) => {
      const { error } = await supabase
        .from("form_ab_tests")
        .update({ variant_config: config })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-ab-tests", formId] });
      toast.success("Variant updated");
      setEditingVariant(null);
    },
  });

  const deleteTest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("form_ab_tests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-ab-tests", formId] });
      toast.success("Test deleted");
    },
  });

  const getVariantPerformance = (variantId: string) => {
    const variantAnalytics = analytics?.filter((a) => a.variant_id === variantId);
    if (!variantAnalytics || variantAnalytics.length === 0) return null;

    const totalSubmissions = variantAnalytics.reduce((sum, a) => sum + (a.submissions || 0), 0);
    const totalViews = variantAnalytics.reduce((sum, a) => sum + (a.views || 0), 0);
    const conversionRate = totalViews > 0 ? (totalSubmissions / totalViews) * 100 : 0;

    return { totalSubmissions, totalViews, conversionRate };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5" />
              A/B Testing
            </CardTitle>
            <CardDescription className="mt-2">
              <strong>How it works:</strong> Create variants with different layouts or fields. Set traffic % to split visitors between variants. System tracks which variant converts better. Winner gets more leads.
            </CardDescription>
          </div>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Variant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Test Variant</DialogTitle>
                <DialogDescription>
                  Configure what's different in this variant: reorder fields, change labels, test different CTAs.
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="config">Configure Variant</TabsTrigger>
                </TabsList>
                <TabsContent value="basic" className="space-y-4">
                  <div>
                    <Label>Variant Name</Label>
                    <Input
                      value={variantName}
                      onChange={(e) => setVariantName(e.target.value)}
                      placeholder="e.g., Short Form, Phone First, Friendly CTA"
                    />
                  </div>
                  <div>
                    <Label>Traffic Allocation: {trafficPercentage[0]}%</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      {trafficPercentage[0]}% of visitors see this variant. Remaining {100 - trafficPercentage[0]}% see original.
                    </p>
                    <Slider
                      value={trafficPercentage}
                      onValueChange={setTrafficPercentage}
                      min={5}
                      max={95}
                      step={5}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>5%</span>
                      <span>50%</span>
                      <span>95%</span>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="config" className="space-y-4">
                  {form && (
                    <FormVariantConfigurator
                      baseForm={{
                        name: form.name,
                        description: form.description,
                        fields: form.fields as any[]
                      }}
                      onConfigChange={setVariantConfig}
                    />
                  )}
                </TabsContent>
              </Tabs>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={() => createTest.mutate()} disabled={!variantName}>
                  Create Variant
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading tests...</div>
        ) : tests && tests.length > 0 ? (
          <div className="space-y-4">
            {tests.map((test) => {
              const performance = getVariantPerformance(test.id);
              return (
                <div
                  key={test.id}
                  className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{test.variant_name}</h4>
                        <Badge variant="outline">{test.traffic_percentage}% traffic</Badge>
                        {test.is_active && <Badge>Active</Badge>}
                      </div>
                      {performance && (
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-green-600 font-medium">
                            <TrendingUp className="h-3 w-3" />
                            <span>{performance.conversionRate.toFixed(1)}% converting</span>
                          </div>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{performance.totalSubmissions} of {performance.totalViews} submitted</span>
                        </div>
                      )}
                      {!performance && (
                        <p className="text-xs text-muted-foreground">
                          No data yet - activate variant to start collecting metrics when visitors see it
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditingVariant(test)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteTest.mutate(test.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Beaker className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No A/B tests yet</p>
            <p className="text-xs mt-1">Create variants to optimize your form conversion</p>
          </div>
        )}
      </CardContent>

      {/* Edit Variant Dialog */}
      <Dialog open={!!editingVariant} onOpenChange={() => setEditingVariant(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Variant: {editingVariant?.variant_name}</DialogTitle>
            <DialogDescription>
              Update field order, labels, and CTA for this variant
            </DialogDescription>
          </DialogHeader>
          {form && editingVariant && (
            <FormVariantConfigurator
              baseForm={{
                name: form.name,
                description: form.description,
                fields: form.fields as any[]
              }}
              initialConfig={editingVariant.variant_config}
              onConfigChange={(config) => {
                updateTest.mutate({ id: editingVariant.id, config });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
