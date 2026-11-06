import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SegmentedControl } from "./SegmentedControl";

describe("SegmentedControl", () => {
  const options = [
    { value: "edit", label: "Soạn" },
    { value: "preview", label: "Xem trước" },
  ];

  it("renders a group with the accessible label and options with correct states", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Chế độ soạn bài"
        value="edit"
        onChange={onChange}
        options={options}
      />,
    );

    const group = screen.getByRole("radiogroup", { name: "Chế độ soạn bài" });
    expect(group).toBeInTheDocument();

    const editBtn = screen.getByRole("radio", { name: "Soạn" });
    const previewBtn = screen.getByRole("radio", { name: "Xem trước" });

    expect(editBtn).toHaveAttribute("data-state", "on");
    expect(previewBtn).toHaveAttribute("data-state", "off");
  });

  it("calls onChange when clicking another option", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Chế độ soạn bài"
        value="edit"
        onChange={onChange}
        options={options}
      />,
    );

    const previewBtn = screen.getByRole("radio", { name: "Xem trước" });
    fireEvent.click(previewBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("preview");
  });

  it("does not call onChange when clicking the currently active option", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Chế độ soạn bài"
        value="edit"
        onChange={onChange}
        options={options}
      />,
    );

    const editBtn = screen.getByRole("radio", { name: "Soạn" });
    fireEvent.click(editBtn);

    expect(onChange).not.toHaveBeenCalled();
  });
});
