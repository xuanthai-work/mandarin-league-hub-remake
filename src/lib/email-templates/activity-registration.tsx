import { Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { CourseEmailLayout, GOLD, NAVY, para, row } from './course-email-layout'

interface Props { fullName?: string; code?: string; activityTitle?: string; startTime?: string; location?: string; phone?: string; submittedAt?: string }

function ActivityRegistrationEmail({ fullName = 'Bạn', code = '—', activityTitle = '—', startTime = '—', location = '—', phone = '—', submittedAt = '—' }: Props) {
  return (
    <CourseEmailLayout preview={`TML đã nhận đăng ký tham gia — Mã ${code}`} title="Xác nhận đăng ký tham gia">
      <Text style={{ ...para, margin: 0 }}>Xin chào <strong>{fullName}</strong>,</Text>
      <Text style={para}>Cảm ơn bạn đã đăng ký tham gia hoạt động của The Mandarin League. Thông tin đăng ký:</Text>
      <Section style={{ backgroundColor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px' }}>
        <Text style={row}>🎯 <strong>Hoạt động:</strong> {activityTitle}</Text>
        <Text style={row}>📅 <strong>Thời gian:</strong> {startTime}</Text>
        <Text style={row}>📍 <strong>Địa điểm:</strong> {location}</Text>
        <Text style={row}>📱 <strong>Số điện thoại:</strong> {phone}</Text>
        <Text style={row}>🆔 <strong>Mã đăng ký:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700, color: NAVY }}>{code}</span></Text>
        <Text style={{ ...row, margin: 0 }}>🕐 <strong>Thời gian đăng ký:</strong> {submittedAt}</Text>
      </Section>
      <Text style={{ margin: '20px 0 0', padding: '10px 16px', backgroundColor: '#FBF6E6', border: `1px solid ${GOLD}`, borderRadius: 8, fontSize: 14, fontWeight: 700, color: NAVY, textAlign: 'center' }}>
        ĐÃ TIẾP NHẬN – ĐANG CHỜ XÁC NHẬN
      </Text>
      <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: '22px' }}>
        Ban tổ chức sẽ liên hệ với bạn qua email hoặc số điện thoại đã đăng ký. Vui lòng kiểm tra cả hộp thư Spam.
      </Text>
    </CourseEmailLayout>
  )
}

export const template = {
  component: ActivityRegistrationEmail,
  subject: (d: Record<string, any>) => `[The Mandarin League] Xác nhận đăng ký tham gia sự kiện: ${d['activityTitle'] ?? ''}`,
  displayName: 'Xác nhận đăng ký hoạt động',
  previewData: { fullName: 'Nguyễn Văn A', code: 'TML-ACT-2610-0001', activityTitle: 'Workshop thư pháp', startTime: '19:00, 20/10/2026', location: 'Google Meet', phone: '0901234567', submittedAt: '18:30, 07/10/2026' },
} satisfies TemplateEntry
