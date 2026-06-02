import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Img, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Kiruvo"
const LOGO_URL = "https://dpbbylcycltexyknejcb.supabase.co/storage/v1/object/public/email-assets/kiruvo-logo.png"

interface TrialExpiringProps {
  name?: string
  daysLeft?: number
  trialEndDate?: string
  planName?: string
}

const TrialExpiringEmail = ({ name, daysLeft, trialEndDate, planName }: TrialExpiringProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your ${SITE_NAME} trial ends in ${daysLeft ?? 3} days — upgrade to keep access`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Img src={LOGO_URL} alt="Kiruvo" width="44" height="44" style={logoImg} />
          <Text style={logoText}>Kiruvo</Text>
        </Section>
        <Section style={urgencyBanner}>
          <Text style={urgencyIcon}>⏳</Text>
          <Text style={urgencyText}>{daysLeft ?? 3} DAYS LEFT</Text>
        </Section>
        <Heading style={h1}>Your trial is ending soon</Heading>
        <Text style={text}>
          {name ? `Hi ${name}, your` : 'Your'} free trial of {SITE_NAME}
          {planName ? ` (${planName})` : ''} ends on{' '}
          <strong>{trialEndDate || 'in a few days'}</strong>.
        </Text>
        <Text style={text}>
          After your trial ends, you'll lose access to your leads, automations,
          and AI agents. Upgrade now to keep everything running smoothly.
        </Text>
        <Section style={valueBox}>
          <Text style={valueTitle}>What you'll keep with a paid plan:</Text>
          <Text style={valueItem}>✅ All your leads, contacts & pipeline data</Text>
          <Text style={valueItem}>✅ Workflow automations running 24/7</Text>
          <Text style={valueItem}>✅ AI agent conversations & insights</Text>
          <Text style={valueItem}>✅ Form submissions & analytics</Text>
        </Section>
        <Section style={ctaSection}>
          <Button style={ctaButton} href="https://kiruvo.com/settings">
            Upgrade Now →
          </Button>
        </Section>
        <Text style={textSmall}>
          Questions? Reply to this email or reach out to our support team.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TrialExpiringEmail,
  subject: '⏳ Your Kiruvo trial ends in 3 days — upgrade to keep access',
  displayName: 'Trial expiring warning',
  previewData: {
    name: 'Alex',
    daysLeft: 3,
    trialEndDate: 'March 26, 2026',
    planName: 'Professional',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", wordBreak: 'break-word' as const }
const container = { padding: '0', width: '100%', maxWidth: '560px', margin: '0 auto', overflow: 'hidden' as const }
const logoBanner = { backgroundColor: 'hsl(161, 93%, 30%)', padding: '20px 25px', borderRadius: '8px 8px 0 0', display: 'flex' as const, alignItems: 'center' as const, gap: '12px' }
const logoImg = { borderRadius: '8px' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0', letterSpacing: '-0.5px' }
const urgencyBanner = { textAlign: 'center' as const, padding: '20px 25px 0' }
const urgencyIcon = { fontSize: '48px', margin: '0' }
const urgencyText = { fontSize: '12px', fontWeight: '700' as const, color: '#f59e0b', letterSpacing: '3px', margin: '8px 0 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '12px 25px 12px', lineHeight: '1.3', textAlign: 'center' as const }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 25px 16px' }
const textSmall = { fontSize: '12px', color: '#999', lineHeight: '1.5', margin: '0 25px 16px' }
const valueBox = { margin: '8px 25px 20px', padding: '16px 20px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }
const valueTitle = { fontSize: '14px', fontWeight: '600' as const, color: '#0d0d0d', margin: '0 0 10px' }
const valueItem = { fontSize: '13px', color: '#55575d', lineHeight: '1.8', margin: '0' }
const ctaSection = { textAlign: 'center' as const, margin: '0 25px 16px' }
const ctaButton = { backgroundColor: '#f59e0b', color: '#ffffff', padding: '12px 28px', borderRadius: '6px', fontSize: '14px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e5e5', margin: '20px 25px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 25px 30px' }
