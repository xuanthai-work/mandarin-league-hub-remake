import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const numberFlowMock = vi.fn();

type MockProps = {
  value?: number;
  locales?: string;
  prefix?: string;
  suffix?: string;
  [key: string]: unknown;
};

vi.mock("@number-flow/react", () => ({
  default: (props: MockProps) => {
    numberFlowMock(props);
    const { value, locales, prefix, suffix } = props;
    return (
      <span data-testid="mock-number-flow" data-value={value} data-locales={locales}>
        {prefix}
        {value}
        {suffix}
      </span>
    );
  },
}));

import { AnimatedNumber } from "./animated-number";

describe("AnimatedNumber", () => {
  beforeEach(() => {
    numberFlowMock.mockClear();
  });

  it("renders formatted plain text on server (vi-VN thousand separator)", () => {
    const html = renderToString(<AnimatedNumber value={1234567} />);
    expect(html).toContain("1.234.567");
    expect(numberFlowMock).not.toHaveBeenCalled();
  });

  it("renders prefix and suffix correctly on server", () => {
    const html = renderToString(<AnimatedNumber value={50} prefix="+" suffix=" điểm" />);
    const text = html.replace(/<[^>]*>/g, "");
    expect(text).toContain("+50 điểm");
    expect(numberFlowMock).not.toHaveBeenCalled();
  });

  it("hands over to NumberFlow after mount with correct props", () => {
    const { rerender } = render(<AnimatedNumber value={100} prefix="+" suffix=" điểm" />);
    expect(screen.getByTestId("mock-number-flow")).toBeInTheDocument();
    expect(numberFlowMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        value: 100,
        locales: "vi-VN",
        prefix: "+",
        suffix: " điểm",
      }),
    );

    rerender(<AnimatedNumber value={200} prefix="+" suffix=" điểm" />);
    expect(numberFlowMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        value: 200,
        locales: "vi-VN",
        prefix: "+",
        suffix: " điểm",
      }),
    );
  });
});
