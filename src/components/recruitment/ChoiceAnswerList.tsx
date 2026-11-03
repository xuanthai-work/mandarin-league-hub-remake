import { Check } from "lucide-react";
import {
  extractOtherText,
  findOtherAnswer,
  formatOtherAnswer,
  isOtherAnswerValue,
  isOtherOption,
  withOtherOption,
} from "@/lib/recruitment-choice";

/**
 * Google-Form-style answer list shared by the applicant form and the admin preview:
 * one row per option, text on the left, radio/checkbox on the right. Options that
 * mean "Other" reveal a free-text box that stores `"Khác: text"`.
 */
export function ChoiceAnswerList({
  multiple = false,
  options,
  value,
  onChange,
  ariaLabel,
}: {
  /** `true` for "Nhiều lựa chọn", `false` for "Một lựa chọn". */
  multiple?: boolean;
  options: string[];
  value: string | string[] | undefined;
  onChange: (next: string | string[]) => void;
  /** Screen-reader name for the group; the question prompt is the best choice. */
  ariaLabel?: string;
}) {
  const selected = (option: string) => {
    if (isOtherOption(option)) {
      return multiple
        ? Array.isArray(value) && value.some(isOtherAnswerValue)
        : isOtherAnswerValue(value);
    }
    return multiple ? Array.isArray(value) && value.includes(option) : value === option;
  };

  const toggle = (option: string) => {
    if (!multiple) {
      // A picked "Other" can be cleared (dropping its text); normal radios just switch.
      if (isOtherOption(option) && selected(option)) onChange("");
      else onChange(option);
      return;
    }
    const current = Array.isArray(value) ? value : [];
    if (selected(option)) {
      onChange(
        isOtherOption(option)
          ? current.filter((x) => !isOtherAnswerValue(x))
          : current.filter((x) => x !== option),
      );
      return;
    }
    onChange([...current, option]);
  };

  /** Keeps the custom text inside the "Other" entry, replacing it in place for multi. */
  const changeOtherText = (option: string, text: string) => {
    const next = formatOtherAnswer(option, text);
    if (!multiple) {
      onChange(next);
      return;
    }
    const current = Array.isArray(value) ? value : [];
    const index = current.findIndex(isOtherAnswerValue);
    if (index === -1) onChange([...current, next]);
    else onChange(current.map((entry, i) => (i === index ? next : entry)));
  };

  // "Khác" is always offered so applicants can type their own answer. When an admin
  // already saved an Other label we reuse it instead of showing a duplicate row.
  const choices = withOtherOption(options);

  return (
    <div
      className="mt-2 space-y-2"
      role={multiple ? "group" : "radiogroup"}
      aria-label={ariaLabel ?? (multiple ? "Chọn nhiều đáp án" : "Chọn một đáp án")}
    >
      {choices.map((option) => {
        const isSelected = selected(option);
        const isOther = isOtherOption(option);
        return (
          <div key={option}>
            <button
              type="button"
              role={multiple ? "checkbox" : "radio"}
              aria-checked={isSelected}
              onClick={() => toggle(option)}
              className={`group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "border-border/70 bg-card hover:border-border hover:bg-accent/40"
              }`}
            >
              <span
                className={`select-none text-sm ${
                  isSelected
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                {option}
              </span>
              <span
                aria-hidden
                className={`flex h-5 w-5 shrink-0 items-center justify-center border transition-all ${
                  multiple ? "rounded-md" : "rounded-full"
                } ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground ring-4 ring-primary/15"
                    : "border-muted-foreground/30 bg-background group-hover:border-muted-foreground/60"
                }`}
              >
                {isSelected &&
                  (multiple ? (
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-white" />
                  ))}
              </span>
            </button>
            {isOther && isSelected && (
              <div className="mt-2 pl-3 pr-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  autoFocus
                  placeholder="Vui lòng ghi rõ nội dung khác của bạn…"
                  aria-label={`Nội dung khác cho ${option}`}
                  value={extractOtherText(findOtherAnswer(value))}
                  onChange={(e) => changeOtherText(option, e.target.value)}
                  className="w-full rounded-lg border border-primary/40 bg-background px-3 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
