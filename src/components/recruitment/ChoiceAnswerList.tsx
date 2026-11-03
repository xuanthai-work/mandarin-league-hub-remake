import { Check } from "lucide-react";

/**
 * Google-Form-style answer list shared by the applicant form and the admin preview:
 * one row per option, text on the left, radio/checkbox on the right.
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
  const selected = (option: string) =>
    multiple ? Array.isArray(value) && value.includes(option) : value === option;

  const toggle = (option: string) => {
    if (!multiple) {
      onChange(option);
      return;
    }
    const current = Array.isArray(value) ? value : [];
    onChange(current.includes(option) ? current.filter((x) => x !== option) : [...current, option]);
  };

  return (
    <div
      className="mt-2 space-y-2"
      role={multiple ? "group" : "radiogroup"}
      aria-label={ariaLabel ?? (multiple ? "Chọn nhiều đáp án" : "Chọn một đáp án")}
    >
      {options.map((option) => {
        const isSelected = selected(option);
        return (
          <button
            type="button"
            key={option}
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
        );
      })}
    </div>
  );
}
