import { Link, useLocation, useNavigate } from "react-router";
import { Settings, LayoutDashboard, Plus, Users, MessageSquare } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavUser } from "./NavUser";
import { Logo } from "@/assets";
import { cn } from "@/lib/utils";
import { setPersonaDialog } from "@/redux/ProjectSlice";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/redux/store";
import { useMemo } from "react";
import { ScrollArea } from "../ui/scroll-area";
import { listSessions } from "@/lib/chatStore";
import { useActiveProjectId, chatIdFromPath } from "@/hooks/useActiveProjectId";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function NewAppSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const dispatch = useDispatch<AppDispatch>();
  const isCollapsed = state === "collapsed";
  const projectId = useActiveProjectId();

  const inChat = pathname.includes("/chat") || pathname.includes("/group-chat");
  const activeId = chatIdFromPath(pathname);

  // Recents are persisted locally (the backend has no list-conversations API).
  // Recompute on navigation so a freshly started chat appears.
  const sessions = useMemo(
    () => listSessions(projectId),
    [projectId, pathname, activeId],
  );

  const startNewChat = () => {
    if (!projectId) return;
    navigate("/chat", { state: { projectId, forceNew: true } });
  };

  return (
    <Sidebar
      collapsible="icon"
      // REMOVED hardcoded w-[260px] so shadcn can control widths natively on collapse
      className="border-r border-[#E5E7EB] font-sans"
    >
      {/* HEADER: Logo & Brand */}
      <SidebarHeader className="py-4 px-3 transition-all">
        <div
          className={cn(
            "flex items-center gap-2.5 px-1 select-none cursor-pointer transition-all",
            isCollapsed ? "justify-center" : "",
          )}
          onClick={() => navigate("/")}
        >
          <Logo size={45} />
          {!isCollapsed && (
            <span className="text-base font-bold tracking-tight text-[#111827] animate-in fade-in duration-200">
              Persona AI
            </span>
          )}
        </div>
      </SidebarHeader>

      {/* CONTENT: Core Navigation Options */}
      <SidebarContent className="px-2 bg-linear-to-br from-[#eef1ff] via-[#f8f9ff] to-[#e8ecff] space-y-4">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-3 text-xs font-semibold text-[#6B7280] tracking-wider mb-2 group-data-[collapsible=icon]:hidden">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className={cn("gap-1", isCollapsed && "items-center")}>
              {items.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title} // Crucial for icon mode tooltips
                      className={cn(
                        "w-full h-10 rounded-lg transition-all duration-150 font-medium px-3 flex items-center",
                        isActive
                          ? "bg-[#6338F6]! text-white! font-semibold shadow-sm hover:bg-[#6338F6] hover:text-white"
                          : "text-[#4B5563] hover:bg-[#6338F6]/10 hover:text-[#6338F6]",
                      )}
                    >
                      {/* FIXED: Elements must sit flat side-by-side inside the Link component directly */}
                      <Link to={item.url}>
                        <item.icon size={16} className="shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden text-sm">
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {inChat && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={startNewChat}
                      tooltip={"New chat"} // Crucial for icon mode tooltips
                      className={cn(
                        "w-full h-10 rounded-lg transition-all duration-150 font-medium px-3 flex items-center",
                        "text-[#4B5563] hover:bg-[#6338F6]/10 hover:text-[#6338F6]",
                      )}
                    >
                      {/* FIXED: Elements must sit flat side-by-side inside the Link component directly */}
                      <Plus size={16} className="shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden text-sm">
                        New chat
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => dispatch(setPersonaDialog(true))}
                      tooltip={"Start Group Chat"} // Crucial for icon mode tooltips
                      className={cn(
                        "w-full h-10 rounded-lg transition-all duration-150 font-medium px-3 flex items-center",
                        "text-[#4B5563] hover:bg-[#6338F6]/10 hover:text-[#6338F6]",
                      )}
                    >
                      {/* FIXED: Elements must sit flat side-by-side inside the Link component directly */}
                      <Users size={16} className="shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden text-sm">
                        Start Group Chat
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Recents history section auto-hidden when icon mode is active */}
        {inChat && (
          <SidebarGroup className="px-2 group-data-[collapsible=icon]:hidden">
            <span className="text-xs font-semibold text-[#6B7280] tracking-wider block mb-2">
              Recents
            </span>
            {sessions.length ? (
              <ScrollArea className="flex-1 overflow-hidden">
                <SidebarMenu>
                  {sessions.map((session) => {
                    const Icon = session.kind === "group" ? Users : MessageSquare;
                    const to =
                      session.kind === "group"
                        ? `/group-chat/${session.id}`
                        : `/chat/${session.id}`;
                    return (
                      <SidebarMenuItem key={session.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={session.id === activeId}
                          className="data-active:bg-primary! data-active:text-white"
                        >
                          <Link
                            to={to}
                            state={{ projectId: session.projectId }}
                            title={session.title}
                          >
                            <Icon size={14} className="shrink-0" />
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
                              {session.title}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </ScrollArea>
            ) : (
              <p className="text-xs text-[#9CA3AF] px-1 italic">
                No recent history
              </p>
            )}
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* FOOTER: Profile Management */}
      <SidebarFooter
        className={cn(
          "p-2 bg-linear-to-br from-[#eef1ff] via-[#f8f9ff] to-[#e8ecff] border-t border-[#E5E7EB]",
        )}
      >
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
