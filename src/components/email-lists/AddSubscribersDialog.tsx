import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Upload, Users, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddSubscribersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: {
    id: string;
    name: string;
  };
}

export function AddSubscribersDialog({ open, onOpenChange, list }: AddSubscribersDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [singleEmail, setSingleEmail] = useState("");
  const [singleName, setSingleName] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  // Fetch contacts for import
  const { data: contacts } = useQuery({
    queryKey: ['contacts-for-import'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .single();
      
      if (!workspace) return [];

      const { data } = await supabase
        .from('contacts')
        .select('id, name, email')
        .eq('workspace_id', workspace.id)
        .not('email', 'is', null)
        .order('name');
      
      return data || [];
    },
    enabled: open
  });

  // Fetch leads for import
  const { data: leads } = useQuery({
    queryKey: ['leads-for-import'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .single();
      
      if (!workspace) return [];

      const { data } = await supabase
        .from('leads')
        .select('id, name, email')
        .eq('workspace_id', workspace.id)
        .not('email', 'is', null)
        .order('name');
      
      return data || [];
    },
    enabled: open
  });

  const addSingle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('email_list_subscribers')
        .insert({
          list_id: list.id,
          email: singleEmail.trim().toLowerCase(),
          name: singleName.trim() || null,
          source: 'manual'
        });
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('This email is already in the list');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-list-subscribers', list.id] });
      queryClient.invalidateQueries({ queryKey: ['email-lists'] });
      toast({ title: "Subscriber added" });
      setSingleEmail("");
      setSingleName("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const addBulk = useMutation({
    mutationFn: async () => {
      const emails = bulkEmails
        .split(/[\n,;]+/)
        .map(e => e.trim().toLowerCase())
        .filter(e => e && e.includes('@'));
      
      if (emails.length === 0) {
        throw new Error('No valid emails found');
      }

      const subscribers = emails.map(email => ({
        list_id: list.id,
        email,
        source: 'bulk_import'
      }));

      const { error } = await supabase
        .from('email_list_subscribers')
        .upsert(subscribers, { onConflict: 'list_id,email', ignoreDuplicates: true });
      
      if (error) throw error;
      
      return emails.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['email-list-subscribers', list.id] });
      queryClient.invalidateQueries({ queryKey: ['email-lists'] });
      toast({ title: `${count} subscribers imported` });
      setBulkEmails("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const addFromContacts = useMutation({
    mutationFn: async () => {
      const selected = [...contacts || [], ...leads || []].filter(c => 
        selectedContacts.includes(c.id) && c.email
      );

      if (selected.length === 0) {
        throw new Error('No contacts selected');
      }

      const subscribers = selected.map(contact => ({
        list_id: list.id,
        email: contact.email!.toLowerCase(),
        name: contact.name,
        contact_id: contacts?.find(c => c.id === contact.id) ? contact.id : null,
        lead_id: leads?.find(l => l.id === contact.id) ? contact.id : null,
        source: 'crm_import'
      }));

      const { error } = await supabase
        .from('email_list_subscribers')
        .upsert(subscribers, { onConflict: 'list_id,email', ignoreDuplicates: true });
      
      if (error) throw error;
      
      return selected.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['email-list-subscribers', list.id] });
      queryClient.invalidateQueries({ queryKey: ['email-lists'] });
      toast({ title: `${count} subscribers added from CRM` });
      setSelectedContacts([]);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const allCrmEntries = [...(contacts || []), ...(leads || [])];
  const toggleContact = (id: string) => {
    setSelectedContacts(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedContacts(allCrmEntries.map(c => c.id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Subscribers to {list.name}</DialogTitle>
          <DialogDescription>
            Add subscribers manually, in bulk, or import from your CRM
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="single" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="single">
              <UserPlus className="h-4 w-4 mr-2" />
              Single
            </TabsTrigger>
            <TabsTrigger value="bulk">
              <Upload className="h-4 w-4 mr-2" />
              Bulk
            </TabsTrigger>
            <TabsTrigger value="crm">
              <Users className="h-4 w-4 mr-2" />
              From CRM
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="subscriber@example.com"
                value={singleEmail}
                onChange={(e) => setSingleEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Name (optional)</Label>
              <Input
                placeholder="John Doe"
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
              />
            </div>
            <Button 
              onClick={() => addSingle.mutate()}
              disabled={!singleEmail || addSingle.isPending}
              className="w-full"
            >
              {addSingle.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Subscriber
            </Button>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Email Addresses</Label>
              <Textarea
                placeholder="Enter emails separated by commas, semicolons, or new lines:&#10;&#10;email1@example.com&#10;email2@example.com&#10;email3@example.com"
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                rows={6}
              />
            </div>
            <Button 
              onClick={() => addBulk.mutate()}
              disabled={!bulkEmails || addBulk.isPending}
              className="w-full"
            >
              {addBulk.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Import Emails
            </Button>
          </TabsContent>

          <TabsContent value="crm" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <Label>Select from Contacts & Leads</Label>
              <Button variant="link" size="sm" onClick={selectAll}>
                Select All ({allCrmEntries.length})
              </Button>
            </div>
            
            {allCrmEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No contacts or leads with emails found
              </p>
            ) : (
              <ScrollArea className="h-64 border rounded-md p-2">
                <div className="space-y-2">
                  {allCrmEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleContact(entry.id)}
                    >
                      <Checkbox checked={selectedContacts.includes(entry.id)} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{entry.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{entry.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            
            <Button 
              onClick={() => addFromContacts.mutate()}
              disabled={selectedContacts.length === 0 || addFromContacts.isPending}
              className="w-full"
            >
              {addFromContacts.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add {selectedContacts.length} Selected
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
