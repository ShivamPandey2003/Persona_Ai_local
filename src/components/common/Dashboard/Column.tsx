import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { File, Users } from "lucide-react";
import { Dropdown } from "./DropDown";

const columnHelper = createColumnHelper<project>();

const Column: ColumnDef<project, any>[] = [
  {
    id: "Select",
    header: () => {
      return <Checkbox />;
    },
    cell: () => {
      return <Checkbox />;
    },
  },
  columnHelper.accessor("title", {
    header: "Project Title",
    cell: ({ row, getValue }) => {
      const ProjectId = row.original.id;
      return (
        <div onClick={() => {}} className="w-full cursor-pointer py-1">
          {getValue()}
        </div>
      );
    },
  }),
  columnHelper.accessor("description", {
    header:  () => {
      return (
        <div className="w-full max-w-[20rem]">
          Description
        </div>
      );
    },
    cell: ({ row, getValue }) => {
      return (
        <div onClick={() => {}} className="w-full max-w-[20rem] overflow-hidden text-ellipsis cursor-pointer py-1">
          {getValue()}
        </div>
      );
    },
  }),
  columnHelper.accessor("files", {
    header: () => {
      return (
        <div className="flex items-center justify-center gap-1">
          <File className="size-4"/>
          <span>Files</span>
        </div>
      );
    },
    cell: ({ getValue }) => {
      return (
        <div onClick={() => {}} className="w-full cursor-pointer py-1 text-center">
          {getValue().length}
        </div>
      );
    },
  }),
  columnHelper.accessor("personas", {
    header: () => {
      return (
        <div className="flex items-center justify-center gap-2">
          <Users className="size-4" />
          <span>Persona</span>
        </div>
      );
    },
    cell: ({ getValue }) => {
      return (
        <div onClick={() => {}} className="w-full cursor-pointer py-1 text-center">
          {getValue().length}
        </div>
      );
    },
  }),
  columnHelper.accessor("createdAt", {
    header:  () => {
      return (
        <div className="text-center">
          CreatedAt
        </div>
      );
    },
    cell: ({ getValue }) => {
      return (
        <div onClick={() => {}} className="w-full cursor-pointer text-center py-1">
          {getValue()}
        </div>
      );
    },
  }),
  {
     id: "Select",
     header:"Actions",
     cell:({row})=>{
        const ProjectId = row.original.id;
        return (
            <Dropdown/>
        )
     }
  }
];

export default Column;
