import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@/components/ui/label";
import { CreateProject, type CreateProjectForm } from "@/schemas/Project";
import { Plus } from "lucide-react";
import React from "react";
import { Roles } from "@/data/roles";
import RoleCard from "./RoleCard";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/redux/store";
import { setProjects } from "@/redux/ProjectSlice";
import { formatCurrentDate } from "@/data/DummyFunc";
import { useNavigate } from "react-router";

const CreateProjectDailog = () => {
  const [open, setOpen] = React.useState<boolean>(false);
  const dispatch = useDispatch<AppDispatch>();
 const navigate = useNavigate()
 const uuid = crypto.randomUUID();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreateProjectForm>({
    resolver: zodResolver(CreateProject),
  });

  const selectedRole = watch("role");

  const onSubmit = (data: CreateProjectForm) => {
    const id = Math.random()
    dispatch(setProjects([{
        id: `project-${id}`,
        title: data.title,
        description:"",
        role:data.role,
        files:[],
        personas:[],
        chats:[],
        createdAt: formatCurrentDate()
    }]))
    navigate(`/chat/${uuid}`, {
        state:{
            projectId: `project-${id}`
        }
    })
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={"sm"}>
          <Plus />
          <span className="hidden sm:block">Create Project</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Add a new persona research project to your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 md:my-4 space-y-2">
            <Label>Select your role</Label>
            <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4">
              {Roles.map((item) => {
                return (
                  <RoleCard
                    key={item.id}
                    role={item}
                    isSelected={selectedRole === item.id}
                    setSelected={() => setValue("role", item.id)}
                  />
                );
              })}
            </div>
            {errors.role && (
              <p className="text-sm text-red-500">{errors.role.message}</p>
            )}
          </div>

          <div className="grid gap-4 py-2 md:py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                placeholder="e.g. EverSip Persona Study"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Project</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectDailog;
