import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ChatEnded from "./ChatEnded";

describe("ChatEnded", () => {
  it("shows the default ended message", () => {
    render(<ChatEnded />);
    expect(screen.getByText("This conversation has ended.")).toBeInTheDocument();
  });

  it("shows a custom message", () => {
    render(<ChatEnded message="This discussion is closed." />);
    expect(screen.getByText("This discussion is closed.")).toBeInTheDocument();
  });

  it("exposes a polite status region for assistive tech", () => {
    render(<ChatEnded />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
  });
});
