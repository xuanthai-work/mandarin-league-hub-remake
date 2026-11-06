import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminInput, AdminTextarea } from "./AdminInput";
import { FormField } from "./FormField";

describe("FormField", () => {
  it("connects label htmlFor with input id", () => {
    render(
      <FormField label="Tên">{(f) => <AdminInput {...f} placeholder="Nhập tên" />}</FormField>,
    );

    const input = screen.getByLabelText("Tên");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("placeholder", "Nhập tên");
  });

  it("handles required prop: renders aria-hidden asterisk and sets aria-required='true'", () => {
    const { container } = render(
      <FormField label="Tên" required>
        {(f) => <AdminInput {...f} />}
      </FormField>,
    );

    const input = screen.getByLabelText(/Tên/);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-required", "true");

    const asterisk = container.querySelector("span[aria-hidden]");
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveClass("text-destructive");
    expect(asterisk?.textContent).toContain("*");
  });

  it("handles hint prop and connects aria-describedby", () => {
    render(
      <FormField label="Tên" hint="Tối thiểu 2 ký tự">
        {(f) => <AdminInput {...f} />}
      </FormField>,
    );

    const input = screen.getByLabelText("Tên");
    expect(input).toHaveAccessibleDescription("Tối thiểu 2 ký tự");
  });

  it("handles error prop: sets aria-invalid, combines aria-describedby with hint, styles with text-destructive", () => {
    const { container } = render(
      <FormField label="Tên" hint="Gợi ý tên" error="Tên không hợp lệ">
        {(f) => <AdminInput {...f} />}
      </FormField>,
    );

    const input = screen.getByLabelText("Tên");
    expect(input).toHaveAttribute("aria-invalid", "true");

    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const [hintId, errorId] = describedBy!.split(" ");
    expect(hintId).toBeTruthy();
    expect(errorId).toBeTruthy();

    const hintEl = container.querySelector(`#${hintId}`);
    expect(hintEl).toHaveTextContent("Gợi ý tên");

    const errorEl = container.querySelector(`#${errorId}`);
    expect(errorEl).toHaveTextContent("Tên không hợp lệ");
    expect(errorEl).toHaveClass("text-destructive");
  });

  it("omits aria-describedby and aria-invalid when hint and error are absent", () => {
    render(<FormField label="Tên">{(f) => <AdminInput {...f} />}</FormField>);

    const input = screen.getByLabelText("Tên");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).not.toHaveAttribute("aria-invalid");
  });
});

describe("AdminInput", () => {
  it("applies admin styling and overrides default input classes", () => {
    const ref = createRef<HTMLInputElement>();
    render(<AdminInput ref={ref} className="font-mono" />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toHaveClass("rounded-lg", "bg-background", "text-sm", "font-mono");
    expect(ref.current).not.toHaveClass("rounded-md", "bg-transparent");
  });
});

describe("AdminTextarea", () => {
  it("applies admin textarea styling with min-h-[80px] and rounded-lg", () => {
    const { container } = render(<AdminTextarea />);
    const textarea = container.querySelector("textarea");
    expect(textarea).toHaveClass("min-h-[80px]", "rounded-lg");
  });
});
