import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RootState } from "@/redux/store";
import { BarChart3, CheckCircle2, XCircle } from "lucide-react";
import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router";
import PersonaResultCard from "./PersonaCard";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Prop {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const PersonaDialog = ({ open, setOpen }: Prop) => {
  const { projects } = useSelector((state: RootState) => state.Project);
  const location = useLocation();

  const state = location.state as { projectId: string };

  const Project = useMemo(() => {
    if (!state.projectId) {
      return null;
    }

    const project = projects.find((pre) => pre.id === state.projectId);

    if (!project) return null;

    return project;
  }, [projects, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Persona Panel</DialogTitle>
          <DialogDescription>
            3 of 3 personas were successfully created and matched to respondent
            data.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="h-fit">
            <CardContent className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{3}</p>
                <p className="text-xs text-muted-foreground">
                  Personas Created
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="h-fit">
            <CardContent className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                <XCircle className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{0}</p>
                <p className="text-xs text-muted-foreground">
                  Insufficient Data
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="h-fit">
            <CardContent className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <BarChart3 className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {Project?.files?.length}
                </p>
                <p className="text-xs text-muted-foreground">Data Files</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <ScrollArea className="h-[450px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 items-start">
        {
           Project?.personas.map((item, i)=>{
                return <PersonaResultCard key={i} persona={item} id={state.projectId}/>
            })
        }
        </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default PersonaDialog;
