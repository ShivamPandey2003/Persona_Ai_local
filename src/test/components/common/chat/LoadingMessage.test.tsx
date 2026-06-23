import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import LoadingMessage from "../../../../components/common/Chat/LoadingMessage";

describe("LoadingMessage", () => {
  it("renders the typing indicator inside a chat bubble", () => {
    const { container } = render(<LoadingMessage />);
    // The bubble wrapper carries the muted background class.
    expect(container.querySelector(".bg-muted")).toBeInTheDocument();
    expect(container.firstChild).not.toBeNull();
  });
});
