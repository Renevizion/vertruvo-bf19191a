import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Kiruvo"
const LOGO_URL = "https://dpbbylcycltexyknejcb.supabase.co/storage/v1/object/public/email-assets/kiruvo-logo.png"

interface PaymentReceiptProps {
  customerName?: string
  amount?: string
  currency?: string
  planName?: string
  invoiceId?: string
  date?: string
  nextBillingDate?: string
}

const PaymentReceiptEmail = ({ customerName, amount, currency, planName, invoiceId, date, nextBillingDate }: PaymentReceiptProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment received — ${amount || '0.00'} for {planName || 'your subscription'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Img src={LOGO_URL} alt="Kiruvo" width="44" height="44" style={logoImg} />
          <Text style={logoText}>Kiruvo</Text>
        </Section>
        <Heading style={h1}>💳 Payment Received</Heading>
        <Text style={text}>
          {customerName ? `Hi ${customerName}, we've` : "We've"} successfully processed your payment. Here's your receipt:
        </Text>
        <Section style={receiptCard}>
          <Section style={receiptHeader}>
            <Text style={receiptTitle}>RECEIPT</Text>
          </Section>
          <Text style={detailLabel}>Plan</Text>
          <Text style={detailValue}>{planName || 'Subscription'}</Text>
          <Text style={detailLabel}>Amount</Text>
          <Text style={amountValue}>{currency || '$'}{amount || '0.00'}</Text>
          <Text style={detailLabel}>Date</Text>
          <Text style={detailValue}>{date || new Date().toLocaleDateString()}</Text>
          {invoiceId && (
            <>
              <Text style={detailLabel}>Invoice ID</Text>
              <Text style={detailValue}>{invoiceId}</Text>
            </>
          )}
          {nextBillingDate && (
            <>
              <Hr style={receiptDivider} />
              <Text style={detailLabel}>Next billing date</Text>
              <Text style={detailValue}>{nextBillingDate}</Text>
            </>
          )}
        </Section>
        <Text style={text}>
          If you have any questions about this charge, please don't hesitate to reach out.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentReceiptEmail,
  subject: (data: Record<string, any>) => `Payment Receipt — $${data.amount || '0.00'}`,
  displayName: 'Payment receipt',
  previewData: {
    customerName: 'David Chen',
    amount: '49.00',
    currency: '$',
    planName: 'Professional Plan',
    invoiceId: 'INV-2026-0042',
    date: 'March 23, 2026',
    nextBillingDate: 'April 23, 2026',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", wordBreak: 'break-word' as const }
const container = { padding: '0', width: '100%', maxWidth: '560px', margin: '0 auto', overflow: 'hidden' as const }
const logoBanner = { backgroundColor: 'hsl(161, 93%, 30%)', padding: '20px 25px', borderRadius: '8px 8px 0 0', display: 'flex' as const, alignItems: 'center' as const, gap: '12px' }
const logoImg = { borderRadius: '8px' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0', letterSpacing: '-0.5px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '24px 25px 12px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 25px 16px' }
const receiptCard = { margin: '8px 25px 20px', padding: '0', backgroundColor: '#f8faf9', borderRadius: '8px', border: '1px solid #e5ebe8', overflow: 'hidden' as const }
const receiptHeader = { backgroundColor: '#0d0d0d', padding: '10px 20px' }
const receiptTitle = { fontSize: '11px', fontWeight: '700' as const, color: '#ffffff', letterSpacing: '2px', margin: '0' }
const detailLabel = { fontSize: '11px', color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '12px 20px 2px', fontWeight: '600' as const }
const detailValue = { fontSize: '14px', color: '#0d0d0d', margin: '0 20px 0', fontFamily: "'Inconsolata', monospace" }
const amountValue = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(161, 93%, 30%)', margin: '0 20px 0', fontFamily: "'Inconsolata', monospace" }
const receiptDivider = { borderColor: '#e5ebe8', margin: '12px 20px' }
const hr = { borderColor: '#e5e5e5', margin: '20px 25px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 25px 30px' }
