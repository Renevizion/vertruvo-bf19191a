import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Img, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Kiruvo"
const LOGO_URL = "https://dpbbylcycltexyknejcb.supabase.co/storage/v1/object/public/email-assets/kiruvo-logo.png"

interface SubscriptionCancelledProps {
  name?: string
  planName?: string
  endDate?: string
}

const SubscriptionCancelledEmail = ({ name, planName, endDate }: SubscriptionCancelledProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {SITE_NAME} subscription has been cancelled</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Img src={LOGO_URL} alt="Kiruvo" width="44" height="44" style={logoImg} />
          <Text style={logoText}>Kiruvo</Text>
        </Section>
        <Heading style={h1}>Subscription Cancelled</Heading>
        <Text style={text}>
          {name ? `Hi ${name}, we're` : "We're"} sorry to see you go.
          Your {planName || 'subscription'} has been cancelled.
        </Text>
        {endDate && (
          <Section style={infoCard}>
            <Text style={detailLabel}>Access until</Text>
            <Text style={detailValue}>{endDate}</Text>
            <Text style={infoText}>
              You'll continue to have full access until this date. After that,
              your account will revert to the free tier.
            </Text>
          </Section>
        )}
        <Text style={text}>
          Your data will be preserved, so you can pick up right where you left off
          if you decide to resubscribe.
        </Text>
        <Section style={ctaSection}>
          <Button style={ctaButton} href="https://kiruvo.com/settings">
            Resubscribe →
          </Button>
        </Section>
        <Text style={textSmall}>
          If you cancelled by mistake or have feedback about why you left,
          we'd love to hear from you — just reply to this email.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SubscriptionCancelledEmail,
  subject: 'Your Kiruvo subscription has been cancelled',
  displayName: 'Subscription cancelled',
  previewData: {
    name: 'Jordan',
    planName: 'Professional Plan',
    endDate: 'April 23, 2026',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", wordBreak: 'break-word' as const }
const container = { padding: '0', width: '100%', maxWidth: '560px', margin: '0 auto', overflow: 'hidden' as const }
const logoBanner = { backgroundColor: 'hsl(161, 93%, 30%)', padding: '20px 25px', borderRadius: '8px 8px 0 0', display: 'flex' as const, alignItems: 'center' as const, gap: '12px' }
const logoImg = { borderRadius: '8px' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0', letterSpacing: '-0.5px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '24px 25px 12px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 25px 16px' }
const textSmall = { fontSize: '12px', color: '#999', lineHeight: '1.5', margin: '0 25px 16px' }
const infoCard = { margin: '8px 25px 20px', padding: '16px 20px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }
const detailLabel = { fontSize: '11px', color: '#92400e', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 2px', fontWeight: '600' as const }
const detailValue = { fontSize: '16px', fontWeight: 'bold' as const, color: '#92400e', margin: '0 0 8px', fontFamily: "'Inconsolata', monospace" }
const infoText = { fontSize: '13px', color: '#92400e', lineHeight: '1.5', margin: '0' }
const ctaSection = { textAlign: 'center' as const, margin: '0 25px 16px' }
const ctaButton = { backgroundColor: 'hsl(161, 93%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '6px', fontSize: '14px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e5e5', margin: '20px 25px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 25px 30px' }
