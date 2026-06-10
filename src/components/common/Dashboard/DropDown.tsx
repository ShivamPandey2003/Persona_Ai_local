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

type Props = {
  project: Project;
};

export function Dropdown({ project }: Props) {
  const dispatch = useDispatch<AppDispatch>();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem className="cursor-pointer">Open project</DropdownMenuItem>
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
