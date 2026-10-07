import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface ApplicationConfirmationProps {
  fullName?: string
  email?: string
  code?: string
  positions?: string[]
  departments?: string[]
  message?: string
  submittedAt?: string
}

const NAVY = '#0F2A4A'
const GOLD = '#C9A227'

const row = { margin: '0 0 8px', fontSize: 14, color: '#1F2937', lineHeight: '22px' }

function ApplicationConfirmationEmail({
  fullName = 'Bạn',
  email = '—',
  code = '—',
  positions = [],
  departments = [],
  message = '',
  submittedAt = '—',
}: ApplicationConfirmationProps) {
  return (
    <Html lang="vi">
      <Head />
      <Preview>{`The Mandarin League đã nhận đơn ứng tuyển của bạn — Mã ${code}`}</Preview>
      <Body style={{ margin: 0, backgroundColor: '#FFFFFF', fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '32px 16px' }}>
          <Section style={{ backgroundColor: NAVY, borderRadius: '16px 16px 0 0', padding: '24px 32px', borderTop: `4px solid ${GOLD}` }}>
            <Text style={{ margin: 0, color: GOLD, fontSize: 12, fontWeight: 700, letterSpacing: 3 }}>THE MANDARIN LEAGUE</Text>
            <Heading as="h1" style={{ margin: '8px 0 0', color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
              Xác nhận đăng ký ứng tuyển thành viên
            </Heading>
          </Section>

          <Section style={{ backgroundColor: '#FFFFFF', padding: '28px 32px', border: '1px solid #E5E7EB', borderTop: 0, borderRadius: '0 0 16px 16px' }}>
            <Text style={{ margin: 0, fontSize: 15, color: '#1F2937', lineHeight: '24px' }}>
              Xin chào <strong>{fullName}</strong>,
            </Text>
            <Text style={{ fontSize: 15, color: '#1F2937', lineHeight: '24px' }}>
              Cảm ơn bạn đã đăng ký trở thành thành viên của The Mandarin League – Online Chinese Learning Community.
              Chúng tôi đã nhận được đơn đăng ký của bạn với thông tin:
            </Text>

            <Section style={{ backgroundColor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px' }}>
              <Text style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: NAVY, letterSpacing: 1 }}>THÔNG TIN ỨNG TUYỂN</Text>
              <Text style={row}>👤 <strong>Họ và tên:</strong> {fullName}</Text>
              <Text style={row}>📧 <strong>Email:</strong> {email}</Text>
              <Text style={row}>💼 <strong>Vị trí ứng tuyển:</strong> {positions.length ? positions.join('; ') : '—'}</Text>
              <Text style={row}>🏢 <strong>Ban đăng ký:</strong> {departments.length ? departments.join('; ') : '—'}</Text>
              <Text style={{ ...row, whiteSpace: 'pre-line' }}>💬 <strong>Lời nhắn:</strong> {message || '—'}</Text>
              <Text style={row}>🆔 <strong>Mã ứng tuyển:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700, color: NAVY }}>{code}</span></Text>
              <Text style={{ ...row, margin: 0 }}>🕐 <strong>Thời gian đăng ký:</strong> {submittedAt}</Text>
            </Section>

            <Text style={{ fontSize: 14, color: '#1F2937', margin: '20px 0 8px' }}>Đơn đăng ký của bạn hiện đang ở trạng thái:</Text>
            <Text style={{ margin: 0, padding: '10px 16px', backgroundColor: '#FBF6E6', border: `1px solid ${GOLD}`, borderRadius: 8, fontSize: 14, fontWeight: 700, color: NAVY, textAlign: 'center' }}>
              ĐÃ TIẾP NHẬN – ĐANG CHỜ XÉT DUYỆT
            </Text>

            <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: '22px' }}>
              Ban Nhân sự sẽ tiến hành xem xét hồ sơ. Nếu hồ sơ phù hợp, chúng tôi sẽ liên hệ với bạn qua email đã đăng ký.
              Bạn có thể dùng mã ứng tuyển để theo dõi tiến độ:
            </Text>

            <Button
              href="https://themandarinleague.bond/join"
              style={{ backgroundColor: NAVY, color: '#FFFFFF', borderRadius: 999, padding: '12px 28px', fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}
            >
              Tra cứu tiến độ hồ sơ
            </Button>

            <Text style={{ fontSize: 14, color: '#1F2937', lineHeight: '22px', marginTop: 20 }}>
              Chúc bạn có một hành trình học tập, kết nối và phát triển thật ý nghĩa cùng The Mandarin League! 🇻🇳 🇨🇳
            </Text>

            <Hr style={{ borderColor: '#E5E7EB', margin: '20px 0' }} />

            <Text style={{ margin: 0, fontSize: 13, color: '#4B5563' }}>Trân trọng,</Text>
            <Text style={{ margin: '6px 0 0', fontSize: 14, fontWeight: 700, color: NAVY }}>THE MANDARIN LEAGUE</Text>
            <Text style={{ margin: '2px 0 0', fontSize: 13, color: '#4B5563' }}>Online Chinese Learning Community</Text>
            <Text style={{ margin: '2px 0 10px', fontSize: 12, color: '#6B7280', fontStyle: 'italic' }}>
              Connecting learners, educators &amp; opportunities across Vietnam and China
            </Text>
            <Text style={{ margin: 0, fontSize: 13, color: '#4B5563' }}>📧 community@themandarinleague.bond</Text>
            <Text style={{ margin: '2px 0 0', fontSize: 13, color: '#4B5563' }}>🌐 themandarinleague.bond</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ApplicationConfirmationEmail,
  subject: '[The Mandarin League] Xác nhận đăng ký ứng tuyển thành viên',
  displayName: 'Xác nhận đăng ký ứng tuyển',
  previewData: {
    fullName: 'Nguyễn Văn A',
    email: 'nguyenvana@example.com',
    code: 'TML-APP-2610-0042',
    positions: ['Giảng viên HSK'],
    departments: ['Ban Chuyên môn – Giảng dạy'],
    message: 'Mong được đóng góp cùng TML!',
    submittedAt: '16:00, 07/10/2026',
  },
} satisfies TemplateEntry
