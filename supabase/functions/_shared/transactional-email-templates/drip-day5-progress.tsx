import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Img, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Kiruvo"
const LOGO_URL = "https://dpbbylcycltexyknejcb.supabase.co/storage/v1/object/public/email-assets/kiruvo-logo.png"

interface DripDay5Props {
  name?: string
  leadCount?: number
}

const DripDay5Email = ({ name, leadCount }: DripDay5Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your first week with Kiruvo — here's what's working</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Img src={LOGO_URL} alt="Kiruvo" width="44" height="44" style={logoImg} />
          <Text style={logoText}>Kiruvo</Text>
        </Section>
        <Heading style={h1}>
          {name ? `${name}, you're` : "You're"} making progress! 📈
        </Heading>
        <Text style={text}>
          You've been on Kiruvo for 5 days now.
          {leadCount && leadCount > 0
            ? ` You've already captured ${leadCount} lead${leadCount !== 1 ? 's' : ''}!`
            : ' Time to capture your first lead.'
          }
        </Text>
        <Section style={stepsSection}>
          <Text style={stepTitle}>Quick wins for this week:</Text>
          <Text style={step}>📋 &nbsp;<strong>Embed a form</strong> on your website to capture leads 24/7</Text>
          <Text style={step}>🤖 &nbsp;<strong>Train an AI agent</strong> to handle common inquiries</Text>
          <Text style={step}>📊 &nbsp;<strong>Check your Insights</strong> dashboard for performance tips</Text>
        </Section>
        <Section style={ctaSection}>
          <Button style={ctaButton} href="https://kiruvo.com/forms">
            Create a Lead Capture Form →
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DripDay5Email,
  subject: '📈 Your first week with Kiruvo — quick wins inside',
  displayName: 'Onboarding Day 5 — Progress check',
  previewData: { name: 'Alex', leadCount: 5 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", wordBreak: 'break-word' as const }
const container = { padding: '0', width: '100%', maxWidth: '560px', margin: '0 auto', overflow: 'hidden' as const }
const logoBanner = { backgroundColor: 'hsl(161, 93%, 30%)', padding: '20px 25px', borderRadius: '8px 8px 0 0', display: 'flex' as const, alignItems: 'center' as const, gap: '12px' }
const logoImg = { borderRadius: '8px' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0', letterSpacing: '-0.5px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '24px 25px 12px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 25px 16px' }
const stepsSection = { margin: '8px 25px 20px', padding: '16px 20px', backgroundColor: '#f8faf9', borderRadius: '8px', border: '1px solid #e5ebe8' }
const stepTitle = { fontSize: '14px', fontWeight: '600' as const, color: '#0d0d0d', margin: '0 0 10px' }
const step = { fontSize: '14px', color: '#55575d', lineHeight: '1.8', margin: '0' }
const ctaSection = { textAlign: 'center' as const, margin: '0 25px 24px' }
const ctaButton = { backgroundColor: 'hsl(161, 93%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '6px', fontSize: '14px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e5e5', margin: '20px 25px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 25px 30px' }
