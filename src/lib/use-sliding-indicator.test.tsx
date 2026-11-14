import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { measureActive, useSlidingIndicator } from "./use-sliding-indicator";

describe("useSlidingIndicator", () => {
  const origOffsetLeft = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetLeft");
  const origOffsetTop = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetTop");
  const origOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
  const origOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "offsetLeft", {
      configurable: true,
      get() {
        return Number(this.getAttribute("data-mock-left")) || 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "offsetTop", {
      configurable: true,
      get() {
        return Number(this.getAttribute("data-mock-top")) || 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get() {
        return Number(this.getAttribute("data-mock-width")) || 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        return Number(this.getAttribute("data-mock-height")) || 0;
      },
    });
  });

  afterEach(() => {
    if (origOffsetLeft) Object.defineProperty(HTMLElement.prototype, "offsetLeft", origOffsetLeft);
    if (origOffsetTop) Object.defineProperty(HTMLElement.prototype, "offsetTop", origOffsetTop);
    if (origOffsetWidth)
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", origOffsetWidth);
    if (origOffsetHeight)
      Object.defineProperty(HTMLElement.prototype, "offsetHeight", origOffsetHeight);
  });

  describe("measureActive", () => {
    it("returns null when no element matches selector", () => {
      const container = document.createElement("div");
      expect(measureActive(container, "[data-state=on]")).toBeNull();
    });

    it("returns box dimensions when an active element matches", () => {
      const container = document.createElement("div");
      const btn = document.createElement("button");
      btn.setAttribute("data-state", "on");
      btn.setAttribute("data-mock-left", "20");
      btn.setAttribute("data-mock-top", "4");
      btn.setAttribute("data-mock-width", "100");
      btn.setAttribute("data-mock-height", "36");
      container.appendChild(btn);

      const box = measureActive(container, "[data-state=on]");
      expect(box).toEqual({ x: 20, y: 4, w: 100, h: 36 });
    });
  });

  function DummySegmented({ activeValue }: { activeValue?: string | undefined }) {
    const { containerRef, pill } = useSlidingIndicator("[data-state=on]", [activeValue]);
    return (
      <div ref={containerRef} data-testid="container" style={{ position: "relative" }}>
        {pill}
        <button
          type="button"
          data-state={activeValue === "a" ? "on" : "off"}
          data-mock-left="10"
          data-mock-top="5"
          data-mock-width="60"
          data-mock-height="30"
        >
          Tab A
        </button>
        <button
          type="button"
          data-state={activeValue === "b" ? "on" : "off"}
          data-mock-left="80"
          data-mock-top="5"
          data-mock-width="70"
          data-mock-height="30"
        >
          Tab B
        </button>
      </div>
    );
  }

  it("renders sliding pill with matching geometry for the active item after mount", () => {
    const { container } = render(<DummySegmented activeValue="a" />);
    const pill = container.querySelector('[data-slot="sliding-pill"]') as HTMLElement;
    expect(pill).toBeInTheDocument();
    expect(pill.style.width).toBe("60px");
    expect(pill.style.height).toBe("30px");
    expect(pill.style.transform).toBe("translate(10px, 5px)");
  });

  it("updates pill transform when active item changes", () => {
    const { container, rerender } = render(<DummySegmented activeValue="a" />);
    let pill = container.querySelector('[data-slot="sliding-pill"]') as HTMLElement;
    expect(pill.style.transform).toBe("translate(10px, 5px)");

    rerender(<DummySegmented activeValue="b" />);
    pill = container.querySelector('[data-slot="sliding-pill"]') as HTMLElement;
    expect(pill.style.transform).toBe("translate(80px, 5px)");
    expect(pill.style.width).toBe("70px");
  });

  it("does not render pill when no item is active", () => {
    const { container } = render(<DummySegmented activeValue={undefined} />);
    const pill = container.querySelector('[data-slot="sliding-pill"]');
    expect(pill).toBeNull();
  });

  function DummyTabs({ activeValue }: { activeValue: string }) {
    const { containerRef, pill } = useSlidingIndicator("[data-state=active]", [], {
      observeAttributes: true,
    });
    return (
      <div ref={containerRef} style={{ position: "relative" }}>
        {pill}
        <button
          id="tab-1"
          type="button"
          data-state={activeValue === "1" ? "active" : "inactive"}
          data-mock-left="0"
          data-mock-top="0"
          data-mock-width="50"
          data-mock-height="25"
        >
          1
        </button>
      </div>
    );
  }

  it("renders pill with observeAttributes for tab lists", () => {
    const { container } = render(<DummyTabs activeValue="1" />);
    const pill = container.querySelector('[data-slot="sliding-pill"]') as HTMLElement;
    expect(pill).toBeInTheDocument();
    expect(pill.style.width).toBe("50px");
  });

  describe("TabsList integration", () => {
    function TestTabs({ count }: { count?: number }) {
      return (
        <Tabs defaultValue="a">
          <span data-testid="render-count">{count ?? 0}</span>
          <TabsList>
            <TabsTrigger
              value="a"
              data-mock-left="0"
              data-mock-top="0"
              data-mock-width="60"
              data-mock-height="32"
            >
              Tab A
            </TabsTrigger>
            <TabsTrigger
              value="b"
              data-mock-left="70"
              data-mock-top="0"
              data-mock-width="80"
              data-mock-height="32"
            >
              Tab B
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
    }

    it("renders TabsList without maximum update depth error and switches pill position on click", async () => {
      // (a) render xong không ném lỗi Maximum update depth exceeded
      const { container, rerender } = render(<TestTabs count={1} />);

      // (b) có span[data-slot="sliding-pill"] với đúng geometry ban đầu
      let pill = container.querySelector('[data-slot="sliding-pill"]') as HTMLElement;
      expect(pill).toBeInTheDocument();
      expect(pill.style.width).toBe("60px");
      expect(pill.style.transform).toBe("translate(0px, 0px)");

      // (c) render lại cha vài lần (rerender) vẫn không lỗi
      rerender(<TestTabs count={2} />);
      rerender(<TestTabs count={3} />);
      expect(screen.getByTestId("render-count")).toHaveTextContent("3");
      pill = container.querySelector('[data-slot="sliding-pill"]') as HTMLElement;
      expect(pill).toBeInTheDocument();

      // (d) bấm tab B thì transform của pill đổi
      const tabB = screen.getByRole("tab", { name: "Tab B" });
      fireEvent.mouseDown(tabB, { button: 0, ctrlKey: false });

      await waitFor(() => {
        pill = container.querySelector('[data-slot="sliding-pill"]') as HTMLElement;
        expect(pill.style.width).toBe("80px");
        expect(pill.style.transform).toBe("translate(70px, 0px)");
      });
    });
  });
});
