import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Img, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Kiruvo"
const LOGO_URL = "https://dpbbylcycltexyknejcb.supabase.co/storage/v1/object/public/email-assets/kiruvo-logo.png"

interface LeadWonProps {
  leadName?: string
  dealValue?: string
  closedBy?: string
  pipeline?: string
}

const LeadWonEmail = ({ leadName, dealValue, closedBy, pipeline }: LeadWonProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>🏆 Deal closed! {leadName || 'A lead'} just converted</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Img src={LOGO_URL} alt="Kiruvo" width="44" height="44" style={logoImg} />
          <Text style={logoText}>Kiruvo</Text>
        </Section>
        <Section style={celebrationBanner}>
          <Text style={celebrationEmoji}>🏆</Text>
          <Text style={celebrationText}>DEAL CLOSED</Text>
        </Section>
        <Heading style={h1}>{leadName || 'A lead'} is now a customer!</Heading>
        <Section style={dealCard}>
          <Text style={detailLabel}>Lead</Text>
          <Text style={detailValue}>{leadName || 'Unknown'}</Text>
          {dealValue && (
            <>
              <Text style={detailLabel}>Deal value</Text>
              <Text style={dealValueStyle}>${dealValue}</Text>
            </>
          )}
          {pipeline && (
            <>
              <Text style={detailLabel}>Pipeline</Text>
              <Text style={detailValue}>{pipeline}</Text>
            </>
          )}
          {closedBy && (
            <>
              <Text style={detailLabel}>Closed by</Text>
              <Text style={detailValue}>{closedBy}</Text>
            </>
          )}
        </Section>
        <Section style={ctaSection}>
          <Button style={ctaButton} href="https://kiruvo.com/leads">
            View in CRM →
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LeadWonEmail,
  subject: (data: Record<string, any>) => `🏆 Deal Won: ${data.leadName || 'New Customer'}`,
  displayName: 'Lead won notification',
  previewData: {
    leadName: 'Acme Corporation',
    dealValue: '12,500',
    closedBy: 'Sarah Kim',
    pipeline: 'Enterprise Sales',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", wordBreak: 'break-word' as const }
const container = { padding: '0', width: '100%', maxWidth: '560px', margin: '0 auto', overflow: 'hidden' as const }
const logoBanner = { backgroundColor: 'hsl(161, 93%, 30%)', padding: '20px 25px', borderRadius: '8px 8px 0 0', display: 'flex' as const, alignItems: 'center' as const, gap: '12px' }
const logoImg = { borderRadius: '8px' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0', letterSpacing: '-0.5px' }
const celebrationBanner = { textAlign: 'center' as const, padding: '20px 25px 0' }
const celebrationEmoji = { fontSize: '48px', margin: '0' }
const celebrationText = { fontSize: '12px', fontWeight: '700' as const, color: 'hsl(161, 93%, 30%)', letterSpacing: '3px', margin: '8px 0 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '12px 25px 16px', lineHeight: '1.3', textAlign: 'center' as const }
const dealCard = { margin: '8px 25px 20px', padding: '16px 20px', backgroundColor: '#f8faf9', borderRadius: '8px', border: '1px solid #e5ebe8' }
const detailLabel = { fontSize: '11px', color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 2px', fontWeight: '600' as const }
const detailValue = { fontSize: '14px', color: '#0d0d0d', margin: '0 0 12px', fontFamily: "'Inconsolata', monospace" }
const dealValueStyle = { fontSize: '28px', fontWeight: 'bold' as const, color: 'hsl(161, 93%, 30%)', margin: '0 0 12px', fontFamily: "'Inconsolata', monospace" }
const ctaSection = { textAlign: 'center' as const, margin: '0 25px 24px' }
const ctaButton = { backgroundColor: 'hsl(161, 93%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '6px', fontSize: '14px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e5e5', margin: '20px 25px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 25px 30px' }
