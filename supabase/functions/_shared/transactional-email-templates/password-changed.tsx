import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Kiruvo"
const LOGO_URL = "https://dpbbylcycltexyknejcb.supabase.co/storage/v1/object/public/email-assets/kiruvo-logo.png"

interface PasswordChangedProps {
  name?: string
  changedAt?: string
}

const PasswordChangedEmail = ({ name, changedAt }: PasswordChangedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {SITE_NAME} password was changed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Img src={LOGO_URL} alt="Kiruvo" width="44" height="44" style={logoImg} />
          <Text style={logoText}>Kiruvo</Text>
        </Section>
        <Heading style={h1}>🔒 Password Changed</Heading>
        <Text style={text}>
          {name ? `Hi ${name}, your` : 'Your'} password was successfully changed.
        </Text>
        <Section style={detailsCard}>
          <Text style={detailLabel}>Changed at</Text>
          <Text style={detailValue}>{changedAt || new Date().toISOString()}</Text>
        </Section>
        <Text style={text}>
          If you did not make this change, please reset your password immediately
          and contact our support team.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>— The {SITE_NAME} Security Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PasswordChangedEmail,
  subject: '🔒 Your Kiruvo password was changed',
  displayName: 'Password changed',
  previewData: {
    name: 'Alex',
    changedAt: 'March 23, 2026 at 2:15 PM EST',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", wordBreak: 'break-word' as const }
const container = { padding: '0', width: '100%', maxWidth: '560px', margin: '0 auto', overflow: 'hidden' as const }
const logoBanner = { backgroundColor: 'hsl(161, 93%, 30%)', padding: '20px 25px', borderRadius: '8px 8px 0 0', display: 'flex' as const, alignItems: 'center' as const, gap: '12px' }
const logoImg = { borderRadius: '8px' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0', letterSpacing: '-0.5px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '24px 25px 12px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 25px 16px' }
const detailsCard = { margin: '8px 25px 20px', padding: '16px 20px', backgroundColor: '#f8faf9', borderRadius: '8px', border: '1px solid #e5ebe8' }
const detailLabel = { fontSize: '11px', color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 2px', fontWeight: '600' as const }
const detailValue = { fontSize: '14px', color: '#0d0d0d', margin: '0', fontFamily: "'Inconsolata', monospace" }
const hr = { borderColor: '#e5e5e5', margin: '20px 25px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 25px 30px' }
