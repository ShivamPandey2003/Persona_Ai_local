import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
// import { Checkbox } from "@/components/ui/checkbox";
import { File, Users } from "lucide-react";
import { Dropdown } from "./DropDown";
import { Link } from "react-router";
import type { Project } from "@/api/Projects/query";

const columnHelper = createColumnHelper<Project>();

const Column: ColumnDef<Project, any>[] = [
  // {
  //   id: "Select",
  //   header: () => {
  //     return <Checkbox className="border-black/50" />;
  //   },
  //   cell: () => {
  //     return <Checkbox />;
  //   },
  // },
  columnHelper.accessor("project_name", {
    header: "Project Title",
    cell: ({ row, getValue }) => {
      const ProjectId = row.original.project_id;
      return (
        <Link to={'/chat'} state={{projectId:ProjectId}}>
        <div className="w-full cursor-pointer py-1">
          {getValue()}
        </div>
        </Link>
      );
    },
  }),
  columnHelper.accessor("project_type", {
    header:  () => {
      return (
        <div className="w-full max-w-[20rem]">
          Type
        </div>
      );
    },
    cell: ({ getValue }) => {
      return (
        <div onClick={() => {}} className="w-full max-w-[20rem] overflow-hidden text-ellipsis cursor-pointer py-1">
          {getValue()}
        </div>
      );
    },
  }),
  columnHelper.accessor("total_files_count", {
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
          {getValue()}
        </div>
      );
    },
  }),
  columnHelper.accessor("total_personas_count", {
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
          {getValue()}
        </div>
      );
    },
  }),
  columnHelper.accessor("status", {
    header:  () => {
      return (
        <div className="text-center">
          Status
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
     id: "Actions",
     header:"Actions",
     cell:({row})=>{
        const ProjectId = row.original.project_id;
        return (
            <Dropdown selectedId={ProjectId}/>
        )
     }
  }
];

export default Column;
