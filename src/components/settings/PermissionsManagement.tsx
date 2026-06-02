import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface Permission {
  resource: string;
  actions: {
    [key: string]: boolean;
  };
}

// Role hierarchy: Owner > Admin > Manager > User
// Owner: Platform owner with full access to everything including billing
// Admin: Full admin access, can manage users and settings
// Manager: Can manage leads, contacts, workflows but not system settings  
// User: Basic access, can view and use features but not configure them
const defaultPermissions = {
  owner: {
    leads: ["view", "create", "edit", "delete"],
    contacts: ["view", "create", "edit", "delete"],
    agents: ["view", "create", "edit", "delete"],
    workflows: ["view", "create", "edit", "delete"],
    settings: ["view", "edit"],
  },
  admin: {
    leads: ["view", "create", "edit", "delete"],
    contacts: ["view", "create", "edit", "delete"],
    agents: ["view", "create", "edit"],
    workflows: ["view", "create", "edit"],
    settings: ["view", "edit"],
  },
  manager: {
    leads: ["view", "create", "edit"],
    contacts: ["view", "create", "edit"],
    agents: ["view"],
    workflows: ["view", "create"],
    settings: ["view"],
  },
  user: {
    leads: ["view"],
    contacts: ["view"],
    agents: ["view"],
    workflows: ["view"],
    settings: ["view"],
  },
};

export function PermissionsManagement() {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<"owner" | "admin" | "manager" | "user">("admin");
  const [permissions, setPermissions] = useState(defaultPermissions[selectedRole]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPermissions(defaultPermissions[selectedRole]);
  }, [selectedRole]);

  const togglePermission = (resource: string, action: string) => {
    setPermissions(prev => {
      const resourcePerms = prev[resource] || [];
      const hasPermission = resourcePerms.includes(action);
      
      return {
        ...prev,
        [resource]: hasPermission
          ? resourcePerms.filter(a => a !== action)
          : [...resourcePerms, action]
      };
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Get all existing permissions for this role
      const { data: existing } = await supabase
        .from("permissions")
        .select("*")
        .eq("role", selectedRole);

      // Delete old permissions
      if (existing && existing.length > 0) {
        await supabase
          .from("permissions")
          .delete()
          .eq("role", selectedRole);
      }

      // Insert new permissions
      const permissionsToInsert = Object.entries(permissions).flatMap(([resource, actions]) =>
        actions.map(action => ({
          role: selectedRole,
          resource,
          action,
          granted: true,
        }))
      );

      const { error } = await supabase
        .from("permissions")
        .insert(permissionsToInsert);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Permissions saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Label className="text-base font-semibold">Edit or manage your team</Label>
      </div>

      <Tabs defaultValue="admin" onValueChange={(val: any) => setSelectedRole(val)}>
        <TabsList>
          <TabsTrigger value="owner">Owner</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
          <TabsTrigger value="manager">Manager</TabsTrigger>
          <TabsTrigger value="user">User</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedRole} className="space-y-4 mt-6">
          {Object.entries(permissions).map(([resource, actions]) => (
            <Card key={resource}>
              <CardHeader>
                <CardTitle className="text-base capitalize">{resource}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {["view", "create", "edit", "delete"].map((action) => (
                    <Label key={action} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={actions.includes(action)}
                        onCheckedChange={() => togglePermission(resource, action)}
                      />
                      <span className="text-sm capitalize">{action}</span>
                    </Label>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          onClick={() => setPermissions(defaultPermissions[selectedRole])}
        >
          Reset to Default
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Permissions"}
        </Button>
      </div>
    </div>
  );
}