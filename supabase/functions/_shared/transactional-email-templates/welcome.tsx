import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Img, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Kiruvo"
const LOGO_URL = "https://dpbbylcycltexyknejcb.supabase.co/storage/v1/object/public/email-assets/kiruvo-logo.png"

interface WelcomeProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME} — let's get you set up!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Img src={LOGO_URL} alt="Kiruvo" width="44" height="44" style={logoImg} />
          <Text style={logoText}>Kiruvo</Text>
        </Section>
        <Heading style={h1}>
          {name ? `Welcome, ${name}! 🎉` : 'Welcome to Kiruvo! 🎉'}
        </Heading>
        <Text style={text}>
          Your account is all set up and ready to go. Kiruvo gives you everything you need to
          manage leads, automate workflows, and grow your business — all in one place.
        </Text>
        <Section style={stepsSection}>
          <Text style={stepTitle}>Here's how to get started:</Text>
          <Text style={step}>1️⃣ &nbsp;Complete your business profile in Settings</Text>
          <Text style={step}>2️⃣ &nbsp;Import your contacts or add your first lead</Text>
          <Text style={step}>3️⃣ &nbsp;Set up your first automation workflow</Text>
        </Section>
        <Section style={ctaSection}>
          <Button style={ctaButton} href="https://kiruvo.com/dashboard">
            Go to Dashboard →
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Welcome to Kiruvo! 🎉',
  displayName: 'Welcome email',
  previewData: { name: 'Alex' },
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
const logoImg = { borderRadius: '8px' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0', letterSpacing: '-0.5px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '24px 25px 12px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 25px 16px' }
const stepsSection = { margin: '8px 25px 20px', padding: '16px 20px', backgroundColor: '#f8faf9', borderRadius: '8px', border: '1px solid #e5ebe8' }
const stepTitle = { fontSize: '14px', fontWeight: '600' as const, color: '#0d0d0d', margin: '0 0 10px' }
const step = { fontSize: '14px', color: '#55575d', lineHeight: '1.8', margin: '0' }
const ctaSection = { textAlign: 'center' as const, margin: '0 25px 24px' }
const ctaButton = { backgroundColor: 'hsl(161, 93%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '6px', fontSize: '14px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e5e5', margin: '20px 25px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 25px 30px' }
