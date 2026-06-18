import { describe, it, expect } from "vitest";
import ProjectReducer, { setProjects, setPersonaDialog } from "./ProjectSlice";
import { makeProject } from "@/test/factories";

const initial = { projects: [], personaDialog: false };

describe("ProjectSlice", () => {
  it("returns the initial state", () => {
    expect(ProjectReducer(undefined, { type: "@@INIT" })).toEqual(initial);
  });

  it("setProjects replaces the project list", () => {
    const projects = [makeProject(), makeProject({ project_id: "p2" })];
    const state = ProjectReducer(undefined, setProjects(projects));
    expect(state.projects).toEqual(projects);
    expect(state.personaDialog).toBe(false);
  });

  it("setProjects can clear the list back to empty", () => {
    const seeded = ProjectReducer(undefined, setProjects([makeProject()]));
    expect(ProjectReducer(seeded, setProjects([])).projects).toEqual([]);
  });

  it("setPersonaDialog toggles the dialog flag without touching projects", () => {
    const seeded = ProjectReducer(undefined, setProjects([makeProject()]));
    const opened = ProjectReducer(seeded, setPersonaDialog(true));
    expect(opened.personaDialog).toBe(true);
    expect(opened.projects).toEqual(seeded.projects);

    expect(ProjectReducer(opened, setPersonaDialog(false)).personaDialog).toBe(false);
  });
});
