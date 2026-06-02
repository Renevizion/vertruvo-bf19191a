import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Img, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Kiruvo"
const LOGO_URL = "https://dpbbylcycltexyknejcb.supabase.co/storage/v1/object/public/email-assets/kiruvo-logo.png"

interface PaymentFailedProps {
  customerName?: string
  amount?: string
  planName?: string
  retryDate?: string
}

const PaymentFailedEmail = ({ customerName, amount, planName, retryDate }: PaymentFailedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Action needed — your payment of ${amount || '0.00'} could not be processed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Img src={LOGO_URL} alt="Kiruvo" width="44" height="44" style={logoImg} />
          <Text style={logoText}>Kiruvo</Text>
        </Section>
        <Section style={warningBanner}>
          <Text style={warningIcon}>⚠️</Text>
        </Section>
        <Heading style={h1}>Payment Failed</Heading>
        <Text style={text}>
          {customerName ? `Hi ${customerName}, we` : 'We'} were unable to process your latest payment.
          Please update your payment method to avoid any interruption to your service.
        </Text>
        <Section style={detailsCard}>
          <Text style={detailLabel}>Plan</Text>
          <Text style={detailValue}>{planName || 'Subscription'}</Text>
          <Text style={detailLabel}>Amount due</Text>
          <Text style={amountStyle}>${amount || '0.00'}</Text>
          {retryDate && (
            <>
              <Text style={detailLabel}>Next retry</Text>
              <Text style={detailValue}>{retryDate}</Text>
            </>
          )}
        </Section>
        <Section style={ctaSection}>
          <Button style={ctaButton} href="https://kiruvo.com/settings">
            Update Payment Method →
          </Button>
        </Section>
        <Text style={textSmall}>
          If you believe this is an error, please contact our support team.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentFailedEmail,
  subject: '⚠️ Payment Failed — Action Required',
  displayName: 'Payment failed',
  previewData: {
    customerName: 'Jordan',
    amount: '49.00',
    planName: 'Professional Plan',
    retryDate: 'March 26, 2026',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", wordBreak: 'break-word' as const }
const container = { padding: '0', width: '100%', maxWidth: '560px', margin: '0 auto', overflow: 'hidden' as const }
const logoBanner = { backgroundColor: 'hsl(161, 93%, 30%)', padding: '20px 25px', borderRadius: '8px 8px 0 0', display: 'flex' as const, alignItems: 'center' as const, gap: '12px' }
const logoImg = { borderRadius: '8px' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0', letterSpacing: '-0.5px' }
const warningBanner = { textAlign: 'center' as const, padding: '20px 25px 0' }
const warningIcon = { fontSize: '48px', margin: '0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#dc2626', margin: '12px 25px 12px', lineHeight: '1.3', textAlign: 'center' as const }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 25px 16px' }
const textSmall = { fontSize: '12px', color: '#999', lineHeight: '1.5', margin: '0 25px 16px' }
const detailsCard = { margin: '8px 25px 20px', padding: '16px 20px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }
const detailLabel = { fontSize: '11px', color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 2px', fontWeight: '600' as const }
const detailValue = { fontSize: '14px', color: '#0d0d0d', margin: '0 0 12px', fontFamily: "'Inconsolata', monospace" }
const amountStyle = { fontSize: '24px', fontWeight: 'bold' as const, color: '#dc2626', margin: '0 0 12px', fontFamily: "'Inconsolata', monospace" }
const ctaSection = { textAlign: 'center' as const, margin: '0 25px 16px' }
const ctaButton = { backgroundColor: '#dc2626', color: '#ffffff', padding: '12px 28px', borderRadius: '6px', fontSize: '14px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e5e5', margin: '20px 25px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 25px 30px' }
