import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

export const TaskNotifications = () => {
  const navigate = useNavigate();
  
  const { data: tasks } = useQuery({
    queryKey: ['pending-tasks'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!workspace) return [];

      // Only show tasks due within next 7 days
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('status', 'pending')
        .not('due_date', 'is', null)
        .lte('due_date', sevenDaysFromNow.toISOString())
        .order('due_date', { ascending: true })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
  });

  const pendingCount = tasks?.length || 0;

  const handleTaskClick = (taskId: string) => {
    navigate('/tasks');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {pendingCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {pendingCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
          <h3 className="font-semibold">Pending Tasks</h3>
          <Badge variant="secondary">{pendingCount}</Badge>
        </div>
        <DropdownMenuSeparator />
        {tasks && tasks.length > 0 ? (
          tasks.map((task) => (
            <DropdownMenuItem 
              key={task.id} 
              className="flex flex-col items-start p-3 cursor-pointer"
              onClick={() => handleTaskClick(task.id)}
            >
              <div className="font-medium">{task.title}</div>
              {task.description && (
                <div className="text-sm text-muted-foreground line-clamp-1">
                  {task.description}
                </div>
              )}
              {task.due_date && (
                <div className="text-xs text-muted-foreground mt-1">
                  Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                </div>
              )}
            </DropdownMenuItem>
          ))
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No pending tasks
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};