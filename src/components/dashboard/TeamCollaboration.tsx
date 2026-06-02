import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare } from "lucide-react";

interface TeamMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface TaskCount {
  assignee_id: string;
  count: number;
}

export const TeamCollaboration = () => {
  const { data: teamMembers, isLoading: loadingMembers } = useQuery({
    queryKey: ['team-members-quick'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const { data: workspaceData } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', session.user.id)
        .single();

      if (!workspaceData) return [];

      const { data: members } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceData.workspace_id)
        .limit(5);

      if (!members) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', members.map(m => m.user_id));

      return (profiles || []) as TeamMember[];
    },
  });

  const { data: taskCounts } = useQuery({
    queryKey: ['task-counts-team'],
    enabled: !!teamMembers && teamMembers.length > 0,
    queryFn: async () => {
      if (!teamMembers || teamMembers.length === 0) return [];

      const { data } = await supabase
        .from('tasks')
        .select('assignee_id')
        .in('assignee_id', teamMembers.map(m => m.id))
        .eq('status', 'pending');

      const counts: { [key: string]: number } = {};
      (data || []).forEach(task => {
        if (task.assignee_id) {
          counts[task.assignee_id] = (counts[task.assignee_id] || 0) + 1;
        }
      });

      return Object.entries(counts).map(([assignee_id, count]) => ({
        assignee_id,
        count,
      })) as TaskCount[];
    },
  });

  const { data: notes } = useQuery({
    queryKey: ['shared-notes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('activities')
        .select('title, created_at, created_by, type')
        .eq('type', 'note')
        .order('created_at', { ascending: false })
        .limit(3);

      return data || [];
    },
  });

  const getInitials = (member: TeamMember) => {
    const first = member.first_name?.[0] || '';
    const last = member.last_name?.[0] || '';
    return (first + last).toUpperCase() || member.email?.[0]?.toUpperCase() || '?';
  };

  const getName = (member: TeamMember) => {
    if (member.first_name || member.last_name) {
      return `${member.first_name || ''} ${member.last_name || ''}`.trim();
    }
    return member.email || 'Unknown';
  };

  const getTaskCount = (memberId: string) => {
    return taskCounts?.find(tc => tc.assignee_id === memberId)?.count || 0;
  };

  const maxTasks = Math.max(...(teamMembers?.map(m => getTaskCount(m.id)) || [1]));

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6">Team Collaboration</h2>

      <div className="space-y-6">
        {/* Team Performance */}
        <div>
          <h3 className="text-sm font-medium mb-4">Task Distribution</h3>
          {loadingMembers ? (
            <div className="text-center py-4 text-muted-foreground text-sm">Loading team...</div>
          ) : !teamMembers || teamMembers.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">No team members</div>
          ) : (
            <div className="space-y-3">
              {teamMembers.slice(0, 3).map((member) => {
                const taskCount = getTaskCount(member.id);
                const progress = maxTasks > 0 ? (taskCount / maxTasks) * 100 : 0;
                
                return (
                  <div key={member.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">{getInitials(member)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{getName(member)}</span>
                      </div>
                      <span className="text-sm font-semibold">{taskCount} tasks</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                );
              })}
              {teamMembers.length > 3 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{teamMembers.length - 3} more team members
                </p>
              )}
            </div>
          )}
        </div>

        {/* Shared Notes */}
        <div>
          <h3 className="text-sm font-medium mb-4">Shared Notes</h3>
          {!notes || notes.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">No recent notes</div>
          ) : (
            <div className="space-y-3">
              {notes.map((note, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{note.title || 'Note'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    Note
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
