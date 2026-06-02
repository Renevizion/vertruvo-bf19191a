import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Img, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Kiruvo"
const LOGO_URL = "https://dpbbylcycltexyknejcb.supabase.co/storage/v1/object/public/email-assets/kiruvo-logo.png"

interface DripDay13Props {
  name?: string
  trialEndDate?: string
}

const DripDay13Email = ({ name, trialEndDate }: DripDay13Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your trial ends tomorrow — don't lose your data</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Img src={LOGO_URL} alt="Kiruvo" width="44" height="44" style={logoImg} />
          <Text style={logoText}>Kiruvo</Text>
        </Section>
        <Section style={urgencyBanner}>
          <Text style={urgencyIcon}>⚠️</Text>
          <Text style={urgencyText}>TRIAL ENDS TOMORROW</Text>
        </Section>
        <Heading style={h1}>
          {name ? `${name}, your` : 'Your'} trial ends
          {trialEndDate ? ` on ${trialEndDate}` : ' tomorrow'}
        </Heading>
        <Text style={text}>
          After your trial expires, you'll lose access to:
        </Text>
        <Section style={lossBox}>
          <Text style={lossItem}>❌ &nbsp;Your leads and pipeline data</Text>
          <Text style={lossItem}>❌ &nbsp;Running automations and workflows</Text>
          <Text style={lossItem}>❌ &nbsp;AI agent conversations</Text>
          <Text style={lossItem}>❌ &nbsp;Form submissions and analytics</Text>
        </Section>
        <Text style={text}>
          <strong>Upgrade now</strong> to keep everything. Plans start at just $48/month
          with annual billing.
        </Text>
        <Section style={ctaSection}>
          <Button style={ctaButton} href="https://kiruvo.com/pricing">
            Choose a Plan →
          </Button>
        </Section>
        <Text style={textSmall}>
          Need more time? Reply to this email and we'll work something out.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DripDay13Email,
  subject: '⚠️ Your Kiruvo trial ends tomorrow — upgrade to keep your data',
  displayName: 'Onboarding Day 13 — Final warning',
  previewData: { name: 'Alex', trialEndDate: 'March 28, 2026' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", wordBreak: 'break-word' as const }
const container = { padding: '0', width: '100%', maxWidth: '560px', margin: '0 auto', overflow: 'hidden' as const }
const logoBanner = { backgroundColor: 'hsl(161, 93%, 30%)', padding: '20px 25px', borderRadius: '8px 8px 0 0', display: 'flex' as const, alignItems: 'center' as const, gap: '12px' }
const logoImg = { borderRadius: '8px' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0', letterSpacing: '-0.5px' }
const urgencyBanner = { textAlign: 'center' as const, padding: '20px 25px 0' }
const urgencyIcon = { fontSize: '48px', margin: '0' }
const urgencyText = { fontSize: '12px', fontWeight: '700' as const, color: '#ef4444', letterSpacing: '3px', margin: '8px 0 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '12px 25px 12px', lineHeight: '1.3', textAlign: 'center' as const }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 25px 16px' }
const textSmall = { fontSize: '12px', color: '#999', lineHeight: '1.5', margin: '0 25px 16px' }
const lossBox = { margin: '0 25px 20px', padding: '16px 20px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }
const lossItem = { fontSize: '14px', color: '#55575d', lineHeight: '1.8', margin: '0' }
const ctaSection = { textAlign: 'center' as const, margin: '0 25px 16px' }
const ctaButton = { backgroundColor: '#ef4444', color: '#ffffff', padding: '14px 32px', borderRadius: '6px', fontSize: '15px', fontWeight: '700' as const, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e5e5', margin: '20px 25px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 25px 30px' }
