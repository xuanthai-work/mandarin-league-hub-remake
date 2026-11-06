import { forwardRef, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const ADMIN_FIELD =
  "rounded-lg bg-background text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-primary/20";

/** Ô nhập một dòng chuẩn của admin (h-9, bo lg, chữ sm). */
export const AdminInput = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <Input ref={ref} className={cn(ADMIN_FIELD, className)} {...props} />
  ),
);
AdminInput.displayName = "AdminInput";

/** Ô nhập nhiều dòng chuẩn của admin. */
export const AdminTextarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <Textarea ref={ref} className={cn(ADMIN_FIELD, "min-h-[80px]", className)} {...props} />
  ),
);
AdminTextarea.displayName = "AdminTextarea";
