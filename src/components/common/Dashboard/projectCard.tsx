import type { Project } from "@/api/Projects/query";
import { setProjectDelete } from "@/redux/GlobalModalSlice";
import type { AppDispatch } from "@/redux/store";
import { FileText, Trash2, Users } from "lucide-react";
import { memo } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

const ProjectCard = ({ project }: { project: Project }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const fileCount = project.total_files_count;
  const personaCount = project.total_personas_count;

  // The whole card is the click target: open the project details (chat) view.
  const openProject = () =>
    navigate("/chat", { state: { projectId: project.project_id } });

  // Stop the card's open handler so the delete icon only deletes.
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(setProjectDelete(project.project_id));
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={openProject}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openProject();
        }
      }}
      className="group relative flex cursor-pointer flex-col gap-2 rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Delete icon (top-right) */}
      <button
        type="button"
        onClick={handleDelete}
        aria-label="Delete project"
        className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <header className="pr-10">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          {project.project_name}
        </h3>
      </header>
      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {project.project_type}
      </p>
      <div className="flex items-center gap-2 pt-1">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs font-medium text-foreground">
          <FileText className="h-3.5 w-3.5" />
          {fileCount} {fileCount === 1 ? "file" : "files"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs font-medium text-foreground">
          <Users className="h-3.5 w-3.5" />
          {personaCount} {personaCount === 1 ? "persona" : "personas"}
        </span>
      </div>
    </article>
  );
};

export default memo(ProjectCard);
