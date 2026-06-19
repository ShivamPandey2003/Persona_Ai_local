import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { renderWithProviders } from "@/test/test-utils";
import { server } from "@/test/msw/server";
import { API_URL, ok } from "@/test/msw/handlers";
import { authenticate, makeProject } from "@/test/factories";
import { DataTable } from "./DataTable";
import Column from "./Column";
import type { Project } from "@/api/Projects/query";

const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }));
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigateSpy,
}));

const baseProps = {
  columns: Column,
  search: "",
  onSearchChange: vi.fn(),
  pageIndex: 0,
  pageCount: 1,
  total: 1,
  pageSize: 10,
  onPageChange: vi.fn(),
  isFetching: false,
};

function renderTable(data: Project[], overrides: Partial<typeof baseProps> = {}) {
  return renderWithProviders(
    <DataTable {...baseProps} {...overrides} data={data} />,
  );
}

beforeEach(() => {
  navigateSpy.mockReset();
  authenticate();
});

describe("DataTable", () => {
  it("renders a row per project", () => {
    renderTable([
      makeProject({ project_id: "p1", project_name: "Alpha" }),
      makeProject({ project_id: "p2", project_name: "Beta" }),
    ]);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("shows an empty state when there are no projects", () => {
    renderTable([]);
    expect(screen.getByText("No projects found")).toBeInTheDocument();
  });

  it("relays search input changes to the parent", async () => {
    const onSearchChange = vi.fn();
    const { user } = renderTable([makeProject()], { onSearchChange });
    await user.type(screen.getByPlaceholderText("Find the project..."), "x");
    expect(onSearchChange).toHaveBeenCalledWith("x");
  });

  it("requests the next page when Next is clicked", async () => {
    const onPageChange = vi.fn();
    const { user } = renderTable([makeProject()], {
      pageCount: 3,
      total: 25,
      onPageChange,
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("opens the edit dialog from a row's action menu", async () => {
    const { user } = renderTable([
      makeProject({ project_id: "p1", project_name: "Alpha" }),
    ]);

    await user.click(
      document.querySelector('[data-test-id="ACTION_Alpha"]') as HTMLElement,
    );
    await user.click(await screen.findByText("Edit"));

    expect(await screen.findByRole("heading", { name: "Edit Project" })).toBeInTheDocument();
  });

  it("opens the delete dialog and fires the delete request on confirm", async () => {
    let deleteBody: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_URL}projects/delete`, async ({ request }) => {
        deleteBody = (await request.json()) as Record<string, unknown>;
        return ok({});
      }),
    );

    const { user } = renderTable([
      makeProject({ project_id: "p1", project_name: "Alpha" }),
    ]);

    await user.click(
      document.querySelector('[data-test-id="ACTION_Alpha"]') as HTMLElement,
    );
    await user.click(await screen.findByText("Delete"));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteBody).not.toBeNull());
    expect(deleteBody).toMatchObject({ project_id: "p1" });
  });
});
