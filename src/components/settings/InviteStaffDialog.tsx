import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check } from "lucide-react";

interface InviteStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function InviteStaffDialog({ open, onOpenChange, onSuccess }: InviteStaffDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role: "user" as string,
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTempPassword(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("create-staff-account", {
        body: {
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          password: formData.password || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to create account");
      }

      const result = response.data;

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.temp_password) {
        setTempPassword(result.temp_password);

        // Send staff invitation email (fire-and-forget)
        supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'staff-invitation',
            recipientEmail: formData.email,
            idempotencyKey: `staff-invite-${formData.email}-${Date.now()}`,
            templateData: {
              name: `${formData.first_name} ${formData.last_name}`.trim(),
              role: formData.role,
              tempPassword: result.temp_password,
            },
          },
        }).catch(() => {});

        toast({
          title: "Account Created",
          description: "Staff account created. Share the temporary password with them.",
        });
      } else {
        toast({
          title: "Success",
          description: result.message || "Staff member added to workspace",
        });
        resetAndClose();
      }

      onSuccess();
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

  const resetAndClose = () => {
    setFormData({ email: "", first_name: "", last_name: "", role: "user", password: "" });
    setTempPassword(null);
    setCopied(false);
    onOpenChange(false);
  };

  const handleCopyPassword = async () => {
    if (!tempPassword) return;
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tempPassword ? "Account Created" : "Create Staff Account"}</DialogTitle>
          <DialogDescription>
            {tempPassword 
              ? "Share these credentials with the new team member."
              : "Create a new account and add them to your workspace."}
          </DialogDescription>
        </DialogHeader>

        {tempPassword ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{formData.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Temporary Password</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-background px-2 py-1 rounded border flex-1">
                    {tempPassword}
                  </code>
                  <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopyPassword}>
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              The team member should change their password after first login.
            </p>
            <Button className="w-full" onClick={resetAndClose}>Done</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="password">Password (optional)</Label>
              <Input
                id="password"
                type="text"
                placeholder="Leave blank to auto-generate"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">If left empty, a secure temporary password will be generated.</p>
            </div>
            <div>
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Staff</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetAndClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
