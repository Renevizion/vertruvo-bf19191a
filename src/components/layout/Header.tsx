import { Search, User, CheckSquare, Command, AudioWaveform } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CallWidget } from "./CallWidget";
import { TaskNotifications } from "./TaskNotifications";
import { UserMenu } from "./UserMenu";
import { FeedbackDialog } from "@/components/feedback/FeedbackDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export const Header = ({ onVoiceOpen }: { onVoiceOpen?: () => void }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const { data: businessSettings } = useQuery({
    queryKey: ['business-settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!workspace) return null;

      const { data, error } = await supabase
        .from('business_settings')
        .select('business_name, logo_url')
        .eq('workspace_id', workspace.id)
        .maybeSingle();
      
      if (error) {
        console.error('[Header] Error loading business settings:', error);
        return null;
      }
      return data;
    },
  });

  const { data: searchResults } = useQuery({
    queryKey: ["header-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery) return { contacts: [], tasks: [] };
      
      const [contactsRes, tasksRes] = await Promise.all([
        supabase
          .from("contacts")
          .select("id, name, email, phone")
          .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .limit(3),
        supabase
          .from("tasks")
          .select("id, title, status")
          .ilike("title", `%${searchQuery}%`)
          .limit(3)
      ]);

      return {
        contacts: contactsRes.data || [],
        tasks: tasksRes.data || []
      };
    },
    enabled: searchQuery.length > 0,
  });

  const hasResults = searchResults && (searchResults.contacts.length > 0 || searchResults.tasks.length > 0);

  return (
    <header className="sticky top-0 h-14 sm:h-16 surface-glass border-b border-border/60 flex items-center justify-between px-3 sm:px-5 lg:px-6 z-20 gap-2 shadow-[0_1px_0_hsl(var(--foreground)/0.04)]">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="flex-shrink-0 h-9 w-9 rounded-lg hover:bg-accent/80" />
          </TooltipTrigger>
          <TooltipContent>Toggle Sidebar</TooltipContent>
        </Tooltip>
        {businessSettings?.logo_url ? (
          <img
            src={businessSettings.logo_url}
            alt={businessSettings.business_name || 'Business Logo'}
            className="h-6 sm:h-8 w-auto object-contain flex-shrink-0 hidden sm:block"
          />
        ) : businessSettings?.business_name ? (
          <span className="text-display text-base sm:text-lg truncate hidden sm:block max-w-[160px]">{businessSettings.business_name}</span>
        ) : null}
        <div className="hidden sm:block h-6 w-px bg-border/70 mx-1" />
        <Popover open={searchQuery.length > 0} modal={false}>
          <PopoverTrigger asChild>
            <div className="relative flex-1 min-w-0 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search contacts, tasks, anything…"
                className="pl-9 sm:pl-10 pr-12 h-9 sm:h-10 text-sm rounded-full bg-background/70 border-border/50 shadow-inner focus-visible:bg-background focus-visible:border-primary/40 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery("");
                  }
                }}
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/70 bg-background/60 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <Command className="h-3 w-3" />K
              </kbd>
            </div>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[calc(100vw-2rem)] sm:w-[400px] p-0" 
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest('input')) {
                e.preventDefault();
              } else {
                setSearchQuery("");
              }
            }}
          >
            {hasResults ? (
              <div className="max-h-[300px] overflow-y-auto">
                {searchResults.contacts.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Contacts
                    </div>
                    {searchResults.contacts.map((contact: any) => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-2 px-2 py-2 hover:bg-accent rounded-sm cursor-pointer"
                        onClick={() => {
                          navigate(`/contacts/${contact.id}`);
                          setSearchQuery("");
                        }}
                      >
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm truncate">{contact.name}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {contact.email || contact.phone}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.tasks.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Tasks
                    </div>
                    {searchResults.tasks.map((task: any) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 px-2 py-2 hover:bg-accent rounded-sm cursor-pointer"
                        onClick={() => {
                          navigate("/tasks");
                          setSearchQuery("");
                        }}
                      >
                        <CheckSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm truncate">{task.title}</span>
                          <span className="text-xs text-muted-foreground truncate">{task.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        <TooltipProvider delayDuration={300}>
          <div className="hidden sm:block">
            <Tooltip>
              <TooltipTrigger asChild>
                <div><FeedbackDialog /></div>
              </TooltipTrigger>
              <TooltipContent>Send Feedback</TooltipContent>
            </Tooltip>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onVoiceOpen} aria-label="Thermi Voice">
                <AudioWaveform className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Thermi Voice</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div><CallWidget /></div>
            </TooltipTrigger>
            <TooltipContent>Make a Call</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div><TaskNotifications /></div>
            </TooltipTrigger>
            <TooltipContent>Notifications</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <UserMenu />
      </div>
    </header>
  );
};
