import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import GroupMessage from "./GroupMessage";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const userTurn = { role: "user", message: "What do you think?" };
const personaTurn = {
  role: "persona",
  message: "I'd prioritise affordability.",
  persona_name: "Ann Lee",
  evidence_tags: ["price-sensitive", "value-seeker"],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const render = (props: any) => renderWithProviders(<GroupMessage {...props} />);

describe("GroupMessage", () => {
  it("renders a user turn as a right-aligned bubble", () => {
    render({ message: userTurn });
    expect(screen.getByText("What do you think?")).toBeInTheDocument();
  });

  it("renders a persona turn with name, initials and evidence tags", () => {
    render({ message: personaTurn, color: "green" });
    expect(screen.getByText("Ann Lee")).toBeInTheDocument();
    expect(screen.getByText("AL")).toBeInTheDocument(); // initials
    expect(screen.getByText("price-sensitive")).toBeInTheDocument();
    expect(screen.getByText("value-seeker")).toBeInTheDocument();
  });

  it("invokes onEdit with the user message text", async () => {
    const onEdit = vi.fn();
    const { user } = render({ message: userTurn, onEdit });
    await user.click(screen.getAllByRole("button")[0]); // Edit is first
    expect(onEdit).toHaveBeenCalledWith("What do you think?");
  });

  it("does not show an edit action on persona turns", () => {
    render({ message: personaTurn, onEdit: vi.fn() });
    // Persona bubble only exposes the Copy action.
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("renders a persona turn without evidence tags", () => {
    render({
      message: { role: "persona", message: "Plain reply", persona_name: "Cara" },
      color: "red",
    });
    expect(screen.getByText("Cara")).toBeInTheDocument();
    expect(screen.getByText("Plain reply")).toBeInTheDocument();
    expect(screen.queryByText("price-sensitive")).not.toBeInTheDocument();
  });

  it("renders a user turn without an edit action when onEdit is omitted", () => {
    render({ message: userTurn });
    // Only the Copy action is present.
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("copies the persona reply to the clipboard", async () => {
    const writeSpy = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
    const { user } = render({ message: personaTurn, color: "green" });
    await user.click(screen.getByRole("button")); // persona turn: only Copy
    expect(writeSpy).toHaveBeenCalledWith("I'd prioritise affordability.");
  });
});
