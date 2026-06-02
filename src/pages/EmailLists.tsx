import { EmptyState } from "@/components/ui/empty-state";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Mail, Users, Trash2, UserPlus, Settings2, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailListSubscribers } from "@/components/email-lists/EmailListSubscribers";
import { AddSubscribersDialog } from "@/components/email-lists/AddSubscribersDialog";

interface EmailList {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  subscriber_count?: number;
}

const EmailLists = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<EmailList | null>(null);
  const [addSubscribersOpen, setAddSubscribersOpen] = useState(false);
  const [newList, setNewList] = useState({ name: "", description: "", color: "#3B82F6" });

  // Fetch workspace
  const { data: workspace } = useQuery({
    queryKey: ['workspace'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .single();
      return data;
    }
  });

  // Fetch email lists with subscriber counts
  const { data: emailLists, isLoading } = useQuery({
    queryKey: ['email-lists', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      
      const { data: lists, error } = await supabase
        .from('email_lists')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Get subscriber counts
      const listsWithCounts = await Promise.all(
        (lists || []).map(async (list) => {
          const { count } = await supabase
            .from('email_list_subscribers')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', list.id)
            .eq('status', 'active');
          
          return { ...list, subscriber_count: count || 0 };
        })
      );

      return listsWithCounts as EmailList[];
    },
    enabled: !!workspace?.id
  });

  const createList = useMutation({
    mutationFn: async () => {
      if (!workspace?.id) throw new Error("No workspace");
      
      const { error } = await supabase
        .from('email_lists')
        .insert({
          workspace_id: workspace.id,
          name: newList.name,
          description: newList.description || null,
          color: newList.color
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-lists'] });
      toast({ title: "Email list created successfully" });
      setCreateDialogOpen(false);
      setNewList({ name: "", description: "", color: "#3B82F6" });
    },
    onError: (error: any) => {
      toast({ title: "Error creating list", description: error.message, variant: "destructive" });
    }
  });

  const deleteList = useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase
        .from('email_lists')
        .delete()
        .eq('id', listId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-lists'] });
      toast({ title: "Email list deleted" });
      setSelectedList(null);
    }
  });

  const colors = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", 
    "#EC4899", "#06B6D4", "#84CC16"
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Lists</h1>
          <p className="text-muted-foreground">
            Manage your email lists and subscribers separately from your pipeline
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create List
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Email List</DialogTitle>
              <DialogDescription>
                Create a new email list to organize your subscribers
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>List Name *</Label>
                <Input
                  placeholder="e.g., Newsletter, Product Updates, AI Tips"
                  value={newList.name}
                  onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="What is this list for?"
                  value={newList.description}
                  onChange={(e) => setNewList({ ...newList, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {colors.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newList.color === color ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewList({ ...newList, color })}
                    />
                  ))}
                </div>
              </div>
              <Button 
                onClick={() => createList.mutate()} 
                disabled={!newList.name || createList.isPending}
                className="w-full"
              >
                Create List
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : emailLists?.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No email lists yet"
          description="Create your first email list to start organizing subscribers and sending campaigns."
          action={
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first list
            </Button>
          }
        />
      ) : (
        <Tabs defaultValue="lists" className="space-y-6">
          <TabsList>
            <TabsTrigger value="lists">All Lists</TabsTrigger>
            {selectedList && (
              <TabsTrigger value="subscribers">
                {selectedList.name} Subscribers
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="lists">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {emailLists?.map((list) => (
                <Card 
                  key={list.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedList?.id === list.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedList(list)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: list.color }}
                        />
                        <CardTitle className="text-lg">{list.name}</CardTitle>
                      </div>
                      <Badge variant={list.is_active ? "default" : "secondary"}>
                        {list.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {list.description && (
                      <CardDescription className="mt-2">
                        {list.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{list.subscriber_count} subscribers</span>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedList(list);
                            setAddSubscribersOpen(true);
                          }}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${list.name}"?`)) {
                              deleteList.mutate(list.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {selectedList && (
            <TabsContent value="subscribers">
              <EmailListSubscribers 
                list={selectedList} 
                onAddSubscribers={() => setAddSubscribersOpen(true)}
              />
            </TabsContent>
          )}
        </Tabs>
      )}

      {selectedList && (
        <AddSubscribersDialog
          open={addSubscribersOpen}
          onOpenChange={setAddSubscribersOpen}
          list={selectedList}
        />
      )}
    </div>
  );
};

export default EmailLists;
