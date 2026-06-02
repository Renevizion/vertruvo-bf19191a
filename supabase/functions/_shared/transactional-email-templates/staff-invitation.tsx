import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Img, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Kiruvo"
const LOGO_URL = "https://dpbbylcycltexyknejcb.supabase.co/storage/v1/object/public/email-assets/kiruvo-logo.png"

interface StaffInvitationProps {
  staffName?: string
  inviterName?: string
  role?: string
  email?: string
  tempPassword?: string
}

const StaffInvitationEmail = ({ staffName, inviterName, role, email, tempPassword }: StaffInvitationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Img src={LOGO_URL} alt="Kiruvo" width="44" height="44" style={logoImg} />
          <Text style={logoText}>Kiruvo</Text>
        </Section>
        <Heading style={h1}>👋 You're Invited!</Heading>
        <Text style={text}>
          {staffName ? `Hi ${staffName}, ` : ''}
          {inviterName ? `${inviterName} has` : 'You have been'} invited you to join
          their team on {SITE_NAME}
          {role ? ` as a ${role}` : ''}.
        </Text>
        <Section style={credentialsCard}>
          <Text style={cardTitle}>YOUR LOGIN CREDENTIALS</Text>
          <Text style={detailLabel}>Email</Text>
          <Text style={detailValue}>{email || 'Check with your admin'}</Text>
          {tempPassword && (
            <>
              <Text style={detailLabel}>Temporary password</Text>
              <Text style={passwordValue}>{tempPassword}</Text>
              <Text style={warningText}>
                ⚠️ Please change this password immediately after your first login.
              </Text>
            </>
          )}
        </Section>
        <Section style={ctaSection}>
          <Button style={ctaButton} href="https://kiruvo.com/auth">
            Sign In to Kiruvo →
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: StaffInvitationEmail,
  subject: `You've been invited to join ${SITE_NAME}`,
  displayName: 'Staff invitation',
  previewData: {
    staffName: 'Taylor',
    inviterName: 'Marcus Johnson',
    role: 'Team Member',
    email: 'taylor@example.com',
    tempPassword: 'Kv-Temp-8x7Qz',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", wordBreak: 'break-word' as const }
const container = { padding: '0', width: '100%', maxWidth: '560px', margin: '0 auto', overflow: 'hidden' as const }
const logoBanner = { backgroundColor: 'hsl(161, 93%, 30%)', padding: '20px 25px', borderRadius: '8px 8px 0 0', display: 'flex' as const, alignItems: 'center' as const, gap: '12px' }
const logoImg = { borderRadius: '8px' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0', letterSpacing: '-0.5px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '24px 25px 12px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 25px 16px' }
const credentialsCard = { margin: '8px 25px 20px', padding: '0', backgroundColor: '#f8faf9', borderRadius: '8px', border: '1px solid #e5ebe8', overflow: 'hidden' as const }
const cardTitle = { fontSize: '11px', fontWeight: '700' as const, color: '#ffffff', letterSpacing: '2px', margin: '0', padding: '10px 20px', backgroundColor: '#0d0d0d' }
const detailLabel = { fontSize: '11px', color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '12px 20px 2px', fontWeight: '600' as const }
const detailValue = { fontSize: '14px', color: '#0d0d0d', margin: '0 20px 0', fontFamily: "'Inconsolata', monospace" }
const passwordValue = { fontSize: '18px', fontWeight: 'bold' as const, color: 'hsl(161, 93%, 30%)', margin: '0 20px 8px', fontFamily: "'Inconsolata', monospace", letterSpacing: '1px' }
const warningText = { fontSize: '12px', color: '#dc2626', margin: '0 20px 12px', fontWeight: '500' as const }
const ctaSection = { textAlign: 'center' as const, margin: '0 25px 24px' }
const ctaButton = { backgroundColor: 'hsl(161, 93%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '6px', fontSize: '14px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e5e5', margin: '20px 25px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 25px 30px' }
