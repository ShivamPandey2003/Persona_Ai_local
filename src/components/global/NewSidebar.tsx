import { Link, useLocation, useNavigate, useParams } from "react-router";
import { Settings, LayoutDashboard, Plus, Users } from "lucide-react";
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
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/redux/store";
import { useMemo } from "react";
import { ScrollArea } from "../ui/scroll-area";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function NewAppSidebar() {
  const { pathname, state: LocState } = useLocation();
  const { projects } = useSelector((state: RootState) => state.Project);
  const navigate = useNavigate();
  const { state } = useSidebar();
  const dispatch = useDispatch<AppDispatch>();
  const isCollapsed = state === "collapsed";
  const { id } = useParams();

  const LocStateId = LocState as { projectId: string };

  const Chats = useMemo(() => {
    if (!LocStateId || !LocStateId.projectId) {
      return [];
    }

    const project = projects.find((pre) => pre.id === LocStateId.projectId);

    if (!project) return [];

    return project.chats;
  }, [projects, state]);

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
              {pathname.includes("/chat") && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => dispatch(setPersonaDialog(true))}
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
                      tooltip={"New chat"} // Crucial for icon mode tooltips
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
        {pathname.includes("/chat") && (
          <SidebarGroup className="px-2 group-data-[collapsible=icon]:hidden">
            <span className="text-xs font-semibold text-[#6B7280] tracking-wider block mb-2">
              Recents
            </span>
            {Chats.length ? (
              <ScrollArea className="flex-1 overflow-hidden">
                <SidebarMenu>
                  {Chats.map((item) => {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={item.id === id}
                          className="data-active:bg-primary! data-active:text-white"
                        >
                          <Link
                            to={`/chat/${item.id}`}
                            state={{ projectId: LocState.projectId }}
                            className=""
                          >
                            <span className="overflow-hidden text-ellipsis max-w-full">
                            {item.title}
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
