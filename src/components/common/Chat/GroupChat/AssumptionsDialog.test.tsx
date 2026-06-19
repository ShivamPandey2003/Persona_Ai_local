import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AssumptionsDialog from "./AssumptionsDialog";

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  initial: ["First assumption", "Second assumption"],
  onSave: vi.fn(),
  isSaving: false,
};

describe("AssumptionsDialog", () => {
  it("does not render when closed", () => {
    render(<AssumptionsDialog {...baseProps} open={false} />);
    expect(screen.queryByText("Shared assumptions")).not.toBeInTheDocument();
  });

  it("seeds the editor with the initial assumptions", async () => {
    render(<AssumptionsDialog {...baseProps} />);
    expect(await screen.findByDisplayValue("First assumption")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Second assumption")).toBeInTheDocument();
  });

  it("adds a new empty assumption row", async () => {
    const user = userEvent.setup();
    render(<AssumptionsDialog {...baseProps} initial={["only one"]} />);
    await screen.findByDisplayValue("only one");

    await user.click(screen.getByRole("button", { name: /add assumption/i }));
    expect(screen.getAllByPlaceholderText(/natural electrolytes/i)).toHaveLength(2);
  });

  it("removes an assumption row", async () => {
    const user = userEvent.setup();
    render(<AssumptionsDialog {...baseProps} />);
    await screen.findByDisplayValue("First assumption");

    const removeButtons = screen.getAllByRole("button", { name: "Remove assumption" });
    await user.click(removeButtons[0]);
    expect(screen.queryByDisplayValue("First assumption")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Second assumption")).toBeInTheDocument();
  });

  it("saves the trimmed, non-empty assumptions", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<AssumptionsDialog {...baseProps} onSave={onSave} />);
    await screen.findByDisplayValue("First assumption");

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(["First assumption", "Second assumption"]);
  });

  it("closes via Cancel", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<AssumptionsDialog {...baseProps} onOpenChange={onOpenChange} />);
    await screen.findByText("Shared assumptions");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables Save while saving is in progress", async () => {
    render(<AssumptionsDialog {...baseProps} isSaving />);
    const dialog = await screen.findByRole("dialog");
    // The loader prepends to the accessible name, so match loosely.
    expect(within(dialog).getByRole("button", { name: /save/i })).toBeDisabled();
  });
});
