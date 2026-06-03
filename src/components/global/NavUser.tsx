import {
//   BadgeCheck,
//   Bell,
  ChevronsUpDown,
//   CreditCard,
  LogOut,
//   Sparkles,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
// import { useNavigate } from "react-router";
import { cn, getInitials } from "@/lib/utils";
import { Logout } from "@/api/Auth/mutation";

export function NavUser() {
  const { isMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const encryptUser = localStorage.getItem("user");
  const dycryptUser = atob(encryptUser || "");
  const User: { firstName: string; lastName: string; token:string } = JSON.parse(dycryptUser);

  const {mutate, isPending, isError} = Logout()

  return (
    <SidebarMenu className={cn(isCollapsed && "items-center")}>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={cn("data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground md:h-8 md:p-0")}
            >
              <Avatar className="h-8 w-8 rounded-full">
                <AvatarFallback className="rounded-full bg-gradient-to-r from-[#6338F6] to-[#8B5CF6] text-white">{getInitials(`${User.firstName} ${User.lastName}`)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{User.firstName} {User.lastName}</span>
                {/* <span className="truncate text-xs">{User.email}</span> */}
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "right" : "top"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarFallback className="rounded-full bg-linear-to-r from-[#6338F6] to-[#8B5CF6] text-white">{getInitials(`${User.firstName} ${User.lastName}`)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{User.firstName} {User.lastName}</span>
                  {/* <span className="truncate text-xs">{User.email}</span> */}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={()=>mutate()}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
