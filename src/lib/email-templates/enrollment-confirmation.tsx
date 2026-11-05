import { Section, Text } from "@react-email/components";
import type { ComponentType } from "react";
import type { TemplateEntry } from "./registry";
import { CourseEmailLayout, GOLD, NAVY, para, row } from "./course-email-layout";

interface Props {
  fullName?: string;
  code?: string;
  level?: number;
  courseName?: string;
  phone?: string;
  submittedAt?: string;
}

function EnrollmentConfirmationEmail({
  fullName = "Bạn",
  code = "—",
  level,
  courseName,
  phone = "—",
  submittedAt = "—",
}: Props) {
  return (
    <CourseEmailLayout
      preview={`TML đã nhận đơn đăng ký khóa học — Mã ${code}`}
      title="Xác nhận đăng ký khóa học"
    >
      <Text style={{ ...para, margin: 0 }}>
        Xin chào <strong>{fullName}</strong>,
      </Text>
      <Text style={para}>
        Cảm ơn bạn đã đăng ký khóa học của The Mandarin League. Chúng tôi đã nhận được đơn của bạn:
      </Text>
      <Section
        style={{
          backgroundColor: "#F8FAFC",
          border: "1px solid #E5E7EB",
          borderRadius: 12,
          padding: "16px 20px",
        }}
      >
        <Text style={row}>
          📘 <strong>Khóa học:</strong> {courseName || (level ? `HSK ${level}` : "—")}
        </Text>
        <Text style={row}>
          📱 <strong>Số điện thoại (Zalo):</strong> {phone}
        </Text>
        <Text style={row}>
          🆔 <strong>Mã đăng ký:</strong>{" "}
          <span style={{ fontFamily: "monospace", fontWeight: 700, color: NAVY }}>{code}</span>
        </Text>
        <Text style={{ ...row, margin: 0 }}>
          🕐 <strong>Thời gian:</strong> {submittedAt}
        </Text>
      </Section>
      <Text
        style={{
          margin: "20px 0 0",
          padding: "10px 16px",
          backgroundColor: "#FBF6E6",
          border: `1px solid ${GOLD}`,
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 700,
          color: NAVY,
          textAlign: "center",
        }}
      >
        ĐÃ TIẾP NHẬN – ĐANG CHỜ XÉT DUYỆT
      </Text>
      <Text style={{ fontSize: 14, color: "#4B5563", lineHeight: "22px" }}>
        Ban Chuyên môn sẽ xét duyệt hồ sơ. Nếu bạn được chọn, chúng tôi sẽ gửi thư mời kèm link nhóm
        Zalo lớp học qua email này.
      </Text>
    </CourseEmailLayout>
  );
}

export const template = {
  component: EnrollmentConfirmationEmail as unknown as ComponentType<Record<string, unknown>>,
  subject: "[The Mandarin League] Xác nhận đăng ký khóa học",
  displayName: "Xác nhận đăng ký khóa học",
  previewData: {
    fullName: "Nguyễn Văn A",
    code: "TML-ENR-2610-0001",
    level: 1,
    phone: "0901234567",
    submittedAt: "18:30, 07/10/2026",
  },
} satisfies TemplateEntry;
