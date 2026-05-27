import * as React from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Logo } from "@/assets";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

// This is sample data.
const Content = [
  {
    herf: "#",
    id: "abc_123",
    title: "Trust-Led Families",
    desc: "Brand-Loyal Household Consumers",
  },
  {
    herf: "#",
    id: "abc_456",
    title: "Practical Spenders",
    desc: "Value-Conscious Families",
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader className="p-0 px-2">
        <div className="flex h-14 shrink-0 items-center gap-2">
          <div className="">
            <Logo size={45} />
            <span className="sr-only">Persona AI.</span>
          </div>
          <h3 className="font-semibold text-lg">Persona AI</h3>
        </div>
        <Button variant={"outline"} className="gap-4">
          <Users />
          <span>Start Group Chat</span>
        </Button>
      </SidebarHeader>
      <SidebarContent>
            {Content.map((item) => {
              return<></>;
            })}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
