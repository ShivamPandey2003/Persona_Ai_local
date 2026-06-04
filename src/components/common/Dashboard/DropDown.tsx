import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setProjectDelete } from "@/redux/GlobalModalSlice";
import type { AppDispatch } from "@/redux/store";
import { EllipsisVertical } from "lucide-react";
import { useDispatch } from "react-redux";

type Props = {
  selectedId: string;
};

export function Dropdown({ selectedId }: Props) {
  const dispatch = useDispatch<AppDispatch>();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Open project</DropdownMenuItem>
        <DropdownMenuItem>Edit</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => dispatch(setProjectDelete(selectedId))}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
