// import { AppSidebar } from "@/components/common/Chat/app-sidebar";
import ConversationPromptInput from "@/components/common/Chat/ConversationPromptInput";
// import { ArrowLeft } from "lucide-react";
// import { Separator } from "@/components/ui/separator";
// import {
//   // SidebarInset,
//   // SidebarProvider,
//   SidebarTrigger,
// } from "@/components/ui/sidebar";
// import { Button } from "@/components/ui/button";
// import { useParams } from "react-router";
// import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/redux/store";
// import { MultiFileUploadDialog } from "@/components/common/Chat/MultiFileUploadDialog";
import { setPersonaDialog } from "@/redux/ProjectSlice";
import PersonaDialog from "@/components/common/Chat/PersonaDialog";
// import ProfileDropDown from "@/components/global/ProfileDropDown";

const ChatPage = () => {
  // const [isOpen, setIsOpen] = useState<boolean>(false);
  const { personaDialog } = useSelector(
    (state: RootState) => state.Project,
  );
  const dispatch = useDispatch<AppDispatch>();
  // const { id } = useParams();

  // const location = useLocation();
  // const navigate = useNavigate();

  // const state = location.state as { projectId: string };

  // const project = useMemo(() => {
  //   const project = projects.find((pre) => pre.id === state.projectId);
  //   return project;
  // }, [projects, state.projectId]);

  // useEffect(() => {
  //   if (state && state.projectId) {
  //     const project = projects.find((pre) => pre.id === state.projectId);
  //     if (
  //       project &&
  //       project.files.length === 0 &&
  //       project.personas.length === 0
  //     ) {
  //       setIsOpen(true);
  //     }
  //   }
  // }, [state]);

  // useEffect(() => {
  //   if (id) return;
  //   dispatch(setPersonaDialog(true));
  // }, [id]);

  return (
    <div className="h-full overflow-hidden py-4 md:py-4">
      <ConversationPromptInput />
      {/* <MultiFileUploadDialog
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
      /> */}
      <PersonaDialog
        open={personaDialog}
        setOpen={() => dispatch(setPersonaDialog(false))}
      />
    </div>
  );
};

export default ChatPage;
