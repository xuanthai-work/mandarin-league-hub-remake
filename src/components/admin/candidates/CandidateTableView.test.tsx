import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { CandidateTableView } from "./CandidateTableView";
import type { CandidateApp } from "./shared";

const mockApp: CandidateApp = {
  id: "app-1",
  code: "APP-001",
  full_name: "Nguyễn Văn A",
  email: "vana@example.com",
  phone: "0901234567",
  date_of_birth: "2000-01-01",
  organization: "Đại học Quốc gia",
  facebook_url: "https://facebook.com/vana",
  chinese_level: "Trung cấp",
  hsk_level: "HSK 4",
  status: "submitted",
  created_at: "2026-11-01T08:00:00Z",
  cv_path: "cvs/vana.pdf",
  admin_note: "",
  ai_summary: null,
  answers: {},
  candidate_message: "",
  intro: "",
  period_id: "period-1",
  choices: [
    {
      department: "academic",
      position: "Thành viên",
      position_id: "pos-1",
    },
  ],
};

describe("CandidateTableView", () => {
  it("renders EmptyState when apps list is empty", () => {
    render(<CandidateTableView apps={[]} onOpen={vi.fn()} onOpenCv={vi.fn()} />);

    expect(screen.getByText("Không tìm thấy hồ sơ phù hợp")).toBeInTheDocument();
  });

  it("renders table with candidate details and status pill", () => {
    render(<CandidateTableView apps={[mockApp]} onOpen={vi.fn()} onOpenCv={vi.fn()} />);

    expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument();
    expect(screen.getByText("APP-001")).toBeInTheDocument();
    expect(screen.getByText("NV1")).toBeInTheDocument();
    expect(screen.getByText("HSK 4")).toBeInTheDocument();
  });

  it("calls onOpen when a table row is clicked or key pressed", () => {
    const onOpen = vi.fn();
    render(<CandidateTableView apps={[mockApp]} onOpen={onOpen} onOpenCv={vi.fn()} />);

    const row = screen.getByText("Nguyễn Văn A").closest("tr");
    expect(row).toBeInTheDocument();

    fireEvent.click(row!);
    expect(onOpen).toHaveBeenCalledWith(mockApp);

    onOpen.mockClear();
    fireEvent.keyDown(row!, { key: "Enter" });
    expect(onOpen).toHaveBeenCalledWith(mockApp);

    onOpen.mockClear();
    fireEvent.keyDown(row!, { key: " " });
    expect(onOpen).toHaveBeenCalledWith(mockApp);
  });

  it("calls onOpenCv without triggering onOpen when CV button is clicked", () => {
    const onOpen = vi.fn();
    const onOpenCv = vi.fn();
    render(<CandidateTableView apps={[mockApp]} onOpen={onOpen} onOpenCv={onOpenCv} />);

    const cvBtn = screen.getByRole("button", { name: "Xem CV của Nguyễn Văn A" });
    fireEvent.click(cvBtn);

    expect(onOpenCv).toHaveBeenCalledWith("cvs/vana.pdf");
    expect(onOpen).not.toHaveBeenCalled();
  });
});
