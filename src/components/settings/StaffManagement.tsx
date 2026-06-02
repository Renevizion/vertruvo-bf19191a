import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { InviteStaffDialog } from "./InviteStaffDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  roles: string[];
}

export function StaffManagement() {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    // Get current user's workspace(s)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get workspace members (only from user's workspace)
    const { data: workspaceMembers } = await supabase
      .from("workspace_members")
      .select(`
        user_id,
        role,
        profiles:user_id (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `);

    if (workspaceMembers) {
      const staffData = workspaceMembers
        .filter(wm => wm.profiles) // Filter out any null profiles
        .map(wm => {
          const profile = wm.profiles as any;
          return {
            id: profile.id,
            first_name: profile.first_name || "",
            last_name: profile.last_name || "",
            email: profile.email || "",
            phone: profile.phone || "",
            roles: [wm.role], // Role from workspace_members
          };
        });
      setStaff(staffData);
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      owner: "bg-purple-500",
      admin: "bg-red-500",
      manager: "bg-blue-500",
      agent: "bg-green-500",
      user: "bg-gray-500",
    };
    return colors[role] || "bg-gray-500";
  };

  const handleDelete = async () => {
    if (!selectedMember) return;
    
    try {
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("user_id", selectedMember);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Staff member removed",
      });
      
      loadStaff();
      setDeleteDialogOpen(false);
      setSelectedMember(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredStaff = staff.filter(member =>
    member.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone, etc"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaff.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={member.roles[0] ? getRoleColor(member.roles[0]) : "bg-gray-500"}>
                        {member.first_name[0]}{member.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span>{member.first_name} {member.last_name}</span>
                  </div>
                </TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>{member.phone || "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {member.roles.map((role) => (
                      <Badge key={role} variant="secondary" className="capitalize">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedMember(member.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <InviteStaffDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={loadStaff}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this staff member from your workspace. They will lose access to all workspace data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}