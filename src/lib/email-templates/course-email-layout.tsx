import type { ReactNode } from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'

export const NAVY = '#0F2A4A'
export const GOLD = '#C9A227'
export const row = { margin: '0 0 8px', fontSize: 14, color: '#1F2937', lineHeight: '22px' }
export const para = { fontSize: 15, color: '#1F2937', lineHeight: '24px' }

export function CourseEmailLayout({ preview, title, children }: { preview: string; title: string; children: ReactNode }) {
  return (
    <Html lang="vi">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, backgroundColor: '#FFFFFF', fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '32px 16px' }}>
          <Section style={{ backgroundColor: NAVY, borderRadius: '16px 16px 0 0', padding: '24px 32px', borderTop: `4px solid ${GOLD}` }}>
            <Text style={{ margin: 0, color: GOLD, fontSize: 12, fontWeight: 700, letterSpacing: 3 }}>THE MANDARIN LEAGUE</Text>
            <Heading as="h1" style={{ margin: '8px 0 0', color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>{title}</Heading>
          </Section>
          <Section style={{ backgroundColor: '#FFFFFF', padding: '28px 32px', border: '1px solid #E5E7EB', borderTop: 0, borderRadius: '0 0 16px 16px' }}>
            {children}
            <Hr style={{ borderColor: '#E5E7EB', margin: '20px 0' }} />
            <Text style={{ margin: 0, fontSize: 13, color: '#4B5563' }}>Trân trọng,</Text>
            <Text style={{ margin: '6px 0 0', fontSize: 14, fontWeight: 700, color: NAVY }}>BAN CHUYÊN MÔN – GIẢNG DẠY · THE MANDARIN LEAGUE</Text>
            <Text style={{ margin: '6px 0 0', fontSize: 13, color: '#4B5563' }}>📧 community@themandarinleague.bond</Text>
            <Text style={{ margin: '2px 0 0', fontSize: 13, color: '#4B5563' }}>🌐 themandarinleague.bond</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
