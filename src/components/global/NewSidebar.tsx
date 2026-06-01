import { Link, useLocation, useNavigate } from "react-router";
import { Settings, LayoutDashboard } from "lucide-react";
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

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function NewAppSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

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
            isCollapsed ? "justify-center" : ""
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
      <SidebarContent className="px-2 bg-gradient-to-br from-[#eef1ff] via-[#f8f9ff] to-[#e8ecff] space-y-4">
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
                        "w-full h-10 rounded-xl transition-all duration-150 font-medium px-3 flex items-center",
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Recents history section auto-hidden when icon mode is active */}
        <SidebarGroup className="px-2 group-data-[collapsible=icon]:hidden">
          <span className="text-xs font-semibold text-[#6B7280] tracking-wider block mb-2">
            Recents
          </span>
          <p className="text-xs text-[#9CA3AF] px-1 italic">
            No recent history
          </p>
        </SidebarGroup>
      </SidebarContent>

      {/* FOOTER: Profile Management */}
      <SidebarFooter className={cn("p-2 bg-gradient-to-br from-[#eef1ff] via-[#f8f9ff] to-[#e8ecff] border-t border-[#E5E7EB]")}>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}