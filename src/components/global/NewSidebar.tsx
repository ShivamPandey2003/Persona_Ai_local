import { Link, useLocation, useNavigate } from "react-router";
import { Home, Settings, LayoutDashboard, Plus, Users, MessageSquare } from "lucide-react";
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
import { ScrollArea } from "../ui/scroll-area";
import { useChatList } from "@/api/Chat/query";
import { useActiveProjectId, chatIdFromPath } from "@/hooks/useActiveProjectId";

const items = [
  { title: "Home", url: "/", icon: Home },
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

  // Recents come from the backend chat-list (the source of truth across reloads
  // and devices); freshly started chats appear once their start call invalidates
  // the ["ChatList", projectId] query.
  const { data: sessions = [], isLoading } = useChatList(projectId);

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
      <SidebarHeader className="py-1! px-3 transition-all">
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
      <SidebarContent className="px-2 space-y-4 overflow-hidden">
        <SidebarGroup className="p-0 shrink-0">
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

        {/* Recents history section auto-hidden when icon mode is active.
            Fills the remaining space; only this list scrolls (the nav block
            above stays fixed). */}
        {inChat && (
          <SidebarGroup className="px-2 min-h-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="text-xs font-semibold text-[#6B7280] tracking-wider block mb-2 shrink-0">
              Recents
            </span>
            {isLoading ? (
              <p className="text-xs text-[#9CA3AF] px-1 italic">Loading…</p>
            ) : sessions.length ? (
              <ScrollArea className="min-h-0 flex-1">
                <SidebarMenu>
                  {sessions.map((session, index) => {
                    const Icon = session.kind === "group" ? Users : MessageSquare;
                    return (
                      <SidebarMenuItem
                        key={session.id}
                        style={{
                          animationDelay: `${Math.min(index, 10) * 30}ms`,
                          animationFillMode: "backwards",
                        }}
                        className="duration-300 animate-in fade-in slide-in-from-left-1"
                      >
                        <SidebarMenuButton
                          asChild
                          isActive={session.id === activeId}
                          className="data-active:bg-primary! data-active:text-white"
                        >
                          <Link
                            to={session.to}
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
