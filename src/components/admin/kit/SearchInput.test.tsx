import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchInput } from "./SearchInput";

describe("SearchInput", () => {
  it("renders textbox with accessible label and placeholder", () => {
    render(
      <SearchInput
        value=""
        onChange={() => {}}
        placeholder="Tìm kiếm đối tác..."
        label="Tìm kiếm đối tác"
      />,
    );
    const input = screen.getByRole("textbox", { name: "Tìm kiếm đối tác" });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("placeholder", "Tìm kiếm đối tác...");
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} placeholder="Tìm..." label="Tìm kiếm" />);
    const input = screen.getByRole("textbox", { name: "Tìm kiếm" });
    fireEvent.change(input, { target: { value: "hello" } });
    expect(onChange).toHaveBeenCalledWith("hello");
  });

  it("hides clear button when value is empty", () => {
    render(<SearchInput value="" onChange={() => {}} placeholder="Tìm..." label="Tìm kiếm" />);
    expect(screen.queryByRole("button", { name: "Xóa nội dung tìm kiếm" })).not.toBeInTheDocument();
  });

  it("shows clear button when value is present, clears value and focuses input on click", () => {
    const onChange = vi.fn();
    render(<SearchInput value="abc" onChange={onChange} placeholder="Tìm..." label="Tìm kiếm" />);
    const clearBtn = screen.getByRole("button", {
      name: "Xóa nội dung tìm kiếm",
    });
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(onChange).toHaveBeenCalledWith("");
    const input = screen.getByRole("textbox", { name: "Tìm kiếm" });
    expect(document.activeElement).toBe(input);
  });

  it("uses custom className on container when provided", () => {
    const { container } = render(
      <SearchInput
        value=""
        onChange={() => {}}
        placeholder="Tìm..."
        label="Tìm kiếm"
        className="w-40"
      />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("w-40");
    expect(wrapper.className).not.toContain("min-w-[240px]");
  });
});
