import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ScoringRule {
  id: string;
  rule_name: string;
  condition: {
    field: string;
    operator: string;
    value: any;
  };
  score_delta: number;
  is_active: boolean;
  priority: number;
}

export function LeadScoringConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newRule, setNewRule] = useState({
    rule_name: '',
    field: 'value',
    operator: '>',
    value: '',
    score_delta: 10
  });

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
  });

  const { data: workspace } = useQuery({
    queryKey: ['user-workspace', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', session.user.id)
        .single();
      return data;
    },
    enabled: !!session?.user?.id
  });

  const { data: rules } = useQuery({
    queryKey: ['scoring-rules', workspace?.workspace_id],
    queryFn: async () => {
      if (!workspace?.workspace_id) return [];
      const { data, error } = await supabase
        .from('lead_scoring_rules')
        .select('*')
        .eq('workspace_id', workspace.workspace_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(d => ({
        id: d.id,
        rule_name: d.name,
        condition: d.condition_config as { field: string; operator: string; value: any },
        score_delta: d.score_delta,
        is_active: d.is_active,
        priority: 0
      })) as ScoringRule[];
    },
    enabled: !!workspace?.workspace_id
  });

  const createRuleMutation = useMutation({
    mutationFn: async () => {
      if (!workspace?.workspace_id) throw new Error("No workspace");
      
      const { error } = await supabase
        .from('lead_scoring_rules')
        .insert({
          workspace_id: workspace.workspace_id,
          name: newRule.rule_name,
          condition_type: 'field_comparison',
          condition_config: {
            field: newRule.field,
            operator: newRule.operator,
            value: newRule.value
          },
          score_delta: newRule.score_delta,
          is_active: true
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoring-rules'] });
      setNewRule({
        rule_name: '',
        field: 'value',
        operator: '>',
        value: '',
        score_delta: 10
      });
      toast({ title: "Rule created successfully" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create scoring rule",
        variant: "destructive"
      });
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('lead_scoring_rules')
        .delete()
        .eq('id', ruleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoring-rules'] });
      toast({ title: "Rule deleted successfully" });
    }
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('lead_scoring_rules')
        .update({ is_active: !isActive })
        .eq('id', ruleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoring-rules'] });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Lead Scoring Configuration
        </CardTitle>
        <CardDescription>
          <strong>Automatic scoring:</strong> Define rules (e.g., "if value {'>'}= $1000, add +15 points"). When leads are created or updated, the system automatically calculates their score. Higher scores = better quality leads you should prioritize.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing Rules */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Active Rules</h3>
            <p className="text-xs text-muted-foreground mb-2">
              <strong>Real-time scoring:</strong> Every time a lead is created or updated, these rules automatically run and calculate the lead's score.
            </p>
          {!rules || rules.length === 0 ? (
            <div className="p-4 border rounded-lg bg-muted/20 text-center">
              <p className="text-sm text-muted-foreground">
                No scoring rules yet. Create rules below to automatically score leads based on their data. Example: "If lead value {'>'}= $5000, add +20 points"
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{rule.rule_name}</span>
                      <Badge variant={rule.is_active ? "default" : "secondary"}>
                        {rule.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {rule.condition.field} {rule.condition.operator} {rule.condition.value}
                      {' → '}
                      <span className={rule.score_delta > 0 ? "text-green-500" : "text-red-500"}>
                        {rule.score_delta > 0 ? '+' : ''}{rule.score_delta} points
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleRuleMutation.mutate({ 
                        ruleId: rule.id, 
                        isActive: rule.is_active 
                      })}
                    >
                      {rule.is_active ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteRuleMutation.mutate(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create New Rule */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-sm font-medium">Create New Rule</h3>
          
          <div className="grid gap-4">
            <div>
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input
                id="rule-name"
                placeholder="e.g., High Value Lead"
                value={newRule.rule_name}
                onChange={(e) => setNewRule({ ...newRule, rule_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="field">Field</Label>
                <Select
                  value={newRule.field}
                  onValueChange={(value) => setNewRule({ ...newRule, field: value })}
                >
                  <SelectTrigger id="field">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="value">Value</SelectItem>
                    <SelectItem value="source">Source</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="operator">Operator</Label>
                    <Select
                      value={newRule.operator}
                      onValueChange={(value) => setNewRule({ ...newRule, operator: value })}
                    >
                      <SelectTrigger id="operator">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=">">Greater than (&gt;)</SelectItem>
                        <SelectItem value="<">Less than (&lt;)</SelectItem>
                        <SelectItem value="=">Equals (=)</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                      </SelectContent>
                    </Select>
              </div>

              <div>
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  placeholder="e.g., 1000"
                  value={newRule.value}
                  onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="score-delta">Score Change</Label>
              <Input
                id="score-delta"
                type="number"
                placeholder="e.g., +10 or -5"
                value={newRule.score_delta}
                onChange={(e) => setNewRule({ ...newRule, score_delta: parseInt(e.target.value) || 0 })}
              />
            </div>

            <Button
              onClick={() => createRuleMutation.mutate()}
              disabled={!newRule.rule_name || !newRule.value}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
