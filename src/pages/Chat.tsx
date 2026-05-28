import { AppSidebar } from "@/components/common/Chat/app-sidebar";
import ConversationPromptInput from "@/components/common/Chat/ConversationPromptInput";
import { ArrowLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/redux/store";
import { MultiFileUploadDialog } from "@/components/common/Chat/MultiFileUploadDialog";
import { setPersonaDialog, setProjects } from "@/redux/ProjectSlice";
import PersonaDialog from "@/components/common/Chat/PersonaDialog";

const ChatPage = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { projects, personaDialog } = useSelector((state: RootState) => state.Project);
  const dispatch = useDispatch<AppDispatch>();

  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as { projectId: string };

  useEffect(() => {
    if (state && state.projectId) {
      const project = projects.find((pre) => pre.id === state.projectId);
      if (
        project &&
        project.files.length === 0 &&
        project.personas.length === 0
      ) {
        setIsOpen(true);
      }
    }
  }, [state]);

  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b">
            <div className="flex flex-1 items-center gap-2 px-3">
              <Button
                variant="ghost"
                size={"icon-sm"}
                onClick={() => navigate(-1)}
              >
                <ArrowLeft />
              </Button>
              <SidebarTrigger />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-10"
              />
              <div>
                <h3>Trust-Led Families</h3>
                <p className="text-xs">Brand-Loyal Household Consumers</p>
              </div>
            </div>
          </header>
          <ConversationPromptInput />
        </SidebarInset>
      </SidebarProvider>
      <MultiFileUploadDialog
        open={isOpen}
        setOpen={setIsOpen}
        onUpload={async (files) => {
          dispatch(
            setProjects(
              projects.map((item) => {
                if (item.id === state.projectId) {
                  return {
                    ...item,
                    files: [
                      ...(item.files || []),
                      ...files.map((file) => ({
                        id: `file-${crypto.randomUUID()}`,
                        title: file.name,
                      })),
                    ],
                  };
                }

                return item;
              }),
            ),
          );
        }}
      />
      <PersonaDialog open={personaDialog} setOpen={()=>dispatch(setPersonaDialog(false))}/>
    </>
  );
};

export default ChatPage;
