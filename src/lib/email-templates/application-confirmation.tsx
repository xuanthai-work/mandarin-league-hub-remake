import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface ApplicationConfirmationProps {
  fullName?: string
  code?: string
  periodName?: string
  choices?: string[]
  phone?: string
}

const NAVY = '#0F2A4A'
const GOLD = '#C9A227'

function ApplicationConfirmationEmail({
  fullName = 'Bạn',
  code = 'TML-APP-000000',
  periodName = 'Đợt tuyển thành viên',
  choices = ['Ban Chuyên môn – Giảng dạy'],
  phone = '—',
}: ApplicationConfirmationProps) {
  return (
    <Html lang="vi">
      <Head />
      <Preview>{`THE MANDARIN LEAGUE đã nhận hồ sơ của bạn — Mã hồ sơ ${code}`}</Preview>
      <Body style={{ margin: 0, backgroundColor: '#F4F6F9', fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '32px 16px' }}>
          <Section style={{ backgroundColor: NAVY, borderRadius: '16px 16px 0 0', padding: '24px 32px' }}>
            <Text style={{ margin: 0, color: GOLD, fontSize: 12, fontWeight: 700, letterSpacing: 3 }}>
              THE MANDARIN LEAGUE
            </Text>
            <Heading as="h1" style={{ margin: '8px 0 0', color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
              Xác nhận tiếp nhận hồ sơ ứng tuyển
            </Heading>
          </Section>

          <Section style={{ backgroundColor: '#FFFFFF', padding: '28px 32px', borderRadius: '0 0 16px 16px' }}>
            <Text style={{ margin: 0, fontSize: 15, color: '#1F2937', lineHeight: '24px' }}>
              Chào <strong>{fullName}</strong>,
            </Text>
            <Text style={{ fontSize: 15, color: '#1F2937', lineHeight: '24px' }}>
              Cảm ơn bạn đã ứng tuyển vào THE MANDARIN LEAGUE. Chúng tôi đã tiếp nhận hồ sơ của bạn
              trong <strong>{periodName}</strong>. Dưới đây là thông tin tóm tắt:
            </Text>

            <Section style={{ backgroundColor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px' }}>
              <Text style={{ margin: 0, fontSize: 12, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1 }}>
                Mã hồ sơ của bạn
              </Text>
              <Text style={{ margin: '4px 0 12px', fontSize: 24, fontWeight: 700, color: NAVY, fontFamily: 'monospace' }}>
                {code}
              </Text>
              <Hr style={{ borderColor: '#E5E7EB', margin: '0 0 12px' }} />
              {choices.map((c, i) => (
                <Text key={i} style={{ margin: '0 0 6px', fontSize: 14, color: '#1F2937' }}>
                  <strong>Nguyện vọng {i + 1}:</strong> {c}
                </Text>
              ))}
              <Text style={{ margin: '6px 0 0', fontSize: 14, color: '#1F2937' }}>
                <strong>Số điện thoại:</strong> {phone}
              </Text>
            </Section>

            <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: '22px' }}>
              Vui lòng <strong>lưu lại mã hồ sơ</strong> để tra cứu trạng thái xét duyệt. Bạn có thể
              kiểm tra tiến độ bất cứ lúc nào tại trang Tuyển thành viên:
            </Text>

            <Button
              href="https://themandarinleague.bond/join"
              style={{ backgroundColor: NAVY, color: '#FFFFFF', borderRadius: 999, padding: '12px 28px', fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}
            >
              Tra cứu tiến độ hồ sơ
            </Button>

            <Hr style={{ borderColor: '#E5E7EB', margin: '24px 0' }} />

            <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: '20px' }}>
              Lưu ý: Ban Điều hành sẽ liên hệ với bạn qua email hoặc số điện thoại đã đăng ký khi có
              kết quả. Nếu không thấy email của chúng tôi, vui lòng kiểm tra cả hòm thư Spam/Quảng cáo.
              Mọi thắc mắc xin liên hệ <strong>community@themandarinleague.bond</strong>.
            </Text>
          </Section>

          <Text style={{ margin: '16px 0 0', textAlign: 'center', fontSize: 12, color: '#9CA3AF' }}>
            © THE MANDARIN LEAGUE — Liên Đoàn Hán Ngữ
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ApplicationConfirmationEmail,
  subject: (d: ApplicationConfirmationProps) =>
    `[THE MANDARIN LEAGUE] Xác nhận tiếp nhận hồ sơ ứng tuyển — ${d.code ?? ''}`,
  displayName: 'Xác nhận hồ sơ ứng tuyển',
  previewData: {
    fullName: 'Nguyễn Văn A',
    code: 'TML-APP-2610-0042',
    periodName: 'Đợt tuyển thành viên tháng 10/2026',
    choices: ['Ban Chuyên môn – Giảng dạy — Giảng viên HSK', 'Ban Truyền thông – Marketing — Content Creator'],
    phone: '0901 234 567',
  },
} satisfies TemplateEntry
