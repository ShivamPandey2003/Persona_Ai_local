import { useSelector, useDispatch } from "react-redux";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PersonaPanel from "./PersonaPanel";
import { useActiveProjectId } from "@/hooks/useActiveProjectId";
import { setPersonaDialog } from "@/redux/ProjectSlice";
import type { AppDispatch, RootState } from "@/redux/store";

/**
 * The persona panel as a dialog, used by the sidebar "Start Group Chat" action.
 * Controlled globally via redux `personaDialog`; the inline project dashboard
 * (ChatEntry) renders the same PersonaPanel content directly.
 */
function PersonaPanelDialog() {
  const open = useSelector((s: RootState) => s.Project.personaDialog);
  const dispatch = useDispatch<AppDispatch>();
  const projectId = useActiveProjectId();

  const close = () => dispatch(setPersonaDialog(false));

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? undefined : close())}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Persona Panel</DialogTitle>
          <DialogDescription>
            Chat with a single persona, or select several and start a group chat.
          </DialogDescription>
        </DialogHeader>
        {/* Only fetch while the dialog is open. */}
        <PersonaPanel projectId={open ? projectId : undefined} onStarted={close} />
      </DialogContent>
    </Dialog>
  );
}

export default PersonaPanelDialog;
