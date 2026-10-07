import { Button, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { CourseEmailLayout, GOLD, NAVY, para } from './course-email-layout'

interface Props { fullName?: string; code?: string; level?: number; zaloLink?: string; feeNote?: string }

function EnrollmentApprovedEmail({ fullName = 'Bạn', code = '—', level, zaloLink = '', feeNote = '' }: Props) {
  return (
    <CourseEmailLayout preview={`Chúc mừng! Bạn đã trúng tuyển lớp ${level ? `HSK ${level}` : ''}`} title="Thư mời tham gia lớp học">
      <Text style={{ ...para, margin: 0 }}>Xin chào <strong>{fullName}</strong>,</Text>
      <Text style={para}>
        Chúc mừng bạn đã chính thức trúng tuyển lớp <strong>{level ? `HSK ${level}` : ''}</strong> của The Mandarin League
        (mã đăng ký <span style={{ fontFamily: 'monospace', fontWeight: 700, color: NAVY }}>{code}</span>).
      </Text>
      <Text style={para}>Mời bạn tham gia nhóm Zalo của lớp để nhận lịch học và link phòng học trực tuyến:</Text>
      {zaloLink ? (
        <Button href={zaloLink} style={{ backgroundColor: NAVY, color: '#FFFFFF', borderRadius: 999, padding: '12px 28px', fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
          Tham gia nhóm Zalo lớp học
        </Button>
      ) : null}
      {feeNote ? (
        <Section style={{ marginTop: 20, backgroundColor: '#FBF6E6', border: `1px solid ${GOLD}`, borderRadius: 12, padding: '14px 18px' }}>
          <Text style={{ margin: 0, fontSize: 14, color: '#1F2937', lineHeight: '22px', whiteSpace: 'pre-line' }}><strong>Hướng dẫn học phí:</strong> {feeNote}</Text>
        </Section>
      ) : null}
      <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: '22px' }}>Hẹn gặp bạn tại buổi học đầu tiên! 🇻🇳 🇨🇳</Text>
    </CourseEmailLayout>
  )
}

export const template = {
  component: EnrollmentApprovedEmail,
  subject: (d: Record<string, any>) => `[The Mandarin League] Chúc mừng bạn trúng tuyển lớp HSK ${d['level'] ?? ''}`.trim(),
  displayName: 'Thư mời trúng tuyển khóa học',
  previewData: { fullName: 'Nguyễn Văn A', code: 'TML-ENR-2610-0001', level: 1, zaloLink: 'https://zalo.me/g/example', feeNote: '' },
} satisfies TemplateEntry
