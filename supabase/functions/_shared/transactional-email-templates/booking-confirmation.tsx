import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Kiruvo"
const LOGO_URL = "https://dpbbylcycltexyknejcb.supabase.co/storage/v1/object/public/email-assets/kiruvo-logo.png"

interface BookingConfirmationProps {
  clientName?: string
  serviceName?: string
  date?: string
  time?: string
  staffName?: string
  notes?: string
}

const BookingConfirmationEmail = ({ clientName, serviceName, date, time, staffName, notes }: BookingConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your booking is confirmed — {serviceName || 'Appointment'} on {date || 'upcoming date'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Img src={LOGO_URL} alt="Kiruvo" width="44" height="44" style={logoImg} />
          <Text style={logoText}>Kiruvo</Text>
        </Section>
        <Heading style={h1}>📅 Booking Confirmed</Heading>
        <Text style={text}>
          {clientName ? `Hi ${clientName}, your` : 'Your'} booking has been confirmed. Here are the details:
        </Text>
        <Section style={detailsCard}>
          <Text style={detailLabel}>Service</Text>
          <Text style={detailValue}>{serviceName || 'General Appointment'}</Text>
          <Text style={detailLabel}>Date</Text>
          <Text style={detailValue}>{date || 'TBD'}</Text>
          <Text style={detailLabel}>Time</Text>
          <Text style={detailValue}>{time || 'TBD'}</Text>
          {staffName && (
            <>
              <Text style={detailLabel}>With</Text>
              <Text style={detailValue}>{staffName}</Text>
            </>
          )}
          {notes && (
            <>
              <Text style={detailLabel}>Notes</Text>
              <Text style={detailValue}>{notes}</Text>
            </>
          )}
        </Section>
        <Text style={text}>
          Need to reschedule or cancel? Please contact us as soon as possible.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingConfirmationEmail,
  subject: (data: Record<string, any>) => `Booking Confirmed — ${data.serviceName || 'Your Appointment'}`,
  displayName: 'Booking confirmation',
  previewData: {
    clientName: 'Sarah',
    serviceName: 'Business Consultation',
    date: 'March 28, 2026',
    time: '2:00 PM EST',
    staffName: 'Michael Torres',
    notes: 'Please bring any relevant documents.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", wordBreak: 'break-word' as const }
const container = { padding: '0', width: '100%', maxWidth: '560px', margin: '0 auto', overflow: 'hidden' as const }
const logoBanner = { backgroundColor: 'hsl(161, 93%, 30%)', padding: '20px 25px', borderRadius: '8px 8px 0 0', display: 'flex' as const, alignItems: 'center' as const, gap: '12px' }
const logoImg = { borderRadius: '8px' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0', letterSpacing: '-0.5px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '24px 25px 12px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 25px 16px' }
const detailsCard = { margin: '8px 25px 20px', padding: '16px 20px', backgroundColor: '#f8faf9', borderRadius: '8px', border: '1px solid #e5ebe8' }
const detailLabel = { fontSize: '11px', color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 2px', fontWeight: '600' as const }
const detailValue = { fontSize: '14px', color: '#0d0d0d', margin: '0 0 12px', fontFamily: "'Inconsolata', monospace" }
const hr = { borderColor: '#e5e5e5', margin: '20px 25px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 25px 30px' }
