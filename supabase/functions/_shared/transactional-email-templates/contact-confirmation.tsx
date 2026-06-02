import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Kiruvo"
const LOGO_URL = "https://dpbbylcycltexyknejcb.supabase.co/storage/v1/object/public/email-assets/kiruvo-logo.png"

interface ContactConfirmationProps {
  name?: string
  subject?: string
  message?: string
}

const ContactConfirmationEmail = ({ name, subject, message }: ContactConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We received your message — we'll get back to you soon!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Img src={LOGO_URL} alt="Kiruvo" width="44" height="44" style={logoImg} />
          <Text style={logoText}>Kiruvo</Text>
        </Section>
        <Heading style={h1}>
          {name ? `Thanks, ${name}! ✉️` : 'Message Received ✉️'}
        </Heading>
        <Text style={text}>
          We've received your message and our team will review it shortly. 
          You can expect a response within 1-2 business days.
        </Text>
        {(subject || message) && (
          <Section style={messageCard}>
            <Text style={cardTitle}>Your message:</Text>
            {subject && <Text style={messageSubject}>{subject}</Text>}
            {message && <Text style={messageBody}>{message}</Text>}
          </Section>
        )}
        <Text style={text}>
          In the meantime, feel free to explore our platform or reach out if you have
          any urgent questions.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactConfirmationEmail,
  subject: 'We received your message!',
  displayName: 'Contact form confirmation',
  previewData: {
    name: 'Jessica',
    subject: 'Integration question',
    message: 'Hi, I was wondering if Kiruvo integrates with our existing CRM system?',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", wordBreak: 'break-word' as const }
const container = { padding: '0', width: '100%', maxWidth: '560px', margin: '0 auto', overflow: 'hidden' as const }
const logoBanner = { backgroundColor: 'hsl(161, 93%, 30%)', padding: '20px 25px', borderRadius: '8px 8px 0 0', display: 'flex' as const, alignItems: 'center' as const, gap: '12px' }
const logoImg = { borderRadius: '8px' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0', letterSpacing: '-0.5px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '24px 25px 12px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 25px 16px' }
const messageCard = { margin: '8px 25px 20px', padding: '16px 20px', backgroundColor: '#f8faf9', borderRadius: '8px', border: '1px solid #e5ebe8' }
const cardTitle = { fontSize: '11px', color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 8px', fontWeight: '600' as const }
const messageSubject = { fontSize: '15px', fontWeight: '600' as const, color: '#0d0d0d', margin: '0 0 6px' }
const messageBody = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0', fontStyle: 'italic' as const }
const hr = { borderColor: '#e5e5e5', margin: '20px 25px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 25px 30px' }
