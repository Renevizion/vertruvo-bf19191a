import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, UserCog, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// Role hierarchy: Owner > Admin > Manager > User
// Owner: Platform owner with full access to everything including billing
// Admin: Full admin access, can manage users and settings
// Manager: Can manage leads, contacts, workflows but not system settings  
// User: Basic access, can view and use features but not configure them
const ROLES = [
  { value: "owner", label: "Owner", color: "destructive", description: "Full platform control including billing" },
  { value: "admin", label: "Admin", color: "default", description: "Manage users, settings, and all features" },
  { value: "manager", label: "Manager", color: "secondary", description: "Manage leads, contacts, and workflows" },
  { value: "user", label: "User", color: "outline", description: "Basic feature access" },
] as const;

export const UserRoleManagement = () => {
  const queryClient = useQueryClient();
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Fetch user_roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;
      if (!userRoles) return [];

      // Fetch profiles for these users
      const userIds = userRoles.map((r) => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Combine the data with proper user display
      return userRoles.map((role) => {
        const profile = profiles?.find((p) => p.id === role.user_id);
        return {
          ...role,
          profiles: profile,
          displayName: profile?.first_name && profile?.last_name 
            ? `${profile.first_name} ${profile.last_name}`
            : profile?.email || 'Unknown User',
          email: profile?.email,
        };
      });
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: role as any })
        .eq("user_id", userId);

      if (error) throw error;

      // Log the change
      await supabase.rpc("log_audit_event", {
        _workspace_id: null,
        _action: "role_updated",
        _entity: "user",
        _entity_id: userId,
        _changes: [{ field: "role", oldValue: "", newValue: role }],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User role updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update role: " + error.message);
    },
  });

  const getRoleBadgeVariant = (role: string) => {
    const roleConfig = ROLES.find((r) => r.value === role);
    return roleConfig?.color || "outline";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              User Role Management
            </CardTitle>
            <CardDescription>Assign and manage user roles across the platform</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Role Legend with Descriptions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ROLES.map((role) => (
              <div key={role.value} className="flex flex-col gap-1 p-2 rounded-lg border bg-card">
                <Badge variant={role.color} className="w-fit">
                  {role.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{role.description}</span>
              </div>
            ))}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Change Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : users && users.length > 0 ? (
                  users.map((user: any) => {
                    const profile = user.profiles;
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {profile?.avatar_url && (
                              <img
                                src={profile.avatar_url}
                                alt=""
                                className="h-8 w-8 rounded-full"
                              />
                            )}
                            <div>
                              <div className="font-medium">
                                {profile?.first_name} {profile?.last_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ID: {user.user_id.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{profile?.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={selectedRoles[user.user_id] || user.role}
                            onValueChange={(value) =>
                              setSelectedRoles({
                                ...selectedRoles,
                                [user.user_id]: value,
                              })
                            }
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() =>
                              updateRole.mutate({
                                userId: user.user_id,
                                role: selectedRoles[user.user_id] || user.role,
                              })
                            }
                            disabled={
                              !selectedRoles[user.user_id] ||
                              selectedRoles[user.user_id] === user.role
                            }
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Update
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
