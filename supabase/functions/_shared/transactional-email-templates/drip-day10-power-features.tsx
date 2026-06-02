import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Img, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Kiruvo"
const LOGO_URL = "https://dpbbylcycltexyknejcb.supabase.co/storage/v1/object/public/email-assets/kiruvo-logo.png"

interface DripDay10Props {
  name?: string
}

const DripDay10Email = ({ name }: DripDay10Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Unlock the full power of Kiruvo — features you might have missed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Img src={LOGO_URL} alt="Kiruvo" width="44" height="44" style={logoImg} />
          <Text style={logoText}>Kiruvo</Text>
        </Section>
        <Heading style={h1}>
          {name ? `${name}, there's` : "There's"} more to explore 🚀
        </Heading>
        <Text style={text}>
          You're 10 days into your trial. Here are some powerful features you might not
          have tried yet:
        </Text>
        <Section style={featureBox}>
          <Text style={featureItem}>
            <strong>🧠 AI Agents</strong><br/>
            Create intelligent agents that can respond to leads, answer questions, and
            schedule follow-ups — even while you sleep.
          </Text>
        </Section>
        <Section style={featureBox}>
          <Text style={featureItem}>
            <strong>📊 Analytics & Insights</strong><br/>
            See which lead sources convert best, track your pipeline velocity, and get
            AI-powered recommendations.
          </Text>
        </Section>
        <Section style={featureBox}>
          <Text style={featureItem}>
            <strong>📱 Social Media</strong><br/>
            Connect Instagram to manage DMs, comments, and mentions right from your CRM.
          </Text>
        </Section>
        <Text style={text}>
          Your trial ends in 4 days. Make sure you've explored everything before deciding
          on your plan.
        </Text>
        <Section style={ctaSection}>
          <Button style={ctaButton} href="https://kiruvo.com/ai-agents">
            Explore AI Agents →
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DripDay10Email,
  subject: '🚀 Features you might have missed — 4 days left in your trial',
  displayName: 'Onboarding Day 10 — Power features',
  previewData: { name: 'Alex' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", wordBreak: 'break-word' as const }
const container = { padding: '0', width: '100%', maxWidth: '560px', margin: '0 auto', overflow: 'hidden' as const }
const logoBanner = { backgroundColor: 'hsl(161, 93%, 30%)', padding: '20px 25px', borderRadius: '8px 8px 0 0', display: 'flex' as const, alignItems: 'center' as const, gap: '12px' }
const logoImg = { borderRadius: '8px' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0', letterSpacing: '-0.5px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '24px 25px 12px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 25px 16px' }
const featureBox = { margin: '0 25px 12px', padding: '14px 18px', backgroundColor: '#f8faf9', borderRadius: '8px', border: '1px solid #e5ebe8' }
const featureItem = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0' }
const ctaSection = { textAlign: 'center' as const, margin: '8px 25px 24px' }
const ctaButton = { backgroundColor: 'hsl(161, 93%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '6px', fontSize: '14px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e5e5', margin: '20px 25px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 25px 30px' }
