import { useEffect, useState, type ComponentProps } from "react";
import NumberFlow, { type Format } from "@number-flow/react";

type AnimatedNumberProps = {
  value: number;
  /** Mặc định "vi-VN" (dấu chấm ngăn cách hàng nghìn, như phần còn lại của site). */
  locale?: string;
  /** Tùy chọn format của NumberFlow, tương thích với Intl.NumberFormat. */
  format?: Format;
  prefix?: string;
  suffix?: string;
  className?: string;
};

/**
 * A number that rolls digit by digit when its value changes.
 * The first render (server and client) is plain text with the same formatting, so there is
 * no hydration mismatch; after mount it hands over to NumberFlow.
 */
export function AnimatedNumber({
  value,
  locale = "vi-VN",
  format,
  prefix,
  suffix,
  className,
}: AnimatedNumberProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    const text = new Intl.NumberFormat(locale, format).format(value);
    return (
      <span className={className}>
        {prefix}
        {text}
        {suffix}
      </span>
    );
  }

  const flowProps: ComponentProps<typeof NumberFlow> = {
    value,
    locales: locale,
  };
  if (format !== undefined) flowProps.format = format;
  if (prefix !== undefined) flowProps.prefix = prefix;
  if (suffix !== undefined) flowProps.suffix = suffix;
  if (className !== undefined) flowProps.className = className;

  return <NumberFlow {...flowProps} />;
}
