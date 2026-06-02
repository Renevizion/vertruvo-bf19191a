import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Workflow, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export function TemplateLibraryAnalytics() {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['workflow-templates'],
    queryFn: async () => {
      const { data } = await supabase
        .from('workflow_templates')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    }
  });

  const totalTemplates = templates?.length || 0;
  const activeTemplates = templates?.filter(t => t.is_active).length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Template Library Analytics</h2>
        <p className="text-muted-foreground mt-1">
          Manage and track workflow templates published to users
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              Total Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTemplates}</div>
            <p className="text-xs text-muted-foreground">Created templates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Active Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTemplates}</div>
            <p className="text-xs text-muted-foreground">Published & active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              Template Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(templates?.map(t => t.category)).size}</div>
            <p className="text-xs text-muted-foreground">Unique categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Template Library Table */}
      <Card>
        <CardHeader>
          <CardTitle>Published Templates</CardTitle>
          <CardDescription>All workflow templates available to users</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
          ) : templates && templates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Workflow className="h-4 w-4 text-muted-foreground" />
                        {template.name}
                      </div>
                      {template.description && (
                        <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{template.category || 'General'}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={template.is_active ? "default" : "secondary"}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {template.created_at 
                        ? format(new Date(template.created_at), 'MMM d, yyyy')
                        : 'N/A'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Workflow className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No templates created yet</p>
              <p className="text-sm mt-1">Create templates in the Templates tab to see them here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
