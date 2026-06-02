import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Img, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Kiruvo"
const LOGO_URL = "https://dpbbylcycltexyknejcb.supabase.co/storage/v1/object/public/email-assets/kiruvo-logo.png"

interface DripDay2Props {
  name?: string
}

const DripDay2Email = ({ name }: DripDay2Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Set up your first workflow in 2 minutes</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Img src={LOGO_URL} alt="Kiruvo" width="44" height="44" style={logoImg} />
          <Text style={logoText}>Kiruvo</Text>
        </Section>
        <Heading style={h1}>
          {name ? `Hey ${name}, ready` : 'Ready'} to automate your follow-ups?
        </Heading>
        <Text style={text}>
          Most businesses lose leads because they don't follow up fast enough. With Kiruvo,
          you can set up an automated follow-up workflow in under 2 minutes.
        </Text>
        <Section style={stepsSection}>
          <Text style={stepTitle}>Here's how:</Text>
          <Text style={step}>1️⃣ &nbsp;Go to <strong>Automations</strong> in the sidebar</Text>
          <Text style={step}>2️⃣ &nbsp;Click <strong>Create Workflow</strong></Text>
          <Text style={step}>3️⃣ &nbsp;Choose "New Lead Follow-up" template</Text>
          <Text style={step}>4️⃣ &nbsp;Customize the email and activate it</Text>
        </Section>
        <Text style={text}>
          That's it! Every new lead will automatically get a personalized follow-up email.
        </Text>
        <Section style={ctaSection}>
          <Button style={ctaButton} href="https://kiruvo.com/automations">
            Create Your First Workflow →
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DripDay2Email,
  subject: '🔄 Set up automated follow-ups in 2 minutes',
  displayName: 'Onboarding Day 2 — First workflow',
  previewData: { name: 'Alex' },
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
