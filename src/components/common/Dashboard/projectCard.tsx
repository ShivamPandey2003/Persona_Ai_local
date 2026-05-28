import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Calendar, FileText, Users } from "lucide-react";
import { memo } from "react";
import { Link } from "react-router";

const ProjectCard = ({ project }: { project: project }) => {
  const fileCount = project.files.length;
  const personaCount = project.personas.length;
  return (
    <article className="group relative flex flex-col gap-2 rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{project.createdAt}</span>
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          {project.title}
        </h3>
      </header>
      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {project.description}
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
      <div className="mt-auto pt-2 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-primary"
        >
          Open project
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Checkbox className="border-gray-400"/>
      </div>
    </article>
  );
};

export default memo(ProjectCard);
