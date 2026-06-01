import { NewAppSidebar } from "@/components/global/NewSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Outlet, useLocation } from "react-router";

const Rootlayout = () => {
  const { pathname } = useLocation();

  // Dynamically extract a clean title string based on path routing
  const getPageTitle = () => {
    if (pathname.includes("dashboard")) return "Dashboard Overview";
    if (pathname.includes("settings")) return "Account Settings";
    return "Persona Space";
  };

  return (
    <SidebarProvider 
      defaultOpen={true}
      style={{
        "--sidebar-width": "260px",
        "--sidebar-width-mobile": "260px",
        "--sidebar-width-icon": "76px",
      } as React.CSSProperties}
    >
      <div className="flex min-h-screen w-full bg-white font-sans">
        {/* Unified Application Sidebar */}
        <NewAppSidebar />
        
        <SidebarInset className="bg-white flex-1 flex flex-col min-w-0 max-h-screen overflow-hidden">
          {/* TOP INTERACTIVE ACTION HEADER BAR (Matches chat view look perfectly) */}
          <header className="h-14 border-b border-[#F1F1F1] px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <span className="text-sm font-medium text-[#111827] ml-2">
                {getPageTitle()}
              </span>
            </div>
          </header>

          {/* MAIN INTERNAL VIEWPORT BODY ROUTE PANEL */}
          <main className="flex-1 overflow-y-auto p-4 md:p-4 bg-white">
            <div className="max-w-6xl mx-auto w-full">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Rootlayout;