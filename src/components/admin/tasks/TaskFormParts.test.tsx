import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskAttachmentsEditor, TaskPointPicker } from "./TaskFormParts";
import { shortUrl, type TaskAttachment } from "./shared";

describe("TaskFormParts", () => {
  describe("TaskAttachmentsEditor", () => {
    it("shows alert and does not call onChange when URL is invalid", () => {
      const onChange = vi.fn();
      render(<TaskAttachmentsEditor attachments={[]} onChange={onChange} />);

      fireEvent.click(screen.getByRole("button", { name: "Thêm tài liệu liên quan" }));

      const urlInput = screen.getByRole("textbox", { name: "URL tài liệu" });
      fireEvent.change(urlInput, { target: { value: "abc" } });

      fireEvent.click(screen.getByRole("button", { name: "Thêm" }));

      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("http://");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("adds document on Enter when URL is valid and closes add form", () => {
      const onChange = vi.fn();
      render(<TaskAttachmentsEditor attachments={[]} onChange={onChange} />);

      fireEvent.click(screen.getByRole("button", { name: "Thêm tài liệu liên quan" }));

      const urlInput = screen.getByRole("textbox", { name: "URL tài liệu" });
      const targetUrl = "https://example.com/brief";
      fireEvent.change(urlInput, { target: { value: targetUrl } });
      fireEvent.keyDown(urlInput, { key: "Enter" });

      expect(onChange).toHaveBeenCalledTimes(1);
      const added = onChange.mock.calls[0]![0] as TaskAttachment[];
      expect(added).toHaveLength(1);
      expect(added[0]?.url).toBe(targetUrl);
      expect(added[0]?.title).toBe(shortUrl(targetUrl));

      expect(screen.queryByRole("textbox", { name: "URL tài liệu" })).not.toBeInTheDocument();
    });

    it("removes document when clicking remove button", () => {
      const docs: TaskAttachment[] = [
        { id: "1", title: "Doc 1", url: "https://example.com/doc1" },
        { id: "2", title: "Doc 2", url: "https://example.com/doc2" },
      ];
      const onChange = vi.fn();
      render(<TaskAttachmentsEditor attachments={docs} onChange={onChange} />);

      const removeBtn = screen.getByRole("button", { name: "Gỡ tài liệu Doc 1" });
      fireEvent.click(removeBtn);

      expect(onChange).toHaveBeenCalledTimes(1);
      const remaining = onChange.mock.calls[0]![0] as TaskAttachment[];
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.id).toBe("2");
    });
  });

  describe("TaskPointPicker", () => {
    it("sets aria-pressed correctly and calls onChange on click", () => {
      const onChange = vi.fn();
      render(<TaskPointPicker value={10} onChange={onChange} />);

      const btn10 = screen.getByRole("button", { name: /10đ/ });
      const btn5 = screen.getByRole("button", { name: /5đ/ });
      const btn20 = screen.getByRole("button", { name: /20đ/ });

      expect(btn10).toHaveAttribute("aria-pressed", "true");
      expect(btn5).toHaveAttribute("aria-pressed", "false");
      expect(btn20).toHaveAttribute("aria-pressed", "false");

      fireEvent.click(btn20);
      expect(onChange).toHaveBeenCalledWith(20);
    });
  });
});
