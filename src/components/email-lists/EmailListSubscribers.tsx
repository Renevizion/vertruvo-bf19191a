import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Search, MailX, Mail } from "lucide-react";
import { format } from "date-fns";

interface EmailListSubscribersProps {
  list: {
    id: string;
    name: string;
    color: string;
  };
  onAddSubscribers: () => void;
}

export function EmailListSubscribers({ list, onAddSubscribers }: EmailListSubscribersProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: subscribers, isLoading } = useQuery({
    queryKey: ['email-list-subscribers', list.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_list_subscribers')
        .select('*')
        .eq('list_id', list.id)
        .order('subscribed_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'unsubscribed') {
        updates.unsubscribed_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('email_list_subscribers')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-list-subscribers', list.id] });
      queryClient.invalidateQueries({ queryKey: ['email-lists'] });
      toast({ title: "Subscriber status updated" });
    }
  });

  const removeSubscriber = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_list_subscribers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-list-subscribers', list.id] });
      queryClient.invalidateQueries({ queryKey: ['email-lists'] });
      toast({ title: "Subscriber removed" });
    }
  });

  const filteredSubscribers = subscribers?.filter(sub =>
    sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = subscribers?.filter(s => s.status === 'active').length || 0;
  const unsubscribedCount = subscribers?.filter(s => s.status === 'unsubscribed').length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: list.color }}
            />
            <div>
              <CardTitle>{list.name}</CardTitle>
              <CardDescription>
                {activeCount} active · {unsubscribedCount} unsubscribed
              </CardDescription>
            </div>
          </div>
          <Button onClick={onAddSubscribers}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Subscribers
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subscribers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : filteredSubscribers?.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No subscribers yet</p>
            <Button variant="link" onClick={onAddSubscribers}>
              Add your first subscriber
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Subscribed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscribers?.map((subscriber) => (
                <TableRow key={subscriber.id}>
                  <TableCell className="font-medium">{subscriber.email}</TableCell>
                  <TableCell>{subscriber.name || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={
                      subscriber.status === 'active' ? 'default' : 
                      subscriber.status === 'bounced' ? 'destructive' : 'secondary'
                    }>
                      {subscriber.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{subscriber.source || "-"}</TableCell>
                  <TableCell>
                    {format(new Date(subscriber.subscribed_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {subscriber.status === 'active' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateStatus.mutate({ id: subscriber.id, status: 'unsubscribed' })}
                          title="Unsubscribe"
                        >
                          <MailX className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateStatus.mutate({ id: subscriber.id, status: 'active' })}
                          title="Resubscribe"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeSubscriber.mutate(subscriber.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
