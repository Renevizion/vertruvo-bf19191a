import { ChevronDown, ChevronRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Sidebar as SidebarComponent,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useEnabledModules, type ModuleId } from "@/hooks/useEnabledModules";
import { useWorkspaceShape } from "@/hooks/useWorkspaceShape";
import { SAAS_NAV, resolveNavItem, type SaasNavGroup } from "@/capabilities/saas-nav";

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleNav = useCallback((href: string) => {
    navigate(href);
    if (isMobile) setOpenMobile(false);
  }, [navigate, isMobile, setOpenMobile]);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      return data || false;
    },
  });

  const { enabledModules } = useEnabledModules();
  const { data: shape } = useWorkspaceShape();

  // Resolve labels/paths from registry, then apply admin + module filters.
  const visibleNavGroups: SaasNavGroup[] = useMemo(() => {
    return SAAS_NAV
      .map((group) => ({
        ...group,
        items: group.items
          .map(resolveNavItem)
          .filter((item) => {
            if (item.adminOnly && !isAdmin) return false;
            if (isAdmin) return true;
            if (item.module && !enabledModules.includes(item.module)) return false;
            return true;
          }),
      }))
      .filter((group) => group.items.length > 0);
  }, [enabledModules, isAdmin]);

  // "Glove fits the hand" — decide which groups should start expanded.
  // Solo + new workspace → only Overview + CRM expanded.
  // Schedule-heavy verticals (Salon, Fitness, Home Services…) → also expand Schedule.
  // Team or active workspace → expand everything advanced too.
  const getDefaultOpenGroups = useCallback(() => {
    const open: string[] = ["Core"];
    const isSmallAndQuiet = (shape?.size ?? "solo") === "solo" && (shape?.activity ?? "new") === "new";

    if (shape?.scheduleHeavy) open.push("Relationships");

    if (!isSmallAndQuiet) {
      // Workspace has grown — surface the advanced surfaces by default.
      for (const group of visibleNavGroups) {
        if (group.defaultCollapsed && !open.includes(group.label)) {
          open.push(group.label);
        }
      }
    }

    // Always expand the group that contains the current route.
    for (const group of visibleNavGroups) {
      if (group.items.some(item => location.pathname === item.href || location.pathname.startsWith(item.href + '/'))) {
        if (!open.includes(group.label)) open.push(group.label);
      }
    }
    return open;
  }, [visibleNavGroups, location.pathname, shape?.size, shape?.activity, shape?.scheduleHeavy]);

  const [openGroups, setOpenGroups] = useState<string[]>(getDefaultOpenGroups);

  // Re-sync when shape/modules load (initial render runs before workspace data arrives).
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = getDefaultOpenGroups();
      // Preserve any user-toggled groups already open.
      const merged = Array.from(new Set([...prev, ...next]));
      return merged;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape?.size, shape?.activity, shape?.scheduleHeavy, enabledModules.join(",")]);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev =>
      prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]
    );
  };

  const collapsedGroups = useMemo(() => visibleNavGroups, [visibleNavGroups]);

  return (
    <SidebarComponent
      collapsible="icon"
      className="thermi-sidebar border-r border-sidebar-border/70"
    >

      <SidebarContent className="gap-1 px-2 py-2">
        <div className={cn("px-4 py-4 border-b border-sidebar-border/60", isCollapsed && "px-1 py-3")}>
          <h1
            className={cn(
              "text-display text-sidebar-foreground transition-all bg-clip-text text-transparent",
              "bg-gradient-to-br from-foreground via-foreground to-primary",
              isCollapsed ? "text-2xl text-center" : "text-3xl"
            )}
          >
            {isCollapsed ? "K" : "Thermi"}
          </h1>
        </div>

        {isCollapsed ? (
          <SidebarGroup className="py-1 px-0 overflow-visible">
            <SidebarGroupContent className="overflow-visible">
              <SidebarMenu className="overflow-visible gap-2">
                {collapsedGroups.map((group) => {
                  const primaryItem = group.items.find(item => location.pathname === item.href || location.pathname.startsWith(item.href + '/')) || group.items[0];
                  if (!primaryItem) return null;
                  const isActive = group.items.some(item => location.pathname === item.href || location.pathname.startsWith(item.href + '/'));
                  return (
                    <SidebarMenuItem key={group.label} className="overflow-visible">
                      <div className="thermi-rail-menu group/rail relative flex justify-center overflow-visible">
                        <button
                          onClick={() => handleNav(primaryItem.href)}
                          className={cn(
                            "thermi-rail-item flex h-10 w-10 items-center justify-center rounded-md transition-all",
                            isActive && "thermi-nav-active bg-sidebar-primary text-sidebar-primary-foreground"
                          )}
                          aria-label={primaryItem.name}
                        >
                          <primaryItem.icon className="h-5 w-5" />
                        </button>
                        <div className="thermi-rail-panel pointer-events-none absolute left-12 top-0 z-[100] min-w-52 opacity-0 transition-all duration-150 group-hover/rail:pointer-events-auto group-hover/rail:translate-x-1 group-hover/rail:opacity-100 group-focus-within/rail:pointer-events-auto group-focus-within/rail:translate-x-1 group-focus-within/rail:opacity-100">
                          <div className="thermi-rail-feather py-2">
                            <div className="mb-1 flex items-center gap-2 px-3 text-[10px] font-semibold uppercase text-sidebar-foreground/55">
                              <span>{group.label}</span>
                              {group.items.length > 1 && <ChevronDown className="h-3 w-3" />}
                            </div>
                            <div className="space-y-0.5">
                              {group.items.map((item) => {
                                const itemActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                                return (
                                  <button
                                    key={item.name}
                                    type="button"
                                    onClick={() => handleNav(item.href)}
                                    className={cn(
                                      "thermi-rail-panel-item flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-sidebar-foreground/80 transition-all",
                                      itemActive && "text-sidebar-foreground"
                                    )}
                                  >
                                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{item.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : visibleNavGroups.map((group) => {
          const isOpen = openGroups.includes(group.label);
          const hasActiveItem = group.items.some(item => location.pathname === item.href);

          if (group.items.length === 1) {
            const item = group.items[0];
            const isActive = location.pathname === item.href;
            return (
              <SidebarGroup key={group.label} className="py-1 px-0">
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                         className={cn(
                            "thermi-nav-item min-h-[44px]",
                            isActive && "thermi-nav-active bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                         )}
                         tooltip={undefined}
                       >
                         <button onClick={() => handleNav(item.href)} className="flex items-center gap-2 w-full">
                           <item.icon className="h-5 w-5" />
                           <span>{item.name}</span>
                         </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          return (
            <Collapsible
              key={group.label}
              open={isCollapsed ? false : isOpen}
              onOpenChange={() => toggleGroup(group.label)}
            >
              <SidebarGroup className="py-1 px-0">
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel
                    className={cn(
                      "cursor-pointer select-none flex items-center justify-between pr-2 pl-2 text-[10px] font-semibold uppercase tracking-wide text-sidebar-foreground/55 hover:text-sidebar-foreground transition-colors",
                      hasActiveItem && !isOpen && "text-sidebar-foreground font-semibold",
                      isCollapsed && "sr-only"
                    )}
                  >
                    <span>{group.label}</span>
                    <ChevronRight className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                      isOpen && "rotate-90"
                    )} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                          <SidebarMenuItem key={item.name}>
                            <SidebarMenuButton
                              asChild
                              className={cn(
                                "thermi-nav-item min-h-[44px]",
                                isActive && "thermi-nav-active bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                              )}
                              tooltip={undefined}
                            >
                              <button onClick={() => handleNav(item.href)} className="flex items-center gap-2 w-full">
                                <item.icon className="h-5 w-5" />
                                <span>{item.name}</span>
                              </button>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>
    </SidebarComponent>
  );
};
