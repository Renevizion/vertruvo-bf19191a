import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Kiruvo"

interface CustomerWelcomeProps {
  first_name?: string
  temp_password?: string
  login_email?: string
  login_url?: string
  business_name?: string
}

const CustomerWelcomeEmail = ({ first_name, temp_password, login_email, login_url, business_name }: CustomerWelcomeProps) => {
  const brandName = business_name || SITE_NAME
  const actionUrl = login_url || 'https://kiruvo.com/portal'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your login details for {brandName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoBanner}>
            <Text style={logoText}>{brandName}</Text>
          </Section>
          <Heading style={h1}>
            {first_name ? `Welcome, ${first_name}!` : 'Your account is ready!'}
          </Heading>
          <Text style={text}>
            {business_name
              ? `${business_name} has created an account for you.`
              : 'An account has been created for you.'
            }
            {' '}Use the credentials below to sign in to your client portal.
          </Text>

          <Section style={credentialsBox}>
            <Text style={credLabel}>Login Email</Text>
            <Text style={credValue}>{login_email || '—'}</Text>
            <Text style={credLabel}>Temporary Password</Text>
            <Text style={credValue}>{temp_password || '—'}</Text>
          </Section>

          <Text style={hintText}>
            Please change your password after your first login for security.
          </Text>

          <Section style={ctaSection}>
            <Button style={ctaButton} href={actionUrl}>
              Sign In to Your Portal →
            </Button>
          </Section>

          <Text style={hintText}>
            If you have trouble signing in, contact {brandName} and they can reset your password.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>— {brandName}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CustomerWelcomeEmail,
  subject: 'Your login details',
  displayName: 'Customer welcome — account credentials',
  previewData: {
    first_name: 'Alex',
    temp_password: 'Abc123!@#xyz',
    login_email: 'alex@example.com',
    login_url: 'https://kiruvo.com/portal/login/elite-barbers',
    business_name: 'Elite Barbers',
  },
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
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0', letterSpacing: '-0.5px', padding: '0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '24px 25px 12px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 25px 16px' }
const hintText = { fontSize: '12px', color: '#999', lineHeight: '1.5', margin: '0 25px 16px', fontStyle: 'italic' as const }
const credentialsBox = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e5e5e5',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '8px 25px 16px',
}
const credLabel = { fontSize: '11px', color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 2px', fontWeight: '600' as const }
const credValue = { fontSize: '16px', color: '#0d0d0d', fontFamily: 'monospace', margin: '0 0 12px', fontWeight: 'bold' as const }
const ctaSection = { textAlign: 'center' as const, margin: '8px 25px 24px' }
const ctaButton = { backgroundColor: 'hsl(161, 93%, 30%)', color: '#ffffff', padding: '14px 32px', borderRadius: '6px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e5e5', margin: '20px 25px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 25px 30px' }
