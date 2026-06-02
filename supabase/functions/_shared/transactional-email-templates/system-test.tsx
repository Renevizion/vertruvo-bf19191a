import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Kiruvo"
const LOGO_URL = "https://dpbbylcycltexyknejcb.supabase.co/storage/v1/object/public/email-assets/kiruvo-logo.png"

interface SystemTestProps {
  testId?: string
  timestamp?: string
}

const SystemTestEmail = ({ testId, timestamp }: SystemTestProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Kiruvo email system test — everything is working!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Img src={LOGO_URL} alt="Kiruvo" width="44" height="44" style={logoImg} />
          <Text style={logoText}>Kiruvo</Text>
        </Section>
        <Heading style={h1}>✅ Email System Test Passed</Heading>
        <Text style={text}>
          This is a test email from your Kiruvo platform confirming that your email
          infrastructure is fully operational.
        </Text>
        <Hr style={hr} />
        <Text style={detailLabel}>Domain</Text>
        <Text style={detailValue}>notify.kiruvo.com</Text>
        <Text style={detailLabel}>Test ID</Text>
        <Text style={detailValue}>{testId || 'manual-test'}</Text>
        <Text style={detailLabel}>Sent at</Text>
        <Text style={detailValue}>{timestamp || new Date().toISOString()}</Text>
        <Hr style={hr} />
        <Text style={text}>
          If you received this email, your sending domain, queue system, and
          delivery pipeline are all working correctly.
        </Text>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SystemTestEmail,
  subject: 'Kiruvo Email System Test — Success ✅',
  displayName: 'System test',
  previewData: { testId: 'test-001', timestamp: '2026-03-23T12:00:00Z' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", wordBreak: 'break-word' as const }
const container = { padding: '0', width: '100%', maxWidth: '560px', margin: '0 auto', overflow: 'hidden' as const }
const logoBanner = {
  backgroundColor: 'hsl(161, 93%, 30%)',
  padding: '20px 25px',
  borderRadius: '8px 8px 0 0',
  display: 'flex' as const,
  alignItems: 'center' as const,
  gap: '12px',
}
const logoImg = {
  borderRadius: '8px',
}
const logoText = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#ffffff',
  margin: '0',
  letterSpacing: '-0.5px',
}
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '24px 25px 12px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 25px 16px' }
const hr = { borderColor: '#e5e5e5', margin: '20px 25px' }
const detailLabel = { fontSize: '11px', color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 25px 2px', fontWeight: '600' as const }
const detailValue = { fontSize: '14px', color: '#0d0d0d', margin: '0 25px 12px', fontFamily: "'Inconsolata', monospace" }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 25px 30px' }
