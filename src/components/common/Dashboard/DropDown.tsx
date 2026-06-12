import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setProjectDelete, setProjectEdit } from "@/redux/GlobalModalSlice";
import type { AppDispatch } from "@/redux/store";
import type { Project } from "@/api/Projects/query";
import { EllipsisVertical } from "lucide-react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

type Props = {
  project: Project;
};

export function Dropdown({ project }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const openProject = () =>
    navigate("/chat", { state: { projectId: project.project_id } });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem className="cursor-pointer" onClick={openProject}>
          Open project
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => dispatch(setProjectEdit(project))}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">Settings</DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive cursor-pointer"
          onClick={() => dispatch(setProjectDelete(project.project_id))}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
