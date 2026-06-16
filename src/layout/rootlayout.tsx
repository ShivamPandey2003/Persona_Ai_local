import { NewAppSidebar } from "@/components/global/NewSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Outlet, useLocation } from "react-router";
import PersonaPanelDialog from "@/components/common/Chat/PersonaPanelDialog";
import { useActiveProjectId } from "@/hooks/useActiveProjectId";
import { useProjectDetail } from "@/api/Projects/query";

const Rootlayout = () => {
  const { pathname } = useLocation();

  // On chat/group-chat routes, show the active project's real name (from the
  // Project Details API) instead of a generic placeholder.
  const inChat =
    pathname.includes("/chat") || pathname.includes("/group-chat");
  const projectId = useActiveProjectId();
  const { data: project } = useProjectDetail(inChat ? projectId : undefined);

  // Dynamically extract a clean title string based on path routing
  const getPageTitle = () => {
    if (pathname.includes("dashboard")) return "Dashboard";
    if (pathname.includes("settings")) return "Settings";
    return project?.project_name ?? "Persona Space";
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
        <NewAppSidebar />
        
        <SidebarInset className="bg-white flex-1 flex flex-col min-w-0 max-h-screen overflow-hidden">
          <header className="h-14 border-b border-[#F1F1F1] px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <span data-test-id={getPageTitle()} className="text-sm font-medium text-[#111827] ml-2">
                {getPageTitle()}
              </span>
            </div>
          </header>

          {/* MAIN INTERNAL VIEWPORT BODY ROUTE PANEL */}
          <main className="flex-1 overflow-y-auto bg-white">
              <Outlet />
          </main>
        </SidebarInset>
      </div>

      {/* Persona panel: shared across chat routes, toggled via redux. */}
      <PersonaPanelDialog />
    </SidebarProvider>
  );
};

export default Rootlayout;