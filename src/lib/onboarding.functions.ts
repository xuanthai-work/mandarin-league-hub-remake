import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OnboardingPlan = {
  summary: string;
  phases: {
    title: string;
    duration: string;
    tasks: { title: string; description: string; points: number }[];
    resources: string[];
  }[];
};

const planSchema = z.object({
  summary: z.string().max(1500),
  phases: z
    .array(
      z.object({
        title: z.string().max(200),
        duration: z.string().max(80),
        tasks: z
          .array(
            z.object({
              title: z.string().max(200),
              description: z.string().max(1500),
              points: z.coerce.number().int().min(0).max(100),
            }),
          )
          .max(8),
        resources: z.array(z.string().max(300)).max(8),
      }),
    )
    .min(1)
    .max(5),
});

export const generateOnboardingPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        memberId: z.string().uuid(),
        role: z.string().trim().min(2).max(500),
        experience: z.string().trim().min(2).max(1500),
        goals: z.string().trim().min(2).max(1500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: m } = await supabaseAdmin
      .from("members")
      .select("id, full_name, department, position, status")
      .eq("id", data.memberId)
      .maybeSingle();
    if (!m || m.status !== "active") throw new Error("Thành viên không hợp lệ.");
    const { data: ok } = await context.supabase.rpc("has_perm", {
      _action: "onboarding.manage",
      _dept: m.department,
    });
    if (!ok) throw new Error("Bạn không có quyền tạo lộ trình cho thành viên Ban này.");

    const { runResponsesText } = await import("./ai/responses.server");
    const instructions = `Bạn là điều phối viên nhân sự của The Mandarin League (Liên Đoàn Hán Ngữ) – cộng đồng học tiếng Trung tại Việt Nam.
Lập lộ trình hội nhập 4–8 tuần, thực tế, cho thành viên mới của một Ban. Viết tiếng Việt, ngắn gọn.
Chỉ trả về đúng một đối tượng JSON, không markdown, theo dạng:
{"summary": string, "phases": [{"title": string, "duration": string, "tasks": [{"title": string, "description": string, "points": number}], "resources": [string]}]}
Quy tắc: 3 giai đoạn; mỗi giai đoạn 2–4 việc có thể giao như nhiệm vụ; points 1–20 theo độ khó; resources là loại tài liệu/công cụ nên đọc (không bịa đường link). Không nhắc TML cấp chứng chỉ HSK.`;
    const prompt = `Ban: ${m.department}\nChức vụ: ${m.position}\nVai trò cụ thể: ${data.role}\nKinh nghiệm: ${data.experience}\nMục tiêu: ${data.goals}`;
    const text = await runResponsesText(getRequest(), instructions, [
      { role: "user", content: prompt },
    ]);
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    let plan: OnboardingPlan;
    try {
      plan = planSchema.parse(JSON.parse(json));
    } catch {
      throw new Error("AI trả về kết quả không hợp lệ, vui lòng thử lại.");
    }

    const { data: row, error } = await supabaseAdmin
      .from("onboarding_plans")
      .insert({
        member_id: m.id,
        department: m.department,
        role_desc: data.role,
        experience: data.experience,
        goals: data.goals,
        plan,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, plan };
  });
