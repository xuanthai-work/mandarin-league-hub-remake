import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SectionOutline } from "./SectionOutline";
import { HOME_SECTIONS, NAV_PAGES } from "@/lib/site-content-fields";

const noop = () => {};
const show = { about: true, carousel: true, courses: true, activities: true, cta: true };

function renderTree(overrides: Partial<Parameters<typeof SectionOutline>[0]> = {}) {
  return render(
    <SectionOutline
      sections={HOME_SECTIONS}
      navPages={NAV_PAGES}
      selection={{ kind: "section", id: "about" }}
      onSelectSection={noop}
      onSelectPage={noop}
      show={show}
      onToggle={noop}
      dirtySectionIds={new Set(["about"])}
      dirtyPageIds={new Set(["community-page"])}
      {...overrides}
    />,
  );
}

describe("SectionOutline tree view", () => {
  it("lists the eight homepage sections and the auxiliary block", () => {
    renderTree();
    for (const label of [
      "Banner đầu trang",
      "Giới thiệu",
      "Cơ cấu tổ chức",
      "Khóa học HSK",
      "Đội ngũ giảng viên",
      "Hoạt động tiêu biểu",
      "Đối tác đồng hành",
      "Trung tâm xác minh",
      "Kêu gọi tham gia & Liên hệ",
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("renders navigation pages as children right under their section", () => {
    renderTree();
    for (const label of [
      "Về TML",
      "Cộng đồng TML",
      "Chi tiết cơ cấu tổ chức",
      "Khóa học HSK 1–6",
      "Tất cả khóa học",
      "Tất cả giảng viên",
      "Tất cả hoạt động",
      "Tất cả tin tức",
      "Tất cả đối tác",
      "Xác minh chứng nhận",
      "Xác minh kết quả HSK",
      "Tham gia TML",
      "Liên hệ",
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("never shows content blocks as tree entries", () => {
    renderTree();
    for (const label of ["Giá trị cốt lõi", "Sơ đồ tổ chức", "Bản tin & Kiến thức"]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it("does not show navigation-page counts instead of page names", () => {
    renderTree();
    expect(screen.queryByText(/trang điều hướng/)).not.toBeInTheDocument();
  });

  it("selects a section when its row is clicked", () => {
    const onSelectSection = vi.fn();
    renderTree({ onSelectSection });
    fireEvent.click(screen.getByRole("button", { name: "Cơ cấu tổ chức" }));
    expect(onSelectSection).toHaveBeenCalledWith("organization");
  });

  it("selects a navigation page when its child row is clicked", () => {
    const onSelectPage = vi.fn();
    renderTree({ onSelectPage });
    fireEvent.click(screen.getByRole("button", { name: "Cộng đồng TML" }));
    expect(onSelectPage).toHaveBeenCalledWith("community-page");
  });

  it("collapses and expands a section's children with the chevron", () => {
    renderTree();
    const chevron = screen.getByRole("button", { name: "Thu gọn Giới thiệu" });
    expect(chevron).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByText("Về TML").length).toBeGreaterThan(0);

    fireEvent.click(chevron);
    expect(screen.getByRole("button", { name: "Mở Giới thiệu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByText("Về TML")).not.toBeInTheDocument();
  });

  it("keeps the active navigation page visible even if its section was collapsed", () => {
    const { rerender } = renderTree({
      selection: { kind: "page", id: "about-page" },
    });
    expect(screen.getAllByText("Về TML").length).toBeGreaterThan(0);
    rerender(
      <SectionOutline
        sections={HOME_SECTIONS}
        navPages={NAV_PAGES}
        selection={{ kind: "page", id: "community-page" }}
        onSelectSection={noop}
        onSelectPage={noop}
        show={show}
        onToggle={noop}
        dirtySectionIds={new Set()}
        dirtyPageIds={new Set()}
      />,
    );
    expect(screen.getAllByText("Cộng đồng TML").length).toBeGreaterThan(0);
  });
});
