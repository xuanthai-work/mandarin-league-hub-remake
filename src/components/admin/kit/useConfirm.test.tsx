import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useConfirm, type ConfirmOpts } from "./useConfirm";
import { useConfirm as fromTrash } from "@/components/admin/Trash";

function TestComponent({ opts }: { opts?: Partial<ConfirmOpts> }) {
  const { confirm, dialog } = useConfirm();
  const [result, setResult] = useState<string>("chưa bấm");

  const handleOpen = async () => {
    const res = await confirm({
      title: "Xác nhận hành động",
      description: "Bạn có chắc chắn muốn thực hiện?",
      ...opts,
    });
    setResult(res ? "đồng ý" : "từ chối");
  };

  return (
    <div>
      <button type="button" onClick={handleOpen}>
        Mở
      </button>
      <span data-testid="result">{result}</span>
      {dialog}
    </div>
  );
}

describe("useConfirm", () => {
  it("opens dialog with title and description, and resolves true on confirm", async () => {
    render(<TestComponent />);

    fireEvent.click(screen.getByRole("button", { name: "Mở" }));

    expect(screen.getByText("Xác nhận hành động")).toBeInTheDocument();
    expect(screen.getByText("Bạn có chắc chắn muốn thực hiện?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hủy" })).toBeInTheDocument();
    const confirmBtn = screen.getByRole("button", { name: "Xác nhận" });
    expect(confirmBtn).toBeInTheDocument();

    fireEvent.click(confirmBtn);

    expect(await screen.findByTestId("result")).toHaveTextContent("đồng ý");
  });

  it("resolves false on cancel", async () => {
    render(<TestComponent />);

    fireEvent.click(screen.getByRole("button", { name: "Mở" }));
    const cancelBtn = screen.getByRole("button", { name: "Hủy" });

    fireEvent.click(cancelBtn);

    expect(await screen.findByTestId("result")).toHaveTextContent("từ chối");
  });

  it("supports confirmLabel and destructive styling", () => {
    render(
      <TestComponent
        opts={{
          confirmLabel: "Xóa",
          destructive: true,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mở" }));

    const deleteBtn = screen.getByRole("button", { name: "Xóa" });
    expect(deleteBtn).toBeInTheDocument();
    expect(deleteBtn).toHaveClass("bg-destructive");
  });

  it("is re-exported identically from Trash.tsx", () => {
    expect(fromTrash).toBe(useConfirm);
  });
});
